from dataclasses import dataclass
from datetime import datetime, timezone
import os
from threading import RLock

import MetaTrader5 as mt5
from starlette import status

from config import MAGIC_NUMBER
from server.app.core.settings import settings
from server.app.schemas.account import AccountOverviewResponse
from server.app.schemas.auth import (
    AuthLoginRequest,
    AuthLoginResponse,
    AuthLogoutResponse,
    AuthSessionResponse,
)
from server.app.schemas.trades import OpenTradeItem, OpenTradesResponse
from trading.account import get_account_info


class MT5SessionError(RuntimeError):
    """Raised when an authenticated MT5 session is required."""


class MT5ApiError(RuntimeError):
    """Raised when an MT5 API request fails with a specific HTTP status."""

    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass
class SessionState:
    authenticated: bool = False
    account_number: int | None = None
    server: str | None = None
    connected_at: datetime | None = None
    terminal_path: str | None = None
    last_error_code: int | None = None
    last_error_message: str | None = None


class MT5SessionService:
    def __init__(self) -> None:
        self._lock = RLock()
        self._state = SessionState()

    def login(self, payload: AuthLoginRequest) -> AuthLoginResponse:
        with self._lock:
            self._shutdown_safely()

            password = payload.password.get_secret_value()
            init_kwargs = self._build_initialize_kwargs(payload, password)
            initialized = False

            try:
                initialized = mt5.initialize(**init_kwargs)
            except Exception as exc:
                self._set_last_error_exception(exc)
                self._clear_auth_state(keep_last_error=True)
                raise MT5ApiError(
                    "MT5 initialization timed out or failed before the terminal became ready.",
                    status.HTTP_504_GATEWAY_TIMEOUT,
                ) from exc

            if not initialized and "path" in init_kwargs:
                fallback_kwargs = dict(init_kwargs)
                fallback_kwargs.pop("path", None)

                try:
                    initialized = mt5.initialize(**fallback_kwargs)
                except Exception as exc:
                    self._set_last_error_exception(exc)
                    self._clear_auth_state(keep_last_error=True)
                    raise MT5ApiError(
                        "MT5 initialization timed out or failed before the terminal became ready.",
                        status.HTTP_504_GATEWAY_TIMEOUT,
                    ) from exc

            if not initialized:
                self._set_last_error_from_mt5()
                self._clear_auth_state(keep_last_error=True)
                raise MT5ApiError(
                    (
                        "MT5 initialization failed. Confirm the terminal is "
                        "installed on the server and the configured terminal path is correct."
                    ),
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            try:
                logged_in = mt5.login(
                    payload.account_number,
                    server=payload.server,
                    password=password,
                    timeout=settings.mt5_timeout_ms,
                )
            except Exception as exc:
                self._set_last_error_exception(exc)
                self._shutdown_safely()
                self._clear_auth_state(keep_last_error=True)
                raise MT5ApiError(
                    "MT5 login timed out before the trading account could be opened.",
                    status.HTTP_504_GATEWAY_TIMEOUT,
                ) from exc

            if not logged_in:
                self._set_last_error_from_mt5()
                self._shutdown_safely()
                self._clear_auth_state(keep_last_error=True)
                raise MT5ApiError(
                    "MT5 login failed. Check the account number, password, and server.",
                    status.HTTP_401_UNAUTHORIZED,
                )

            account = self._current_account_info()

            if account is None:
                self._set_last_error_from_mt5()
                self._shutdown_safely()
                self._clear_auth_state(keep_last_error=True)
                raise MT5ApiError(
                    (
                        "MT5 connected, but account details could not be loaded "
                        "from the terminal session."
                    ),
                    status.HTTP_502_BAD_GATEWAY,
                )

            self._state.authenticated = True
            self._state.account_number = int(account.login)
            self._state.server = str(account.server)
            self._state.connected_at = datetime.now(timezone.utc)
            self._state.terminal_path = init_kwargs.get("path")
            self._state.last_error_code = None
            self._state.last_error_message = None

            return AuthLoginResponse(
                message="MT5 login successful.",
                session=self._build_session_response(True),
                account=self._build_account_overview(account),
            )

    def logout(self) -> AuthLogoutResponse:
        with self._lock:
            self._shutdown_safely()
            self._clear_auth_state(keep_last_error=False)
            return AuthLogoutResponse(
                message="MT5 session disconnected.",
                session=self._build_session_response(False),
            )

    def get_session_snapshot(self) -> AuthSessionResponse:
        with self._lock:
            terminal_connected = self._current_account_info() is not None
            authenticated = self._state.authenticated and terminal_connected
            return self._build_session_response(authenticated, terminal_connected)

    def get_account_overview(self) -> AccountOverviewResponse:
        with self._lock:
            account = self._require_raw_account_info()
            return self._build_account_overview(account)

    def get_open_trades(self) -> OpenTradesResponse:
        with self._lock:
            account = self._require_raw_account_info()
            positions = mt5.positions_get()

            if positions is None:
                self._set_last_error_from_mt5()
                raise MT5SessionError(
                    "Unable to read open trades from the MT5 session."
                )

            trades = [
                self._serialize_position(position)
                for position in positions
            ]

            return OpenTradesResponse(
                count=len(trades),
                account=self._build_account_overview(account),
                trades=trades,
            )

    def _build_initialize_kwargs(
        self,
        payload: AuthLoginRequest,
        password: str,
    ) -> dict[str, object]:
        kwargs: dict[str, object] = {
            "login": payload.account_number,
            "password": password,
            "server": payload.server,
            "timeout": settings.mt5_timeout_ms,
        }
        configured_path = settings.mt5_terminal_path.strip()

        if configured_path and os.path.exists(configured_path):
            kwargs["path"] = configured_path

        return kwargs

    def _build_session_response(
        self,
        authenticated: bool,
        terminal_connected: bool | None = None,
    ) -> AuthSessionResponse:
        if terminal_connected is None:
            terminal_connected = self._current_account_info() is not None

        return AuthSessionResponse(
            authenticated=authenticated,
            account_number=self._state.account_number,
            server=self._state.server,
            connected_at=self._to_iso(self._state.connected_at),
            terminal_path=self._state.terminal_path,
            terminal_connected=terminal_connected,
            last_error_code=self._state.last_error_code,
            last_error_message=self._state.last_error_message,
        )

    def _build_account_overview(self, account: object) -> AccountOverviewResponse:
        shared_summary = get_account_info()

        if shared_summary is None:
            raise MT5SessionError(
                "Unable to read account overview from the shared trading module."
            )

        return AccountOverviewResponse(
            login=int(shared_summary["login"]),
            server=str(shared_summary["server"]),
            balance=float(shared_summary["balance"]),
            equity=float(shared_summary["equity"]),
            profit=float(shared_summary["profit"]),
            margin=float(shared_summary["margin"]),
            free_margin=float(shared_summary["free_margin"]),
            currency=self._clean_string(getattr(account, "currency", None)),
            leverage=self._safe_int(getattr(account, "leverage", None)),
            margin_level=self._safe_float(getattr(account, "margin_level", None)),
            name=self._clean_string(getattr(account, "name", None)),
            company=self._clean_string(getattr(account, "company", None)),
        )

    def _require_raw_account_info(self) -> object:
        account = self._current_account_info()

        if account is None:
            self._clear_auth_state(keep_last_error=True)
            raise MT5SessionError(
                "No active MT5 session. Login first from the mobile app or API client."
            )

        return account

    def _current_account_info(self) -> object | None:
        return mt5.account_info()

    def _set_last_error_from_mt5(self) -> None:
        code, message = mt5.last_error()
        self._state.last_error_code = code
        self._state.last_error_message = message

    def _set_last_error_exception(self, exc: Exception) -> None:
        self._state.last_error_code = None
        self._state.last_error_message = str(exc)

    def _clear_auth_state(self, keep_last_error: bool) -> None:
        last_error_code = self._state.last_error_code if keep_last_error else None
        last_error_message = self._state.last_error_message if keep_last_error else None
        self._state = SessionState(
            last_error_code=last_error_code,
            last_error_message=last_error_message,
        )

    def _shutdown_safely(self) -> None:
        try:
            mt5.shutdown()
        except Exception:
            return

    def _serialize_position(self, position: object) -> OpenTradeItem:
        return OpenTradeItem(
            ticket=int(getattr(position, "ticket", 0)),
            symbol=str(getattr(position, "symbol", "")),
            side=self._position_side(getattr(position, "type", None)),
            volume=float(getattr(position, "volume", 0.0) or 0.0),
            price_open=float(getattr(position, "price_open", 0.0) or 0.0),
            price_current=self._safe_float(getattr(position, "price_current", None)),
            stop_loss=self._safe_float(getattr(position, "sl", None)),
            take_profit=self._safe_float(getattr(position, "tp", None)),
            profit=self._safe_float(getattr(position, "profit", None)),
            swap=self._safe_float(getattr(position, "swap", None)),
            magic=self._safe_int(getattr(position, "magic", None)),
            comment=self._clean_string(getattr(position, "comment", None)),
            opened_at=self._timestamp_to_iso(getattr(position, "time", None)),
            is_bot_trade=self._is_bot_trade(position),
        )

    def _position_side(self, value: object) -> str:
        if value == mt5.POSITION_TYPE_BUY:
            return "BUY"
        if value == mt5.POSITION_TYPE_SELL:
            return "SELL"
        return "UNKNOWN"

    def _is_bot_trade(self, position: object) -> bool:
        comment = str(getattr(position, "comment", "") or "").upper()
        return (
            getattr(position, "magic", None) == MAGIC_NUMBER
            or comment.startswith("BURRFX")
        )

    def _timestamp_to_iso(self, timestamp: object) -> str | None:
        if timestamp is None:
            return None

        try:
            value = float(timestamp)
        except (TypeError, ValueError):
            return None

        if value <= 0:
            return None

        return datetime.fromtimestamp(
            value,
            tz=timezone.utc,
        ).isoformat()

    def _to_iso(self, value: datetime | None) -> str | None:
        if value is None:
            return None

        return value.isoformat()

    def _safe_float(self, value: object) -> float | None:
        if value is None:
            return None

        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _safe_int(self, value: object) -> int | None:
        if value is None:
            return None

        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _clean_string(self, value: object) -> str | None:
        if value is None:
            return None

        text = str(value).strip()
        return text or None


mt5_service = MT5SessionService()
