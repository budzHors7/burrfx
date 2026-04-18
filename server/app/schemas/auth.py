from pydantic import BaseModel, Field, SecretStr

from server.app.schemas.account import AccountOverviewResponse


class AuthLoginRequest(BaseModel):
    account_number: int = Field(..., gt=0)
    password: SecretStr = Field(..., min_length=1)
    server: str = Field(..., min_length=1)


class AuthSessionResponse(BaseModel):
    authenticated: bool
    account_number: int | None = None
    server: str | None = None
    connected_at: str | None = None
    terminal_path: str | None = None
    terminal_connected: bool
    last_error_code: int | None = None
    last_error_message: str | None = None


class AuthLoginResponse(BaseModel):
    message: str
    session: AuthSessionResponse
    account: AccountOverviewResponse


class AuthLogoutResponse(BaseModel):
    message: str
    session: AuthSessionResponse
