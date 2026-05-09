import re

import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime, timedelta, timezone

from config import (
    ATR_PERIOD,
    MA_CROSSOVER_LOOKBACK_BARS,
    NEWS_MIN_RATE_SURPRISE,
    NEWS_MIN_RELATIVE_SURPRISE,
    NEWS_PROVIDER,
    SLOW_MA,
    SMC_DISPLACEMENT_ATR,
    SMC_LOOKBACK_BARS,
    SMC_MIN_BODY_RATIO,
    SMC_SWEEP_TOLERANCE_ATR,
    SMC_SWING_WINDOW,
    TRENDLINE_LOOKBACK_BARS,
    TRENDLINE_SWING_WINDOW,
    TRENDLINE_TOUCH_TOLERANCE_ATR
)
from trading.debug_logger import log_event
from trading.broker_runtime import get_active_broker
from trading.news_provider import build_news_cycle_context
from trading.strategy_settings import (
    get_broker_strategy_settings,
    get_strategy_settings
)
from trading.trade_manager import (
    calculate_atr,
    calculate_moving_averages
)


TIMEFRAME_MAP = {
    "M1": mt5.TIMEFRAME_M1,
    "M5": mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30,
    "H1": mt5.TIMEFRAME_H1,
    "H4": mt5.TIMEFRAME_H4,
    "D1": mt5.TIMEFRAME_D1
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

DEFAULT_STRATEGIES = {
    "ma_crossover": {
        "name": "MA Crossover",
        "comment_code": "MAX",
        "enabled": True,
        "timeframe": "M15",
        "recommended_timeframes": [
            "M15",
            "M30",
            "H1"
        ],
        "bars": max(SLOW_MA + 5, 100)
    },
    "trendline_price_action": {
        "name": "Trendline + Price Action",
        "comment_code": "TPA",
        "enabled": True,
        "timeframe": "H1",
        "recommended_timeframes": [
            "H1",
            "H4",
            "D1"
        ],
        "bars": max(TRENDLINE_LOOKBACK_BARS, ATR_PERIOD + 30)
    },
    "smc_liquidity_sweep": {
        "name": "SMC Liquidity Sweep",
        "comment_code": "SMC",
        "enabled": False,
        "timeframe": "M15",
        "recommended_timeframes": [
            "M15",
            "M30",
            "H1"
        ],
        "bars": max(SMC_LOOKBACK_BARS, ATR_PERIOD + 30)
    },
    "high_impact_news": {
        "name": "High Impact News",
        "comment_code": "NEWS",
        "enabled": False,
        "timeframe": "M1",
        "recommended_timeframes": [
            "M1",
            "M5"
        ],
        "bars": max(ATR_PERIOD + 30, 80)
    },
    "stochastic_oscillator": {
        "name": "Stochastic Oscillator",
        "comment_code": "STO",
        "enabled": False,
        "timeframe": "M5",
        "recommended_timeframes": [
            "M5"
        ],
        "bars": max(ATR_PERIOD + 30, 80),
        "broker_scope": [
            "deriv"
        ],
        "k_period": 5,
        "d_period": 3,
        "slowing": 3,
        "upper_level": 75,
        "lower_level": 25,
        "price_field": "low_high",
        "method": "simple",
        "trades_per_signal": 5,
        "max_positions_per_symbol": 25,
        "trade_mode": "normal",
        "use_take_profit": False
    }
}

LAST_EVALUATED_CANDLES = {}
PROCESSED_NEWS_SIGNALS = {}
FOREX_TOKENS = {
    "AUD",
    "CAD",
    "CHF",
    "EUR",
    "GBP",
    "JPY",
    "NZD",
    "USD",
    "XAU",
    "XAG"
}
INDEX_SYMBOL_NEWS_MAP = {
    "USTECM": "USD",
    "US30M": "USD",
    "DE30M": "EUR"
}
RISK_ON_EVENT_KEYWORDS = (
    "gdp",
    "retail sales",
    "manufacturing",
    "services",
    "pmi",
    "employment",
    "payroll",
    "consumer confidence",
    "confidence",
    "durable goods",
    "industrial production",
    "business climate",
    "ism"
)
HAWKISH_EVENT_KEYWORDS = (
    "cpi",
    "ppi",
    "pce",
    "inflation",
    "price index",
    "prices",
    "interest rate",
    "rate decision",
    "fomc",
    "fed",
    "ecb",
    "boe",
    "boj",
    "minutes",
    "speech",
    "wage",
    "earnings"
)
INVERSE_EVENT_KEYWORDS = (
    "unemployment rate",
    "unemployment",
    "jobless claims",
    "initial claims",
    "continuing claims",
    "claims"
)
NEWS_VALUE_MULTIPLIERS = {
    "K": 1_000,
    "M": 1_000_000,
    "B": 1_000_000_000
}


def get_strategy_catalog():

    catalog = []
    active_broker = get_active_broker()
    active_broker_id = (
        None
        if active_broker is None
        else active_broker.get("id")
    )

    if (
        active_broker is not None
        and "strategy_settings" in active_broker
    ):
        configured_settings = get_broker_strategy_settings(
            active_broker
        )
        strategy_ids = [
            strategy_id
            for strategy_id in DEFAULT_STRATEGIES
            if strategy_id in configured_settings
        ]
    elif active_broker_id == "deriv":
        configured_settings = {}
        strategy_ids = []
    else:
        configured_settings = get_strategy_settings()
        strategy_ids = [
            strategy_id
            for strategy_id, defaults in (
                DEFAULT_STRATEGIES.items()
            )
            if not defaults.get("broker_scope")
        ]

    for strategy_id in strategy_ids:

        defaults = DEFAULT_STRATEGIES[strategy_id]

        settings = configured_settings.get(
            strategy_id,
            {}
        )
        strategy = defaults.copy()
        strategy.update(settings)

        timeframe = str(
            strategy.get(
                "timeframe",
                defaults["timeframe"]
            )
        ).upper()

        if timeframe not in TIMEFRAME_MAP:
            timeframe = defaults["timeframe"]

        recommended_timeframes = []

        for label in strategy.get(
            "recommended_timeframes",
            defaults["recommended_timeframes"]
        ):

            normalized = str(label).upper()

            if normalized in TIMEFRAME_MAP:
                recommended_timeframes.append(normalized)

        if not recommended_timeframes:
            recommended_timeframes = list(
                defaults["recommended_timeframes"]
            )

        strategy["id"] = strategy_id
        strategy["timeframe"] = timeframe
        strategy["timeframe_code"] = TIMEFRAME_MAP[timeframe]
        strategy["timeframe_seconds"] = TIMEFRAME_SECONDS[timeframe]
        strategy["recommended_timeframes"] = recommended_timeframes
        strategy["bars"] = max(
            int(strategy.get("bars", defaults["bars"])),
            ATR_PERIOD + 5
        )
        max_positions_per_symbol = _bounded_int(
            strategy.get(
                "max_positions_per_symbol",
                defaults.get("max_positions_per_symbol", 5)
            ),
            default=5,
            minimum=1,
            maximum=25
        )
        strategy["max_positions_per_symbol"] = max_positions_per_symbol
        strategy["trades_per_signal"] = _bounded_int(
            strategy.get(
                "trades_per_signal",
                defaults.get("trades_per_signal", 1)
            ),
            default=1,
            minimum=1,
            maximum=max_positions_per_symbol
        )

        catalog.append(strategy)

    return catalog


def get_enabled_strategies():

    return [
        strategy
        for strategy in get_strategy_catalog()
        if strategy.get("enabled", False)
    ]


def build_strategy_cycle_context():

    enabled_strategy_ids = {
        strategy["id"]
        for strategy in get_enabled_strategies()
    }
    context = {
        "provider": NEWS_PROVIDER,
        "news_events": []
    }

    if "high_impact_news" in enabled_strategy_ids:
        context.update(
            build_news_cycle_context()
        )

    return context


def get_strategy_cycle_timeframe_label():

    strategies = get_enabled_strategies()

    if not strategies:
        return "M15"

    return min(
        strategies,
        key=lambda item: item["timeframe_seconds"]
    )["timeframe"]


def get_strategy_cycle_timeframe():

    return TIMEFRAME_MAP[
        get_strategy_cycle_timeframe_label()
    ]


def get_slowest_enabled_strategy_timeframe_label():

    strategies = get_enabled_strategies()

    if not strategies:
        return "M15"

    return max(
        strategies,
        key=lambda item: item["timeframe_seconds"]
    )["timeframe"]


def get_slowest_enabled_strategy_timeframe():

    return TIMEFRAME_MAP[
        get_slowest_enabled_strategy_timeframe_label()
    ]


def get_strategy_overview_lines():

    lines = []

    for strategy in get_enabled_strategies():

        recommendations = ", ".join(
            strategy["recommended_timeframes"]
        )

        lines.append(
            f"{strategy['name']} | "
            f"Live TF: {strategy['timeframe']} | "
            f"Best TFs: {recommendations}"
        )

    return lines


def evaluate_strategy_signal(
    symbol,
    strategy,
    df,
    cycle_context=None
):

    if df is None or df.empty:
        return None

    candle_time = _extract_candle_time(df)

    if candle_time is None:
        log_event(
            "strategy_signal_skipped",
            level="warning",
            symbol=symbol,
            strategy=strategy["id"],
            reason="candle_time_unavailable"
        )
        return None

    if not _claim_candle(
        symbol,
        strategy["id"],
        candle_time
    ):
        return None

    working_df = calculate_atr(df.copy())
    atr = working_df["atr"].iloc[-1]

    if pd.isna(atr):
        log_event(
            "strategy_signal_skipped",
            level="warning",
            symbol=symbol,
            strategy=strategy["id"],
            reason="atr_not_ready"
        )
        return None

    signal = None
    reason = None
    context = {}

    if strategy["id"] == "ma_crossover":

        working_df = calculate_moving_averages(
            working_df
        )

        signal, crossover_age, crossover_time = (
            _find_recent_ma_crossover(
                working_df,
                MA_CROSSOVER_LOOKBACK_BARS
            )
        )

        if signal is not None:
            if crossover_age == 0:
                reason = (
                    "Fast/slow moving average crossover "
                    "on the latest closed candle."
                )
            else:
                reason = (
                    "Fast/slow moving average crossover "
                    f"{crossover_age} closed candles ago."
                )
            context = {
                "setup": "ma_crossover",
                "crossover_age_bars": crossover_age,
                "crossover_time": crossover_time,
                "lookback_bars": MA_CROSSOVER_LOOKBACK_BARS
            }

    elif strategy["id"] == "trendline_price_action":

        signal, reason, context = (
            check_trendline_price_action(
                working_df
            )
        )

    elif strategy["id"] == "smc_liquidity_sweep":

        signal, reason, context = (
            check_smc_liquidity_sweep(
                working_df
            )
        )

    elif strategy["id"] == "high_impact_news":

        signal, reason, context = (
            check_high_impact_news(
                symbol,
                working_df,
                cycle_context or {}
            )
        )

    elif strategy["id"] == "stochastic_oscillator":

        signal, reason, context = (
            check_stochastic_oscillator(
                working_df,
                strategy,
                symbol=symbol
            )
        )

    else:
        log_event(
            "strategy_signal_skipped",
            level="warning",
            symbol=symbol,
            strategy=strategy["id"],
            reason="unsupported_strategy"
        )
        return None

    if signal is None:
        return None

    last = working_df.iloc[-1]

    return {
        "id": strategy["id"],
        "name": strategy["name"],
        "comment_code": strategy["comment_code"],
        "signal": signal,
        "timeframe": strategy["timeframe"],
        "timeframe_seconds": strategy["timeframe_seconds"],
        "recommended_timeframes": strategy[
            "recommended_timeframes"
        ],
        "price": float(last["close"]),
        "atr": float(atr),
        "candle_time": candle_time,
        "reason": reason,
        "context": context,
        "trades_per_signal": _bounded_int(
            strategy.get("trades_per_signal"),
            default=1,
            minimum=1,
            maximum=_strategy_trade_count_cap(strategy)
        ),
        "execution_overrides": _build_execution_overrides(
            strategy
        )
    }


def check_trendline_price_action(df):

    if len(df) < TRENDLINE_LOOKBACK_BARS:
        return None, None, {}

    lookback = df.tail(
        TRENDLINE_LOOKBACK_BARS
    ).reset_index(drop=True)

    atr = lookback["atr"].iloc[-1]

    if pd.isna(atr):
        return None, None, {}

    current = lookback.iloc[-1]
    previous = lookback.iloc[-2]

    tolerance = max(
        float(atr) * TRENDLINE_TOUCH_TOLERANCE_ATR,
        0.00001
    )

    swing_lows = _find_swing_points(
        lookback,
        "low",
        TRENDLINE_SWING_WINDOW,
        "low"
    )
    swing_highs = _find_swing_points(
        lookback,
        "high",
        TRENDLINE_SWING_WINDOW,
        "high"
    )

    bullish_trendline = _select_trendline(
        swing_lows,
        direction="ascending"
    )

    if bullish_trendline is not None:

        line_value = _project_trendline(
            bullish_trendline,
            len(lookback) - 1
        )

        touched_line = (
            current["low"] <= line_value + tolerance
        )
        held_above = current["close"] > line_value
        bullish_rejection = _is_bullish_rejection(
            current,
            previous
        )
        bullish_breakout = (
            previous["close"] <= line_value + tolerance
            and current["close"] > line_value + tolerance
            and current["close"] > previous["high"]
        )

        if touched_line and held_above:

            if bullish_rejection:
                return (
                    "BUY",
                    "Ascending trendline bounce confirmed "
                    "by bullish price action.",
                    {
                        "trendline_value": float(line_value),
                        "setup": "bounce"
                    }
                )

            if bullish_breakout:
                return (
                    "BUY",
                    "Ascending trendline breakout confirmed "
                    "by bullish close.",
                    {
                        "trendline_value": float(line_value),
                        "setup": "breakout"
                    }
                )

    bearish_trendline = _select_trendline(
        swing_highs,
        direction="descending"
    )

    if bearish_trendline is not None:

        line_value = _project_trendline(
            bearish_trendline,
            len(lookback) - 1
        )

        touched_line = (
            current["high"] >= line_value - tolerance
        )
        held_below = current["close"] < line_value
        bearish_rejection = _is_bearish_rejection(
            current,
            previous
        )
        bearish_breakout = (
            previous["close"] >= line_value - tolerance
            and current["close"] < line_value - tolerance
            and current["close"] < previous["low"]
        )

        if touched_line and held_below:

            if bearish_rejection:
                return (
                    "SELL",
                    "Descending trendline rejection confirmed "
                    "by bearish price action.",
                    {
                        "trendline_value": float(line_value),
                        "setup": "rejection"
                    }
                )

            if bearish_breakout:
                return (
                    "SELL",
                    "Descending trendline break confirmed "
                    "by bearish close.",
                    {
                        "trendline_value": float(line_value),
                        "setup": "breakout"
                    }
                )

    return None, None, {}


def _find_recent_ma_crossover(
    df,
    lookback_bars
):

    if len(df) < SLOW_MA + 1:
        return None, None, None

    max_lookback = min(
        max(int(lookback_bars), 1),
        len(df) - 1
    )

    for age in range(max_lookback):

        current_index = len(df) - 1 - age
        previous_index = current_index - 1
        prev = df.iloc[previous_index]
        curr = df.iloc[current_index]

        if (
            pd.isna(prev["ma_fast"])
            or pd.isna(prev["ma_slow"])
            or pd.isna(curr["ma_fast"])
            or pd.isna(curr["ma_slow"])
        ):
            continue

        if (
            prev["ma_fast"] <= prev["ma_slow"]
            and curr["ma_fast"] > curr["ma_slow"]
        ):
            return (
                "BUY",
                age,
                _extract_row_time(curr)
            )

        if (
            prev["ma_fast"] >= prev["ma_slow"]
            and curr["ma_fast"] < curr["ma_slow"]
        ):
            return (
                "SELL",
                age,
                _extract_row_time(curr)
            )

    return None, None, None


def calculate_stochastic_oscillator(
    df,
    k_period,
    d_period,
    slowing
):

    lowest_low = df["low"].rolling(k_period).min()
    highest_high = df["high"].rolling(k_period).max()
    price_range = highest_high - lowest_low
    usable_range = price_range.where(
        price_range > 0
    )

    df["stochastic_raw_k"] = (
        (df["close"] - lowest_low)
        / usable_range
        * 100
    )
    df["stochastic_main"] = (
        df["stochastic_raw_k"]
        .rolling(slowing)
        .mean()
    )
    df["stochastic_signal"] = (
        df["stochastic_main"]
        .rolling(d_period)
        .mean()
    )

    return df


def check_stochastic_oscillator(
    df,
    strategy,
    symbol=None
):

    k_period = _positive_int(
        strategy.get("k_period"),
        5
    )
    d_period = _positive_int(
        strategy.get("d_period"),
        3
    )
    slowing = _positive_int(
        strategy.get("slowing"),
        3
    )
    upper_level = _float_value(
        strategy.get("upper_level"),
        75
    )
    lower_level = _float_value(
        strategy.get("lower_level"),
        25
    )
    price_field = str(
        strategy.get("price_field", "low_high")
    ).lower()
    method = str(
        strategy.get("method", "simple")
    ).lower()

    if (
        price_field != "low_high"
        or method != "simple"
    ):
        _log_deriv_stochastic_diagnostic(
            symbol,
            strategy,
            decision="skipped",
            decision_reason="unsupported_stochastic_settings",
            price_field=price_field,
            method=method
        )
        return None, None, {}

    minimum_bars = (
        k_period
        + slowing
        + d_period
        - 1
    )

    if len(df) < minimum_bars:
        _log_deriv_stochastic_diagnostic(
            symbol,
            strategy,
            decision="skipped",
            decision_reason="insufficient_bars",
            bars=len(df),
            minimum_bars=minimum_bars
        )
        return None, None, {}

    working_df = calculate_stochastic_oscillator(
        df.copy(),
        k_period,
        d_period,
        slowing
    )
    previous = working_df.iloc[-2]
    current = working_df.iloc[-1]
    required_columns = [
        "stochastic_main",
        "stochastic_signal"
    ]

    if any(
        pd.isna(previous[column])
        or pd.isna(current[column])
        for column in required_columns
    ):
        _log_deriv_stochastic_diagnostic(
            symbol,
            strategy,
            decision="skipped",
            decision_reason="stochastic_values_not_ready",
            previous_main=_safe_float(
                previous["stochastic_main"]
            ),
            previous_signal=_safe_float(
                previous["stochastic_signal"]
            ),
            main=_safe_float(
                current["stochastic_main"]
            ),
            signal=_safe_float(
                current["stochastic_signal"]
            )
        )
        return None, None, {}

    previous_main = float(
        previous["stochastic_main"]
    )
    previous_signal = float(
        previous["stochastic_signal"]
    )
    current_main = float(
        current["stochastic_main"]
    )
    current_signal = float(
        current["stochastic_signal"]
    )

    context = {
        "setup": "stochastic_oscillator",
        "main": current_main,
        "signal": current_signal,
        "previous_main": previous_main,
        "previous_signal": previous_signal,
        "upper_level": upper_level,
        "lower_level": lower_level,
        "k_period": k_period,
        "d_period": d_period,
        "slowing": slowing,
        "price_field": price_field,
        "method": method
    }

    current_overbought = (
        current_main > upper_level
        and current_signal > upper_level
    )
    previous_overbought = (
        previous_main > upper_level
        and previous_signal > upper_level
    )
    current_oversold = (
        current_main < lower_level
        and current_signal < lower_level
    )
    previous_oversold = (
        previous_main < lower_level
        and previous_signal < lower_level
    )
    sell_cross = (
        previous_main >= previous_signal
        and current_main < current_signal
    )
    buy_cross = (
        previous_main <= previous_signal
        and current_main > current_signal
    )
    diagnostic_context = {
        **context,
        "sell_cross": sell_cross,
        "buy_cross": buy_cross,
        "current_overbought": current_overbought,
        "previous_overbought": previous_overbought,
        "current_oversold": current_oversold,
        "previous_oversold": previous_oversold,
        "allowed_symbol_signal": (
            _get_deriv_stochastic_allowed_signal(
                symbol,
                strategy
            )
        )
    }
    enforce_deriv_symbol_signal = bool(
        strategy.get(
            "enforce_deriv_symbol_signal",
            True
        )
    )

    if (
        sell_cross
        and current_overbought
    ):
        if (
            enforce_deriv_symbol_signal
            and not _deriv_stochastic_signal_allowed(
                symbol,
                "SELL",
                strategy
            )
        ):
            _log_deriv_stochastic_diagnostic(
                symbol,
                strategy,
                decision="no_signal",
                decision_reason=(
                    "sell_signal_not_allowed_for_symbol"
                ),
                **diagnostic_context
            )
            return None, None, {}

        context["zone_candle"] = (
            "current"
        )
        _log_deriv_stochastic_diagnostic(
            symbol,
            strategy,
            decision="sell_signal",
            decision_reason="sell_cross_in_overbought_zone",
            **{
                **diagnostic_context,
                "zone_candle": context["zone_candle"]
            }
        )
        return (
            "SELL",
            "Stochastic %K crossed below %D above the 75 level.",
            context
        )

    if (
        buy_cross
        and current_oversold
    ):
        if (
            enforce_deriv_symbol_signal
            and not _deriv_stochastic_signal_allowed(
                symbol,
                "BUY",
                strategy
            )
        ):
            _log_deriv_stochastic_diagnostic(
                symbol,
                strategy,
                decision="no_signal",
                decision_reason=(
                    "buy_signal_not_allowed_for_symbol"
                ),
                **diagnostic_context
            )
            return None, None, {}

        context["zone_candle"] = (
            "current"
        )
        _log_deriv_stochastic_diagnostic(
            symbol,
            strategy,
            decision="buy_signal",
            decision_reason="buy_cross_in_oversold_zone",
            **{
                **diagnostic_context,
                "zone_candle": context["zone_candle"]
            }
        )
        return (
            "BUY",
            "Stochastic %K crossed above %D below the 25 level.",
            context
        )

    if not sell_cross and not buy_cross:
        decision_reason = "no_main_signal_cross"
    elif sell_cross:
        decision_reason = "sell_cross_without_overbought_zone"
    elif buy_cross:
        decision_reason = "buy_cross_without_oversold_zone"
    else:
        decision_reason = "no_signal"

    _log_deriv_stochastic_diagnostic(
        symbol,
        strategy,
        decision="no_signal",
        decision_reason=decision_reason,
        **diagnostic_context
    )

    return None, None, {}


def check_smc_liquidity_sweep(df):

    minimum_bars = max(
        SMC_LOOKBACK_BARS,
        (SMC_SWING_WINDOW * 2) + 8
    )

    if len(df) < minimum_bars:
        return None, None, {}

    lookback = df.tail(
        SMC_LOOKBACK_BARS
    ).reset_index(drop=True)

    if len(lookback) < (SMC_SWING_WINDOW * 2) + 4:
        return None, None, {}

    atr = lookback["atr"].iloc[-1]

    if pd.isna(atr):
        return None, None, {}

    structure_df = lookback.iloc[:-2].reset_index(drop=True)

    if len(structure_df) < (SMC_SWING_WINDOW * 2) + 3:
        return None, None, {}

    sweep_candle = lookback.iloc[-2]
    current = lookback.iloc[-1]
    tolerance = max(
        float(atr) * SMC_SWEEP_TOLERANCE_ATR,
        0.00001
    )

    swing_lows = _find_swing_points(
        structure_df,
        "low",
        SMC_SWING_WINDOW,
        "low"
    )
    swing_highs = _find_swing_points(
        structure_df,
        "high",
        SMC_SWING_WINDOW,
        "high"
    )

    bullish_levels = _select_smc_levels(
        swing_lows,
        swing_highs,
        direction="bullish"
    )

    if bullish_levels is not None:

        liquidity_low, structure_high = bullish_levels
        sweep_confirmed = (
            sweep_candle["low"] < (
                liquidity_low[1] - tolerance
            )
            and sweep_candle["close"] > liquidity_low[1]
        )
        break_level = max(
            structure_high[1] + tolerance,
            sweep_candle["high"]
        )

        if (
            sweep_confirmed
            and _is_bullish_displacement(
                current,
                break_level,
                atr
            )
        ):
            return (
                "BUY",
                "SMC bullish liquidity sweep followed by "
                "bullish break of structure.",
                {
                    "setup": "liquidity_sweep_bos",
                    "liquidity_level": float(
                        liquidity_low[1]
                    ),
                    "structure_level": float(
                        structure_high[1]
                    ),
                    "sweep_candle_high": float(
                        sweep_candle["high"]
                    )
                }
            )

    bearish_levels = _select_smc_levels(
        swing_highs,
        swing_lows,
        direction="bearish"
    )

    if bearish_levels is not None:

        liquidity_high, structure_low = bearish_levels
        sweep_confirmed = (
            sweep_candle["high"] > (
                liquidity_high[1] + tolerance
            )
            and sweep_candle["close"] < liquidity_high[1]
        )
        break_level = min(
            structure_low[1] - tolerance,
            sweep_candle["low"]
        )

        if (
            sweep_confirmed
            and _is_bearish_displacement(
                current,
                break_level,
                atr
            )
        ):
            return (
                "SELL",
                "SMC bearish liquidity sweep followed by "
                "bearish break of structure.",
                {
                    "setup": "liquidity_sweep_bos",
                    "liquidity_level": float(
                        liquidity_high[1]
                    ),
                    "structure_level": float(
                        structure_low[1]
                    ),
                    "sweep_candle_low": float(
                        sweep_candle["low"]
                    )
                }
            )

    return None, None, {}


def check_high_impact_news(
    symbol,
    df,
    cycle_context
):

    news_events = cycle_context.get(
        "news_events",
        []
    )

    if not news_events:
        return None, None, {}

    for event in news_events:

        event_id = (
            event.get("id")
            or event.get("event_id")
        )

        if not event_id:
            continue

        if _news_signal_processed(
            symbol,
            event_id
        ):
            continue

        decision = _evaluate_news_event_for_symbol(
            symbol,
            event
        )

        if decision is None:
            continue

        signal = decision["signal"]

        _mark_news_signal_processed(
            symbol,
            event_id
        )

        surprise_direction = decision.get(
            "surprise_direction",
            "better" if decision["currency_bullish"] else "worse"
        )
        forecast = event.get("consensus")

        return (
            signal,
            (
                f"High impact {event['currency_code']} news "
                f"triggered by {event['name']} "
                f"({surprise_direction} than forecast)."
            ),
            {
                "setup": "high_impact_news",
                "event_id": event_id,
                "event_name": event["name"],
                "currency_code": event["currency_code"],
                "event_time_utc": event["date_utc"],
                "actual": event["actual"],
                "forecast": forecast,
                "consensus": forecast,
                "previous": event.get("previous"),
                "surprise": decision.get("surprise"),
                "relative_surprise": decision.get(
                    "relative_surprise"
                ),
                "surprise_direction": surprise_direction,
                "event_class": decision["event_class"],
                "decision_source": decision["decision_source"],
                "currency_bullish": decision["currency_bullish"],
                "is_better_than_expected": (
                    event.get("is_better_than_expected")
                ),
                "provider": cycle_context.get(
                    "provider",
                    NEWS_PROVIDER
                )
            }
        )

    return None, None, {}


def _evaluate_news_event_for_symbol(
    symbol,
    event
):

    impact = _evaluate_news_event_impact(event)

    if impact is None:
        return None

    signal = _map_news_impact_to_symbol(
        symbol,
        event,
        impact
    )

    if signal is None:
        return None

    decision = impact.copy()
    decision["signal"] = signal

    return decision


def _evaluate_news_event_impact(event):

    event_class = _classify_news_event(event)
    actual_value = _parse_news_value(
        event.get("actual")
    )
    forecast_value = _parse_news_value(
        event.get("consensus")
    )

    if (
        actual_value is not None
        and forecast_value is not None
        and event_class is not None
    ):
        surprise = actual_value - forecast_value

        if surprise == 0:
            _log_news_event_skip(
                event,
                "actual_equals_forecast"
            )
            return None

        relative_surprise = _calculate_relative_surprise(
            surprise,
            forecast_value
        )

        if not _surprise_meets_threshold(
            surprise,
            relative_surprise,
            event
        ):
            _log_news_event_skip(
                event,
                "surprise_below_threshold",
                surprise=float(surprise),
                relative_surprise=relative_surprise
            )
            return None

        higher_than_forecast = surprise > 0
        currency_bullish = _event_class_currency_bullish(
            event_class,
            higher_than_forecast
        )

        return {
            "currency_bullish": currency_bullish,
            "event_class": event_class,
            "decision_source": "actual_vs_forecast",
            "surprise": float(surprise),
            "relative_surprise": (
                None
                if relative_surprise is None
                else float(relative_surprise)
            ),
            "surprise_direction": (
                "better" if currency_bullish else "worse"
            )
        }

    provider_flag = event.get(
        "is_better_than_expected"
    )

    if provider_flag is None:
        _log_news_event_skip(
            event,
            "missing_value_decision"
        )
        return None

    currency_bullish = bool(provider_flag)

    return {
        "currency_bullish": currency_bullish,
        "event_class": event_class or "provider_fallback",
        "decision_source": "provider_flag",
        "surprise": None,
        "relative_surprise": None,
        "surprise_direction": (
            "better" if currency_bullish else "worse"
        )
    }


def _map_news_event_to_symbol(
    symbol,
    event
):

    impact = _evaluate_news_event_impact(event)

    if impact is None:
        return None

    return _map_news_impact_to_symbol(
        symbol,
        event,
        impact
    )


def _map_news_impact_to_symbol(
    symbol,
    event,
    impact
):

    cleaned_symbol = _clean_symbol(symbol)
    currency_code = event["currency_code"]
    currency_bullish = impact["currency_bullish"]

    pair = _extract_currency_pair(
        cleaned_symbol
    )

    if pair is not None:

        base_currency, quote_currency = pair

        if currency_code == base_currency:
            return "BUY" if currency_bullish else "SELL"

        if currency_code == quote_currency:
            return "SELL" if currency_bullish else "BUY"

        return None

    mapped_currency = INDEX_SYMBOL_NEWS_MAP.get(
        cleaned_symbol
    )

    if mapped_currency != currency_code:
        return None

    event_class = impact["event_class"]

    if event_class == "hawkish":
        return "SELL" if currency_bullish else "BUY"

    if event_class in (
        "risk_on",
        "inverse",
        "provider_fallback"
    ):
        return "BUY" if currency_bullish else "SELL"

    return None


def _classify_news_event(event):

    event_name = str(
        event.get("name", "")
    ).lower()

    if _contains_keyword(
        event_name,
        INVERSE_EVENT_KEYWORDS
    ):
        return "inverse"

    if _contains_keyword(
        event_name,
        HAWKISH_EVENT_KEYWORDS
    ):
        return "hawkish"

    if _contains_keyword(
        event_name,
        RISK_ON_EVENT_KEYWORDS
    ):
        return "risk_on"

    return None


def _event_class_currency_bullish(
    event_class,
    higher_than_forecast
):

    if event_class == "inverse":
        return not higher_than_forecast

    return higher_than_forecast


def _parse_news_value(value):

    if value is None:
        return None

    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip()

    if not text:
        return None

    cleaned = text.replace(",", "")
    match = re.search(
        r"[-+]?\d*\.?\d+",
        cleaned
    )

    if match is None:
        return None

    number = float(match.group(0))
    suffix_text = cleaned[match.end():].strip().upper()

    if suffix_text:
        suffix = suffix_text[0]
        number *= NEWS_VALUE_MULTIPLIERS.get(
            suffix,
            1
        )

    return number


def _calculate_relative_surprise(
    surprise,
    forecast_value
):

    if forecast_value == 0:
        return None

    return abs(surprise) / abs(forecast_value)


def _surprise_meets_threshold(
    surprise,
    relative_surprise,
    event
):

    absolute_surprise = abs(surprise)

    if _is_rate_or_percentage_event(event):
        return absolute_surprise >= NEWS_MIN_RATE_SURPRISE

    if relative_surprise is None:
        return absolute_surprise > 0

    return relative_surprise >= NEWS_MIN_RELATIVE_SURPRISE


def _is_rate_or_percentage_event(event):

    unit = str(
        event.get("unit", "")
    ).lower()
    event_name = str(
        event.get("name", "")
    ).lower()

    return (
        "%" in unit
        or "percent" in unit
        or "rate" in event_name
        or _contains_keyword(
            event_name,
            (
                "cpi",
                "ppi",
                "pce",
                "gdp",
                "inflation",
                "retail sales",
                "wage",
                "earnings"
            )
        )
    )


def _log_news_event_skip(
    event,
    reason,
    **extra_context
):

    log_event(
        "news_event_skipped",
        event_id=(
            event.get("id")
            or event.get("event_id")
        ),
        event_name=event.get("name"),
        currency_code=event.get("currency_code"),
        reason=reason,
        **extra_context
    )


def _clean_symbol(symbol):

    return "".join(
        character
        for character in str(symbol).upper()
        if character.isalnum()
    )


def _extract_currency_pair(symbol):

    alpha_only = "".join(
        character
        for character in symbol
        if character.isalpha()
    )

    if len(alpha_only) < 6:
        return None

    base_currency = alpha_only[:3]
    quote_currency = alpha_only[3:6]

    if (
        base_currency not in FOREX_TOKENS
        or quote_currency not in FOREX_TOKENS
    ):
        return None

    return (
        base_currency,
        quote_currency
    )


def _contains_keyword(
    text,
    keywords
):

    return any(
        keyword in text
        for keyword in keywords
    )


def _positive_int(
    value,
    fallback
):

    try:
        normalized = int(value)
    except (TypeError, ValueError):
        return int(fallback)

    if normalized <= 0:
        return int(fallback)

    return normalized


def _bounded_int(
    value,
    default,
    minimum,
    maximum
):

    normalized = _positive_int(
        value,
        default
    )

    return max(
        int(minimum),
        min(
            int(maximum),
            normalized
        )
    )


def _float_value(
    value,
    fallback
):

    try:
        return float(value)
    except (TypeError, ValueError):
        return float(fallback)


def _safe_float(value):

    try:
        if pd.isna(value):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _build_execution_overrides(strategy):

    overrides = {}

    if "use_take_profit" in strategy:
        overrides["use_take_profit"] = bool(
            strategy.get("use_take_profit")
        )

    if "max_positions_per_symbol" in strategy:
        overrides["max_positions_per_symbol"] = (
            _bounded_int(
                strategy.get("max_positions_per_symbol"),
                default=5,
                minimum=1,
                maximum=25
            )
        )

    return overrides


def _strategy_trade_count_cap(strategy):

    return _bounded_int(
        strategy.get("max_positions_per_symbol"),
        default=5,
        minimum=1,
        maximum=25
    )


def _deriv_stochastic_signal_allowed(
    symbol,
    signal,
    strategy=None
):

    allowed_signal = (
        _get_deriv_stochastic_allowed_signal(
            symbol,
            strategy
        )
    )

    if allowed_signal is None:
        return True

    if allowed_signal == "BOTH":
        return True

    return allowed_signal == signal


def _get_deriv_stochastic_allowed_signal(
    symbol,
    strategy=None
):

    active_broker = get_active_broker()

    if (
        active_broker is None
        or active_broker.get("id") != "deriv"
    ):
        return None

    symbol_key = "".join(
        char
        for char in str(symbol).upper()
        if char.isalnum()
    )

    trade_mode = _get_deriv_stochastic_trade_mode(
        active_broker,
        strategy
    )

    if symbol_key in (
        "CRASH1000",
        "CRASH1000INDEX"
    ):
        if trade_mode == "both":
            return "BOTH"

        return (
            "SELL"
            if trade_mode == "spike"
            else "BUY"
        )

    if symbol_key in (
        "BOOM1000",
        "BOOM1000INDEX"
    ):
        if trade_mode == "both":
            return "BOTH"

        return (
            "BUY"
            if trade_mode == "spike"
            else "SELL"
        )

    return None


def _get_deriv_stochastic_trade_mode(
    active_broker,
    strategy=None
):

    mode = None

    if isinstance(strategy, dict):
        mode = strategy.get("trade_mode")

    if not mode and isinstance(active_broker, dict):
        broker_strategy = (
            active_broker
            .get("strategy_settings", {})
            .get("stochastic_oscillator", {})
        )

        if isinstance(broker_strategy, dict):
            mode = broker_strategy.get("trade_mode")

    mode = str(mode or "normal").strip().lower()

    if mode not in ("normal", "spike", "both"):
        return "normal"

    return mode


def _log_deriv_stochastic_diagnostic(
    symbol,
    strategy,
    decision,
    decision_reason,
    **context
):

    active_broker = get_active_broker()

    if (
        active_broker is None
        or active_broker.get("id") != "deriv"
    ):
        return

    log_event(
        "deriv_stochastic_diagnostic",
        symbol=symbol,
        strategy=strategy.get("id"),
        timeframe=strategy.get("timeframe"),
        decision=decision,
        decision_reason=decision_reason,
        trades_per_signal=strategy.get(
            "trades_per_signal"
        ),
        **context
    )


def _news_signal_processed(
    symbol,
    event_id
):

    _prune_processed_news_signals()

    return (
        str(symbol).upper(),
        str(event_id)
    ) in PROCESSED_NEWS_SIGNALS


def _mark_news_signal_processed(
    symbol,
    event_id
):

    _prune_processed_news_signals()

    PROCESSED_NEWS_SIGNALS[
        (
            str(symbol).upper(),
            str(event_id)
        )
    ] = datetime.now(timezone.utc)


def _prune_processed_news_signals():

    if not PROCESSED_NEWS_SIGNALS:
        return

    cutoff = datetime.now(
        timezone.utc
    ) - timedelta(hours=24)
    expired_keys = [
        key
        for key, created_at in (
            PROCESSED_NEWS_SIGNALS.items()
        )
        if created_at < cutoff
    ]

    for key in expired_keys:
        PROCESSED_NEWS_SIGNALS.pop(
            key,
            None
        )


def _find_swing_points(
    df,
    column,
    window,
    point_type
):

    points = []

    values = df[column]

    for index in range(
        window,
        len(df) - window
    ):

        section = values.iloc[
            index - window:index + window + 1
        ]
        current = values.iloc[index]

        if point_type == "low":
            is_swing = (
                current == section.min()
                and int((section == current).sum()) == 1
            )
        else:
            is_swing = (
                current == section.max()
                and int((section == current).sum()) == 1
            )

        if is_swing:
            points.append(
                (
                    index,
                    float(current)
                )
            )

    return points


def _select_trendline(
    points,
    direction
):

    for end_index in range(
        len(points) - 1,
        0,
        -1
    ):

        first_point = points[end_index - 1]
        second_point = points[end_index]

        if second_point[0] - first_point[0] < 4:
            continue

        if (
            direction == "ascending"
            and second_point[1] > first_point[1]
        ):
            return (
                first_point,
                second_point
            )

        if (
            direction == "descending"
            and second_point[1] < first_point[1]
        ):
            return (
                first_point,
                second_point
            )

    return None


def _select_smc_levels(
    primary_points,
    secondary_points,
    direction
):

    for primary_point in reversed(primary_points):

        secondary_point = _find_following_point(
            secondary_points,
            primary_point[0]
        )

        if secondary_point is None:
            continue

        if secondary_point[0] - primary_point[0] < 2:
            continue

        if direction == "bullish":
            return (
                primary_point,
                secondary_point
            )

        if direction == "bearish":
            return (
                primary_point,
                secondary_point
            )

    return None


def _find_following_point(
    points,
    minimum_index
):

    for point in reversed(points):

        if point[0] > minimum_index:
            return point

    return None


def _project_trendline(
    trendline,
    target_index
):

    start, end = trendline

    x1, y1 = start
    x2, y2 = end

    slope = (y2 - y1) / (x2 - x1)

    return y2 + slope * (target_index - x2)


def _is_bullish_rejection(
    current,
    previous
):

    body = max(
        abs(current["close"] - current["open"]),
        0.00001
    )
    lower_wick = (
        min(current["open"], current["close"])
        - current["low"]
    )

    return (
        current["close"] > current["open"]
        and lower_wick >= body
        and current["close"] >= (
            current["low"]
            + ((current["high"] - current["low"]) * 0.55)
        )
        and current["close"] > previous["close"]
    )


def _is_bullish_displacement(
    candle,
    break_level,
    atr
):

    candle_range = max(
        candle["high"] - candle["low"],
        0.00001
    )
    body = candle["close"] - candle["open"]
    close_strength = (
        candle["close"] - candle["low"]
    ) / candle_range

    return (
        candle["close"] > candle["open"]
        and candle["close"] > break_level
        and body >= (float(atr) * SMC_DISPLACEMENT_ATR)
        and (body / candle_range) >= SMC_MIN_BODY_RATIO
        and close_strength >= 0.70
    )


def _is_bearish_rejection(
    current,
    previous
):

    body = max(
        abs(current["close"] - current["open"]),
        0.00001
    )
    upper_wick = (
        current["high"]
        - max(current["open"], current["close"])
    )

    return (
        current["close"] < current["open"]
        and upper_wick >= body
        and current["close"] <= (
            current["low"]
            + ((current["high"] - current["low"]) * 0.45)
        )
        and current["close"] < previous["close"]
    )


def _is_bearish_displacement(
    candle,
    break_level,
    atr
):

    candle_range = max(
        candle["high"] - candle["low"],
        0.00001
    )
    body = candle["open"] - candle["close"]
    close_strength = (
        candle["high"] - candle["close"]
    ) / candle_range

    return (
        candle["close"] < candle["open"]
        and candle["close"] < break_level
        and body >= (float(atr) * SMC_DISPLACEMENT_ATR)
        and (body / candle_range) >= SMC_MIN_BODY_RATIO
        and close_strength >= 0.70
    )


def _extract_candle_time(df):

    if "time" not in df.columns:
        return None

    return _normalize_time_value(
        df["time"].iloc[-1]
    )


def _extract_row_time(row):

    if "time" not in row:
        return None

    return _normalize_time_value(row["time"])


def _normalize_time_value(value):

    if isinstance(value, pd.Timestamp):
        return int(value.timestamp())

    if hasattr(value, "item"):
        value = value.item()

    if isinstance(value, str):

        parsed = pd.to_datetime(
            value,
            errors="coerce"
        )

        if pd.notna(parsed):
            return int(parsed.timestamp())

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _claim_candle(
    symbol,
    strategy_id,
    candle_time
):

    key = (
        symbol,
        strategy_id
    )

    previous_time = LAST_EVALUATED_CANDLES.get(key)

    if previous_time == candle_time:
        return False

    LAST_EVALUATED_CANDLES[key] = candle_time

    return True
