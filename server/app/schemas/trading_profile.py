from pydantic import BaseModel


class TradingProfileResponse(BaseModel):
    id: str
    label: str
    description: str
    lot_mode: str
    risk_percent: float
    max_spread_points: int
    use_take_profit: bool
    use_break_even: bool
    use_trailing_stop: bool
    safe_floating_profit_percent: float
    max_positions_per_symbol: int
    addon_spacing_atr: float
