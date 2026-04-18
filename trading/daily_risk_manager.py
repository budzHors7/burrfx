import MetaTrader5 as mt5

from datetime import datetime

from config import (
    DAILY_TARGET,
    MAX_DAILY_LOSS,
    ENABLE_DAILY_LOCK
)
from trading.debug_logger import log_event, log_mt5_error


# =========================
# Track Current Day
# =========================

current_day = None

daily_profit = 0

trading_locked = False
last_logged_daily_profit = None


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

        profit += d.profit

    daily_profit = profit

    if daily_profit != last_logged_daily_profit:
        log_event(
            "daily_profit_updated",
            daily_profit=daily_profit,
            deal_count=len(deals)
        )
        last_logged_daily_profit = daily_profit


def check_daily_limits():

    global trading_locked

    if not ENABLE_DAILY_LOCK:
        return False

    if daily_profit >= DAILY_TARGET:

        trading_locked = True

        print("Daily target reached.")
        log_event(
            "daily_limit_reached",
            limit_type="target",
            daily_profit=daily_profit,
            daily_target=DAILY_TARGET
        )

        return True

    if daily_profit <= MAX_DAILY_LOSS:

        trading_locked = True

        print("Daily loss limit reached.")
        log_event(
            "daily_limit_reached",
            limit_type="loss",
            daily_profit=daily_profit,
            max_daily_loss=MAX_DAILY_LOSS
        )

        return True

    return False


def is_trading_locked():

    return trading_locked


def get_daily_profit():

    return daily_profit
