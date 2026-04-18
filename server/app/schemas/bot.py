from pydantic import BaseModel, Field

from server.app.schemas.auth import AuthSessionResponse


class BotStatusResponse(BaseModel):
    state: str
    running: bool
    stop_requested: bool
    thread_alive: bool
    started_at: str | None = None
    stopped_at: str | None = None
    last_update_at: str | None = None
    phase: str | None = None
    detail: str | None = None
    current_symbol: str | None = None
    active_symbols: list[str] = Field(default_factory=list)
    session_label: str | None = None
    countdown_seconds: int | None = None
    daily_profit: float | None = None
    account_number: int | None = None
    server: str | None = None
    last_error: str | None = None
    session: AuthSessionResponse


class BotControlResponse(BaseModel):
    message: str
    status: BotStatusResponse
