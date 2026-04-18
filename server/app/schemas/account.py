from pydantic import BaseModel


class AccountOverviewResponse(BaseModel):
    login: int
    server: str
    balance: float
    equity: float
    profit: float
    margin: float
    free_margin: float
    currency: str | None = None
    leverage: int | None = None
    margin_level: float | None = None
    name: str | None = None
    company: str | None = None
