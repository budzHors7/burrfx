import MetaTrader5 as mt5

from datetime import datetime

from config import (
    DAILY_TARGET,
    ENABLE_DAILY_LOCK,
    MAX_DAILY_LOSS,
)
from trading.broker_runtime import get_active_broker
from trading.broker_settings import get_broker_daily_limits
from trading.debug_logger import log_event, log_mt5_error


# =========================
# Track Current Day
# =========================

current_day = None

daily_profit = 0

trading_locked = False
last_logged_daily_profit = None

TRADE_DEAL_TYPES = {
    mt5.DEAL_TYPE_BUY,
    mt5.DEAL_TYPE_SELL
}


def reset_daily_if_needed():

    global current_day
    global daily_profit
    global trading_locked
    global last_logged_daily_profit

    today = datetime.now().date()

    if current_day != today:

        current_day = today

        daily_profit = 0

        trading_locked = False
        last_logged_daily_profit = None

        print("New trading day started.")
        log_event(
            "daily_state_reset",
            current_day=str(current_day)
        )


def update_daily_profit():

    global daily_profit
    global last_logged_daily_profit

    deals = mt5.history_deals_get(
        datetime.now().replace(
            hour=0,
            minute=0,
            second=0
        ),
        datetime.now()
    )

    if deals is None:
        log_mt5_error("daily_profit_history_unavailable")
        return

    profit = 0

    for d in deals:

        if not _is_trade_deal(d):
            continue

        profit += _deal_amount(d)

    daily_profit = profit

    if daily_profit != last_logged_daily_profit:
        log_event(
            "daily_profit_updated",
            daily_profit=daily_profit,
            deal_count=len(deals),
            trade_deal_count=len([
                d
                for d in deals
                if _is_trade_deal(d)
            ])
        )
        last_logged_daily_profit = daily_profit


def check_daily_limits():

    global trading_locked

    daily_limits = get_daily_limits()

    if (
        not ENABLE_DAILY_LOCK
        or not daily_limits["enabled"]
    ):
        return False

    daily_target = daily_limits["target"]
    max_daily_loss = daily_limits["max_loss"]

    if daily_profit >= daily_target:

        trading_locked = True

        print("Daily target reached.")
        log_event(
            "daily_limit_reached",
            limit_type="target",
            daily_profit=daily_profit,
            daily_target=daily_target
        )

        return True

    if daily_profit <= max_daily_loss:

        trading_locked = True

        print("Daily loss limit reached.")
        log_event(
            "daily_limit_reached",
            limit_type="loss",
            daily_profit=daily_profit,
            max_daily_loss=max_daily_loss
        )

        return True

    return False


def is_trading_locked():

    return trading_locked


def get_daily_profit():

    return daily_profit


def get_daily_limits():

    broker = get_active_broker()

    if broker is not None:
        return get_broker_daily_limits(
            broker
        )

    return {
        "enabled": bool(ENABLE_DAILY_LOCK),
        "target": float(DAILY_TARGET),
        "max_loss": float(MAX_DAILY_LOSS)
    }


def _is_trade_deal(deal):

    return getattr(deal, "type", None) in TRADE_DEAL_TYPES


def _deal_amount(deal):

    return sum(
        _numeric_deal_value(deal, field)
        for field in (
            "profit",
            "commission",
            "swap",
            "fee"
        )
    )


def _numeric_deal_value(deal, field):

    value = getattr(deal, field, 0.0) or 0.0

    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0
