import MetaTrader5 as mt5

from datetime import datetime

from config import (
    SYMBOLS,
    MAX_SPREAD_POINTS,
    ENABLE_SESSION_FILTER,
    LONDON_SESSION,
    NEWYORK_SESSION,
    NEWYORK_FOCUS_SYMBOLS,
    SYMBOL_ALIASES,
    ROLLOVER_HOUR,
    ROLLOVER_BUFFER_MINUTES
)
from trading.debug_logger import log_event


# =========================
# SPREAD CHECK
# =========================

def check_spread(symbol):

    tick = mt5.symbol_info_tick(symbol)

    if tick is None:
        log_event(
            "spread_check_failed",
            level="warning",
            symbol=symbol,
            reason="tick_unavailable"
        )
        return False

    symbol_info = mt5.symbol_info(symbol)

    if symbol_info is None:
        log_event(
            "spread_check_failed",
            level="warning",
            symbol=symbol,
            reason="symbol_info_unavailable"
        )
        return False

    spread = (
        (tick.ask - tick.bid)
        / symbol_info.point
    )

    if spread > MAX_SPREAD_POINTS:

        print(
            f"{symbol}: Spread too high "
            f"({spread:.0f})"
        )

        log_event(
            "spread_check_failed",
            level="warning",
            symbol=symbol,
            spread=spread,
            max_spread=MAX_SPREAD_POINTS
        )

        return False
    
    print(
        f"{symbol}: Spread "
        f"{spread:.0f} points"
    )

    log_event(
        "spread_check_passed",
        symbol=symbol,
        spread=spread,
        max_spread=MAX_SPREAD_POINTS
    )

    return True


# =========================
# MARKET OPEN CHECK
# =========================

def is_market_open(verbose=True):

    now = datetime.now()

    if now.weekday() >= 5:

        if verbose:
            print("Market closed")

        if verbose:
            log_event(
                "market_closed",
                weekday=now.weekday()
            )

        return False

    return True


# =========================
# SESSION CHECK
# =========================

def is_within_sessions(verbose=True):

    if not is_market_open(verbose=verbose):
        return False

    if not ENABLE_SESSION_FILTER:
        return True

    flags = _get_session_flags()
    hour = flags["hour"]
    london_ok = flags["london"]
    ny_ok = flags["newyork"]

    if london_ok or ny_ok:
        return True

    if verbose:
        print("Outside trading sessions")
        log_event(
            "outside_trading_session",
            hour=hour,
            london_session=LONDON_SESSION,
            newyork_session=NEWYORK_SESSION
        )

    return False


def _get_session_flags():

    now = datetime.now()
    hour = now.hour

    london_ok = (
        LONDON_SESSION["start"]
        <= hour
        < LONDON_SESSION["end"]
    )

    ny_ok = (
        NEWYORK_SESSION["start"]
        <= hour
        < NEWYORK_SESSION["end"]
    )

    return {
        "hour": hour,
        "london": london_ok,
        "newyork": ny_ok
    }


def _unique_symbols(symbols):

    ordered_symbols = []
    seen = set()

    for symbol in symbols:

        if symbol in seen:
            continue

        seen.add(symbol)
        ordered_symbols.append(symbol)

    return ordered_symbols


def _resolve_symbol(symbol, available_symbols):

    if symbol in available_symbols:
        return symbol

    aliases = SYMBOL_ALIASES.get(symbol, [])

    for alias in aliases:

        if alias in available_symbols:
            return alias

    return None


def get_active_session_name():

    if not is_market_open(verbose=False):
        return None

    if not ENABLE_SESSION_FILTER:
        return "all"

    flags = _get_session_flags()

    if flags["newyork"]:
        return "newyork"

    if flags["london"]:
        return "london"

    return None


def get_active_session_label():

    session_name = get_active_session_name()

    if session_name == "newyork":

        flags = _get_session_flags()

        if flags["london"]:
            return "LONDON + NEW YORK (NY FOCUS)"

        return "NEW YORK"

    if session_name == "london":
        return "LONDON"

    if session_name == "all":
        return "ALL HOURS"

    return "CLOSED"


def get_session_symbols(verbose=True):

    configured_symbols = _unique_symbols(SYMBOLS)
    session_name = get_active_session_name()

    if session_name is None:
        return []

    if session_name != "newyork":
        return configured_symbols

    prioritized_symbols = []
    unresolved_symbols = []

    for symbol in NEWYORK_FOCUS_SYMBOLS:

        resolved_symbol = _resolve_symbol(
            symbol,
            configured_symbols
        )

        if resolved_symbol is None:
            unresolved_symbols.append(symbol)
            continue

        if resolved_symbol not in prioritized_symbols:
            prioritized_symbols.append(resolved_symbol)

    active_symbols = prioritized_symbols + [
        symbol
        for symbol in configured_symbols
        if symbol not in prioritized_symbols
    ]

    if prioritized_symbols:

        if verbose:
            log_event(
                "newyork_session_priority_applied",
                requested_symbols=NEWYORK_FOCUS_SYMBOLS,
                prioritized_symbols=prioritized_symbols,
                active_symbols=active_symbols,
                unresolved_symbols=unresolved_symbols
            )

        return active_symbols

    if verbose:
        print(
            "New York focus symbols unavailable. "
            "Using configured symbol list."
        )
        log_event(
            "newyork_session_priority_fallback",
            level="warning",
            requested_symbols=NEWYORK_FOCUS_SYMBOLS,
            configured_symbols=configured_symbols
        )

    return configured_symbols


def get_reference_symbol():

    session_symbols = get_session_symbols(verbose=False)

    if session_symbols:
        return session_symbols[0]

    configured_symbols = _unique_symbols(SYMBOLS)

    if configured_symbols:
        return configured_symbols[0]

    return None


# =========================
# ROLLOVER CHECK
# =========================

def is_rollover_time(verbose=True):

    now = datetime.now()

    if now.hour != ROLLOVER_HOUR:
        return False

    if now.minute <= ROLLOVER_BUFFER_MINUTES:

        if verbose:
            print("Rollover protection active")
            log_event(
                "rollover_protection_active",
                hour=now.hour,
                minute=now.minute
            )

        return True

    return False


# =========================
# MASTER FILTER
# =========================

def market_is_safe(symbol, verbose=True):

    if not is_market_open(verbose=verbose):
        return False

    if is_rollover_time(verbose=verbose):
        return False

    if not is_within_sessions(verbose=verbose):
        return False

    if not check_spread(symbol):
        return False

    log_event(
        "market_safe_for_symbol",
        symbol=symbol
    )

    return True
