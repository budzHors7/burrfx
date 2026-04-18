import MetaTrader5 as mt5
import time
from datetime import datetime

from utils import clear_screen
from logo import show_logo
from trading.debug_logger import log_event, log_mt5_error


TIMEFRAME_LABELS = {
    mt5.TIMEFRAME_M1: "M1",
    mt5.TIMEFRAME_M5: "M5",
    mt5.TIMEFRAME_M15: "M15",
    mt5.TIMEFRAME_M30: "M30",
    mt5.TIMEFRAME_H1: "H1",
    mt5.TIMEFRAME_H4: "H4",
    mt5.TIMEFRAME_D1: "D1"
}

TIMEFRAME_SECONDS = {
    "M1": 60,
    "M5": 5 * 60,
    "M15": 15 * 60,
    "M30": 30 * 60,
    "H1": 60 * 60,
    "H4": 4 * 60 * 60,
    "D1": 24 * 60 * 60
}

DEFAULT_TIMEFRAME = mt5.TIMEFRAME_M15


def get_timeframe_label(timeframe):

    return TIMEFRAME_LABELS.get(
        timeframe,
        "M15"
    )


def get_last_candle_time(
    symbol,
    timeframe=DEFAULT_TIMEFRAME
):

    rates = mt5.copy_rates_from_pos(
        symbol,
        timeframe,
        1,
        1
    )

    if rates is None or len(rates) == 0:
        if rates is None:
            log_mt5_error(
                "last_candle_unavailable",
                symbol=symbol
            )
        else:
            log_event(
                "last_candle_empty",
                level="warning",
                symbol=symbol
            )
        return None

    return rates[0]['time']


def seconds_to_next_candle(timeframe_label):

    interval_seconds = TIMEFRAME_SECONDS.get(
        timeframe_label,
        TIMEFRAME_SECONDS["M15"]
    )
    now = datetime.now()
    current_ts = int(now.timestamp())
    next_ts = (
        (current_ts // interval_seconds) + 1
    ) * interval_seconds
    remaining = max(next_ts - current_ts, 0)

    return remaining


def wait_for_new_candle(
    symbol,
    timeframe=DEFAULT_TIMEFRAME,
    timeframe_label=None,
    render_callback=None,
    interrupt_condition=None
):

    timeframe_label = (
        timeframe_label
        or get_timeframe_label(timeframe)
    )
    last_time = get_last_candle_time(
        symbol,
        timeframe=timeframe
    )

    log_event(
        "wait_for_new_candle_started",
        symbol=symbol,
        timeframe=timeframe_label,
        last_candle_time=last_time
    )

    while True:

        if (
            interrupt_condition is not None
            and interrupt_condition()
        ):
            log_event(
                "wait_for_new_candle_interrupted",
                symbol=symbol
            )
            return None

        remaining = seconds_to_next_candle(
            timeframe_label
        )

        if render_callback is None:

            clear_screen()
            show_logo()

            minutes = remaining // 60
            seconds = remaining % 60

            header = (
                f"WAITING FOR NEW "
                f"{timeframe_label} CANDLE"
            )

            print(header)
            print("=" * len(header) + "\n")

            print(
                f"Next candle in: "
                f"{minutes:02d}:{seconds:02d}"
            )

        else:
            render_callback(remaining)

        time.sleep(1)

        if (
            interrupt_condition is not None
            and interrupt_condition()
        ):
            log_event(
                "wait_for_new_candle_interrupted",
                symbol=symbol
            )
            return None

        new_time = get_last_candle_time(
            symbol,
            timeframe=timeframe
        )

        if new_time is None:
            continue

        if new_time != last_time:

            log_event(
                "new_candle_detected",
                symbol=symbol,
                timeframe=timeframe_label,
                previous_candle_time=last_time,
                new_candle_time=new_time
            )
            return new_time
