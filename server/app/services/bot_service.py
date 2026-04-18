from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Event, RLock, Thread

from starlette import status

from server.app.schemas.bot import BotControlResponse, BotStatusResponse
from server.app.services.mt5_service import mt5_service
from trading import live_trader


class BotServiceError(RuntimeError):
    """Raised when the bot controller cannot complete a request."""

    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass
class BotRuntimeState:
    state: str = "stopped"
    stop_requested: bool = False
    started_at: datetime | None = None
    stopped_at: datetime | None = None
    last_update_at: datetime | None = None
    phase: str | None = None
    detail: str | None = None
    current_symbol: str | None = None
    active_symbols: list[str] = field(default_factory=list)
    session_label: str | None = None
    countdown_seconds: int | None = None
    daily_profit: float | None = None
    account_number: int | None = None
    server: str | None = None
    last_error: str | None = None


class BotRuntimeService:
    def __init__(self) -> None:
        self._lock = RLock()
        self._thread: Thread | None = None
        self._stop_event: Event | None = None
        self._state = BotRuntimeState()

    def get_status(self) -> BotStatusResponse:
        with self._lock:
            return self._build_status_response()

    def has_active_runtime(self) -> bool:
        with self._lock:
            return self._thread_is_alive()

    def start(self) -> BotControlResponse:
        with self._lock:
            if self._thread_is_alive():
                raise BotServiceError(
                    "The trading bot is already running.",
                    status.HTTP_409_CONFLICT,
                )

            session = mt5_service.get_session_snapshot()

            if not session.authenticated:
                raise BotServiceError(
                    "Login to MT5 before starting the trading bot.",
                    status.HTTP_401_UNAUTHORIZED,
                )

            now = datetime.now(timezone.utc)
            self._stop_event = Event()
            self._state = BotRuntimeState(
                state="starting",
                stop_requested=False,
                started_at=now,
                last_update_at=now,
                phase="starting",
                detail="Launching trading runtime.",
                account_number=session.account_number,
                server=session.server,
            )
            self._thread = Thread(
                target=self._run_trading_bot,
                name="BurrFxTradingBot",
                daemon=True,
            )
            self._thread.start()

            return BotControlResponse(
                message="Trading bot start requested.",
                status=self._build_status_response(session=session),
            )

    def stop(self) -> BotControlResponse:
        with self._lock:
            session = mt5_service.get_session_snapshot()

            if not self._thread_is_alive():
                now = datetime.now(timezone.utc)
                if self._state.state in {
                    "starting",
                    "running",
                    "stopping",
                }:
                    self._state.state = "stopped"
                    self._state.stopped_at = now
                    self._state.last_update_at = now
                self._state.stop_requested = False
                self._thread = None
                self._stop_event = None
                return BotControlResponse(
                    message="Trading bot is already stopped.",
                    status=self._build_status_response(session=session),
                )

            self._state.state = "stopping"
            self._state.stop_requested = True
            self._state.phase = "stopping"
            self._state.detail = (
                "Stop requested. Waiting for the trading loop to exit cleanly."
            )
            self._state.last_update_at = datetime.now(timezone.utc)

            if self._stop_event is not None:
                self._stop_event.set()

            return BotControlResponse(
                message="Trading bot stop requested.",
                status=self._build_status_response(session=session),
            )

    def _run_trading_bot(self) -> None:
        result: dict[str, object] | None = None

        try:
            result = live_trader.start_live_trading(
                interactive=False,
                initialize_mt5=False,
                shutdown_mt5=False,
                stop_event=self._stop_event,
                status_callback=self._handle_runtime_status,
            )
        except Exception as exc:
            with self._lock:
                now = datetime.now(timezone.utc)
                self._state.state = "error"
                self._state.stop_requested = False
                self._state.stopped_at = now
                self._state.last_update_at = now
                self._state.phase = "error"
                self._state.detail = "Trading runtime crashed."
                self._state.last_error = str(exc)
        else:
            with self._lock:
                now = datetime.now(timezone.utc)
                self._state.stop_requested = False
                self._state.stopped_at = now
                self._state.last_update_at = now

                if isinstance(result, dict):
                    runtime_status = str(result.get("status", "stopped"))
                    runtime_reason = self._clean_string(result.get("reason"))
                    runtime_message = self._clean_string(result.get("message"))
                else:
                    runtime_status = "stopped"
                    runtime_reason = "stopped"
                    runtime_message = "Trading bot stopped."

                if runtime_status == "error":
                    self._state.state = "error"
                    self._state.phase = runtime_reason or "error"
                    self._state.detail = runtime_message or "Trading bot stopped with an error."
                    self._state.last_error = self._state.detail
                else:
                    self._state.state = "stopped"
                    self._state.phase = runtime_reason or "stopped"
                    self._state.detail = runtime_message or "Trading bot stopped."
                    self._state.last_error = None
                    self._state.countdown_seconds = None
                    self._state.current_symbol = None
        finally:
            with self._lock:
                self._thread = None
                self._stop_event = None

    def _handle_runtime_status(
        self,
        payload: dict[str, object],
    ) -> None:
        with self._lock:
            now = datetime.now(timezone.utc)
            self._state.state = (
                "stopping"
                if self._state.stop_requested
                else "running"
            )
            self._state.last_update_at = now
            self._state.phase = self._clean_string(
                payload.get("phase")
            ) or self._state.phase
            self._state.detail = self._clean_string(
                payload.get("detail")
            ) or self._state.detail
            self._state.current_symbol = self._clean_string(
                payload.get("current_symbol")
            )
            self._state.session_label = self._clean_string(
                payload.get("session_label")
            )
            self._state.countdown_seconds = self._safe_int(
                payload.get("countdown_seconds")
            )
            self._state.daily_profit = self._safe_float(
                payload.get("daily_profit")
            )

            account_number = self._safe_int(
                payload.get("account_number")
            )
            if account_number is not None:
                self._state.account_number = account_number

            server = self._clean_string(payload.get("server"))
            if server is not None:
                self._state.server = server

            active_symbols = payload.get("active_symbols")
            if isinstance(active_symbols, list):
                self._state.active_symbols = [
                    str(symbol)
                    for symbol in active_symbols
                    if symbol is not None
                ]
            else:
                self._state.active_symbols = []

    def _build_status_response(
        self,
        session=None,
    ) -> BotStatusResponse:
        if session is None:
            session = mt5_service.get_session_snapshot()

        thread_alive = self._thread_is_alive()
        running = (
            self._state.state in {
                "starting",
                "running",
                "stopping",
            }
            and thread_alive
        )

        return BotStatusResponse(
            state=self._state.state,
            running=running,
            stop_requested=self._state.stop_requested,
            thread_alive=thread_alive,
            started_at=self._to_iso(self._state.started_at),
            stopped_at=self._to_iso(self._state.stopped_at),
            last_update_at=self._to_iso(self._state.last_update_at),
            phase=self._state.phase,
            detail=self._state.detail,
            current_symbol=self._state.current_symbol,
            active_symbols=list(self._state.active_symbols),
            session_label=self._state.session_label,
            countdown_seconds=self._state.countdown_seconds,
            daily_profit=self._state.daily_profit,
            account_number=self._state.account_number,
            server=self._state.server,
            last_error=self._state.last_error,
            session=session,
        )

    def _thread_is_alive(self) -> bool:
        return (
            self._thread is not None
            and self._thread.is_alive()
        )

    def _to_iso(
        self,
        value: datetime | None,
    ) -> str | None:
        if value is None:
            return None

        return value.isoformat()

    def _safe_int(
        self,
        value: object,
    ) -> int | None:
        if value is None:
            return None

        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _safe_float(
        self,
        value: object,
    ) -> float | None:
        if value is None:
            return None

        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _clean_string(
        self,
        value: object,
    ) -> str | None:
        if value is None:
            return None

        text = str(value).strip()
        return text or None


bot_service = BotRuntimeService()
