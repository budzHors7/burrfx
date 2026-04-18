import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime, timedelta, timezone

from config import (
    ATR_PERIOD,
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
from trading.news_provider import build_news_cycle_context
from trading.strategy_settings import get_strategy_settings
from trading.trade_manager import (
    calculate_atr,
    calculate_moving_averages,
    check_crossover
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
    "jobless claims",
    "claims",
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


def get_strategy_catalog():

    catalog = []
    configured_settings = get_strategy_settings()

    for strategy_id, defaults in DEFAULT_STRATEGIES.items():

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

        signal = check_crossover(working_df)

        if signal is not None:
            reason = (
                "Fast/slow moving average crossover."
            )

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
        "context": context
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

        event_id = event.get("id")

        if not event_id:
            continue

        if _news_signal_processed(
            symbol,
            event_id
        ):
            continue

        signal = _map_news_event_to_symbol(
            symbol,
            event
        )

        if signal is None:
            continue

        _mark_news_signal_processed(
            symbol,
            event_id
        )

        better_or_worse = (
            "better"
            if event["is_better_than_expected"]
            else "worse"
        )

        return (
            signal,
            (
                f"High impact {event['currency_code']} news "
                f"triggered by {event['name']} "
                f"({better_or_worse} than expected)."
            ),
            {
                "setup": "high_impact_news",
                "event_id": event_id,
                "event_name": event["name"],
                "currency_code": event["currency_code"],
                "event_time_utc": event["date_utc"],
                "actual": event["actual"],
                "consensus": event["consensus"],
                "previous": event["previous"],
                "is_better_than_expected": (
                    event["is_better_than_expected"]
                ),
                "provider": cycle_context.get(
                    "provider",
                    NEWS_PROVIDER
                )
            }
        )

    return None, None, {}


def _map_news_event_to_symbol(
    symbol,
    event
):

    better = event.get(
        "is_better_than_expected"
    )

    if better is None:
        return None

    cleaned_symbol = _clean_symbol(symbol)
    currency_code = event["currency_code"]

    pair = _extract_currency_pair(
        cleaned_symbol
    )

    if pair is not None:

        base_currency, quote_currency = pair

        if currency_code == base_currency:
            return "BUY" if better else "SELL"

        if currency_code == quote_currency:
            return "SELL" if better else "BUY"

        return None

    mapped_currency = INDEX_SYMBOL_NEWS_MAP.get(
        cleaned_symbol
    )

    if mapped_currency != currency_code:
        return None

    event_name = str(
        event.get("name", "")
    ).lower()

    if _contains_keyword(
        event_name,
        HAWKISH_EVENT_KEYWORDS
    ):
        return "SELL" if better else "BUY"

    if _contains_keyword(
        event_name,
        RISK_ON_EVENT_KEYWORDS
    ):
        return "BUY" if better else "SELL"

    return None


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

    value = df["time"].iloc[-1]

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
