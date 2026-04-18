from pydantic import BaseModel

from server.app.schemas.account import AccountOverviewResponse


class OpenTradeItem(BaseModel):
    ticket: int
    symbol: str
    side: str
    volume: float
    price_open: float
    price_current: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    profit: float | None = None
    swap: float | None = None
    magic: int | None = None
    comment: str | None = None
    opened_at: str | None = None
    is_bot_trade: bool


class OpenTradesResponse(BaseModel):
    count: int
    account: AccountOverviewResponse
    trades: list[OpenTradeItem]
