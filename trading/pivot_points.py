import MetaTrader5 as mt5
import pandas as pd

from trading.debug_logger import log_event, log_mt5_error


def get_daily_pivots(symbol):
    """
    Calculate pivot points from
    previous daily candle
    """

    rates = mt5.copy_rates_from_pos(
        symbol,
        mt5.TIMEFRAME_D1,
        1,   # previous day
        1
    )

    if rates is None:
        log_mt5_error(
            "pivot_rates_unavailable",
            symbol=symbol
        )
        return None

    if len(rates) == 0:
        log_event(
            "pivot_rates_empty",
            level="warning",
            symbol=symbol
        )
        return None

    df = pd.DataFrame(rates)

    high = df["high"].iloc[0]
    low = df["low"].iloc[0]
    close = df["close"].iloc[0]

    # =====================
    # PIVOT CALCULATION
    # =====================

    pp = (high + low + close) / 3

    r1 = (2 * pp) - low
    s1 = (2 * pp) - high

    r2 = pp + (high - low)
    s2 = pp - (high - low)

    pivots = {
        "PP": pp,
        "R1": r1,
        "R2": r2,
        "S1": s1,
        "S2": s2
    }

    log_event(
        "pivot_points_calculated",
        symbol=symbol,
        pivots=pivots
    )

    return pivots
