# trading/trade_manager.py

import MetaTrader5 as mt5
import pandas as pd

from config import (
    FAST_MA,
    SLOW_MA,
    ATR_PERIOD,
    MAGIC_NUMBER,
    ORDER_DEVIATION
)
from trading.account_stats import update_profit
from trading.debug_logger import (
    log_event,
    log_mt5_error
)
from trading.journal import log_trade
from trading.pivot_points import get_daily_pivots
from trading.trading_settings import (
    get_trading_settings
)


# ===================================
# MOVING AVERAGES
# ===================================

def calculate_moving_averages(df):

    df["ma_fast"] = (
        df["close"]
        .rolling(FAST_MA)
        .mean()
    )

    df["ma_slow"] = (
        df["close"]
        .rolling(SLOW_MA)
        .mean()
    )

    return df


# ===================================
# ATR CALCULATION
# ===================================

def calculate_atr(df):

    df["high_low"] = df["high"] - df["low"]

    df["high_close"] = abs(
        df["high"] - df["close"].shift()
    )

    df["low_close"] = abs(
        df["low"] - df["close"].shift()
    )

    df["tr"] = df[
        ["high_low", "high_close", "low_close"]
    ].max(axis=1)

    df["atr"] = (
        df["tr"]
        .rolling(ATR_PERIOD)
        .mean()
    )

    return df


# ===================================
# CROSSOVER DETECTION
# ===================================

def check_crossover(df):

    if len(df) < SLOW_MA:
        return None

    prev = df.iloc[-2]
    curr = df.iloc[-1]

    if (
        prev["ma_fast"] <= prev["ma_slow"]
        and curr["ma_fast"] > curr["ma_slow"]
    ):
        return "BUY"

    if (
        prev["ma_fast"] >= prev["ma_slow"]
        and curr["ma_fast"] < curr["ma_slow"]
    ):
        return "SELL"

    return None


# ===================================
# TRAILING STOP USING ATR
# ===================================

def get_trailing_stop(
    order_type,
    price,
    atr,
    trail_factor=None
):

    if trail_factor is None:
        trail_factor = get_trading_settings()[
            "trail_factor"
        ]

    if order_type == "BUY":
        return price - (atr * trail_factor)

    return price + (atr * trail_factor)


# ===================================
# CHECK EXISTING POSITION
# ===================================

def _is_bot_position(position):

    comment = str(
        getattr(position, "comment", "") or ""
    ).upper()

    return (
        getattr(position, "magic", None)
        == MAGIC_NUMBER
        or comment.startswith("BURRFX")
    )


def has_open_position(symbol):

    positions = mt5.positions_get(symbol=symbol)

    if positions is None:
        log_mt5_error(
            "positions_get_failed",
            symbol=symbol
        )
        return False

    log_event(
        "positions_checked",
        symbol=symbol,
        open_position_count=len(positions),
        bot_open_position_count=len([
            position
            for position in positions
            if _is_bot_position(position)
        ])
    )

    return any(
        _is_bot_position(position)
        for position in positions
    )


# ===================================
# EXECUTE TRADE
# ===================================

def execute_trade(
    symbol,
    order_type,
    lot_size,
    price,
    atr,
    strategy_names=None,
    strategy_codes=None
):

    settings = get_trading_settings()

    log_event(
        "execute_trade_requested",
        symbol=symbol,
        order_type=order_type,
        lot_size=lot_size,
        price=price,
        atr=atr,
        profile=settings["id"],
        strategy_names=strategy_names or [],
        strategy_codes=strategy_codes or []
    )

    if has_open_position(symbol):

        print(f"{symbol}: Position already open")
        log_event(
            "execute_trade_skipped",
            level="warning",
            symbol=symbol,
            profile=settings["id"],
            reason="position_already_open"
        )
        return None

    if order_type == "BUY":
        sl = price - (
            atr
            * settings["sl_atr_multiplier"]
        )
        order_type_mt5 = mt5.ORDER_TYPE_BUY
    else:
        sl = price + (
            atr
            * settings["sl_atr_multiplier"]
        )
        order_type_mt5 = mt5.ORDER_TYPE_SELL

    tp = 0.0

    if settings["use_take_profit"]:
        pivots = get_daily_pivots(symbol)

        if pivots is None:
            print(f"{symbol}: Pivot unavailable")
            log_event(
                "execute_trade_skipped",
                level="warning",
                symbol=symbol,
                profile=settings["id"],
                reason="pivot_unavailable"
            )
            return None

        if order_type == "BUY":
            tp = pivots["R1"]

            if tp <= price:
                print("Invalid TP level")
                log_event(
                    "execute_trade_skipped",
                    level="warning",
                    symbol=symbol,
                    profile=settings["id"],
                    reason="invalid_buy_tp",
                    tp=tp,
                    price=price
                )
                return None
        else:
            tp = pivots["S1"]

            if tp >= price:
                print("Invalid TP level")
                log_event(
                    "execute_trade_skipped",
                    level="warning",
                    symbol=symbol,
                    profile=settings["id"],
                    reason="invalid_sell_tp",
                    tp=tp,
                    price=price
                )
                return None

        print(
            f"{symbol}: TP set to {tp:.5f}"
        )

    else:

        print(
            f"{symbol}: No TP for "
            f"{settings['label']}"
        )
        log_event(
            "execute_trade_without_take_profit",
            symbol=symbol,
            profile=settings["id"]
        )

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": lot_size,
        "type": order_type_mt5,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": ORDER_DEVIATION,
        "magic": MAGIC_NUMBER,
        "comment": _build_order_comment(strategy_codes),
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK
    }

    adjusted_lot = _fit_order_volume(
        symbol,
        request
    )

    if adjusted_lot is None:
        print(
            f"{symbol}: Lot too large to open safely"
        )
        log_event(
            "execute_trade_skipped",
            level="warning",
            symbol=symbol,
            profile=settings["id"],
            reason="volume_not_affordable",
            requested_lot=lot_size,
            sl=sl,
            tp=tp
        )
        return None

    if adjusted_lot != lot_size:
        print(
            f"{symbol}: Lot adjusted from "
            f"{lot_size} to {adjusted_lot}"
        )
        log_event(
            "execute_trade_volume_adjusted",
            symbol=symbol,
            profile=settings["id"],
            requested_lot=lot_size,
            adjusted_lot=adjusted_lot
        )

    request["volume"] = adjusted_lot

    log_event(
        "order_send_request",
        symbol=symbol,
        profile=settings["id"],
        request=request
    )

    result = mt5.order_send(request)

    if result is None:
        log_mt5_error(
            "order_send_failed",
            symbol=symbol,
            request=request
        )
        log_trade(
            symbol,
            order_type,
            adjusted_lot,
            price,
            sl,
            tp,
            0,
            "FAILED"
        )
        return None

    if result.retcode != mt5.TRADE_RETCODE_DONE:

        print(
            f"{symbol}: Trade failed:",
            result.retcode
        )

        log_event(
            "order_send_rejected",
            level="error",
            symbol=symbol,
            profile=settings["id"],
            request=request,
            result=result
        )
        log_mt5_error(
            "order_send_last_error",
            symbol=symbol
        )

        log_trade(
            symbol,
            order_type,
            adjusted_lot,
            price,
            sl,
            tp,
            0,
            "FAILED"
        )

        return None

    print(
        f"{symbol}: {order_type} executed"
    )

    log_event(
        "order_send_success",
        symbol=symbol,
        profile=settings["id"],
        request=request,
        result=result
    )

    log_trade(
        symbol,
        order_type,
        adjusted_lot,
        price,
        sl,
        tp,
        result.order,
        "EXECUTED"
    )

    return result.order


# ===================================
# PROFIT UPDATE
# ===================================

def update_trade_profit(
    order_type,
    entry_price,
    current_price,
    volume
):

    if order_type == "BUY":
        profit = (
            current_price
            - entry_price
        ) * volume
    else:
        profit = (
            entry_price
            - current_price
        ) * volume

    update_profit(profit)

    log_event(
        "trade_profit_updated",
        order_type=order_type,
        entry_price=entry_price,
        current_price=current_price,
        volume=volume,
        profit=profit
    )

    return profit


# ===================================
# Position Protection Management
# ===================================

def trail_positions(
    symbol,
    timeframe_code=mt5.TIMEFRAME_M15,
    timeframe_label="M15"
):

    settings = get_trading_settings()
    use_take_profit = settings[
        "use_take_profit"
    ]
    extend_take_profit = (
        settings["extend_take_profit"]
        and use_take_profit
    )
    use_break_even = settings[
        "use_break_even"
    ]
    use_trailing_stop = settings[
        "use_trailing_stop"
    ]

    positions = mt5.positions_get(symbol=symbol)

    if positions is None:
        log_mt5_error(
            "trail_positions_failed",
            symbol=symbol,
            reason="positions_unavailable"
        )
        return

    if len(positions) == 0:
        log_event(
            "trail_positions_skipped",
            symbol=symbol,
            profile=settings["id"],
            reason="no_open_positions"
        )
        return

    rates = mt5.copy_rates_from_pos(
        symbol,
        timeframe_code,
        0,
        50
    )

    if rates is None:
        log_mt5_error(
            "trail_positions_failed",
            symbol=symbol,
            reason="rates_unavailable",
            timeframe=timeframe_label
        )
        return

    df = pd.DataFrame(rates)
    df = calculate_atr(df)
    atr = df["atr"].iloc[-1]

    if pd.isna(atr):
        log_event(
            "trail_positions_skipped",
            level="warning",
            symbol=symbol,
            profile=settings["id"],
            reason="atr_unavailable",
            timeframe=timeframe_label
        )
        return

    symbol_info = mt5.symbol_info(symbol)

    if symbol_info is None:
        log_mt5_error(
            "trail_positions_failed",
            symbol=symbol,
            reason="symbol_info_unavailable"
        )
        return

    tick = mt5.symbol_info_tick(symbol)

    if tick is None:
        log_mt5_error(
            "trail_positions_failed",
            symbol=symbol,
            reason="tick_unavailable"
        )
        return

    point = float(
        getattr(symbol_info, "point", 0.0)
        or 0.0
    )
    digits = int(
        getattr(symbol_info, "digits", 5)
        or 5
    )
    min_stop_gap = max(
        point,
        float(
            getattr(
                symbol_info,
                "trade_stops_level",
                0
            )
            or 0
        ) * point
    )
    pivots = (
        get_daily_pivots(symbol)
        if use_take_profit
        else None
    )

    for pos in positions:

        if not _is_bot_position(pos):
            log_event(
                "trail_positions_skipped",
                symbol=symbol,
                ticket=pos.ticket,
                profile=settings["id"],
                reason="non_bot_position"
            )
            continue

        position_type = _get_position_type(pos)

        if position_type is None:
            log_event(
                "trail_positions_skipped",
                level="warning",
                symbol=symbol,
                ticket=pos.ticket,
                profile=settings["id"],
                reason="unsupported_position_type",
                position_type=pos.type
            )
            continue

        price = (
            tick.bid
            if position_type == "BUY"
            else tick.ask
        )
        desired_sl = pos.sl or 0.0
        desired_tp = pos.tp or 0.0
        reasons = []
        tp1 = None
        tp2 = None

        if (
            not use_take_profit
            and desired_tp > 0
        ):
            desired_tp = 0.0
            reasons.append("tp_removed")

        if (
            use_take_profit
            and pivots is not None
        ):
            tp1, tp2 = _get_pivot_targets(
                position_type,
                pivots
            )

            if not _pivot_targets_are_valid(
                position_type,
                pos.price_open,
                tp1,
                tp2
            ):
                log_event(
                    "trail_positions_pivot_targets_invalid",
                    level="warning",
                    symbol=symbol,
                    timeframe=timeframe_label,
                    ticket=pos.ticket,
                    position_type=position_type,
                    entry=pos.price_open,
                    tp1=tp1,
                    tp2=tp2,
                    profile=settings["id"]
                )
                tp1 = None
                tp2 = None

        if tp1 is not None:
            progress_to_tp1 = _calculate_progress_ratio(
                position_type,
                pos.price_open,
                price,
                tp1
            )

            if desired_tp <= 0:
                desired_tp = tp1
                reasons.append("tp_restored")

            if (
                use_break_even
                and progress_to_tp1
                >= settings[
                    "break_even_trigger_ratio"
                ]
            ):
                break_even_sl = _clamp_stop_loss(
                    position_type,
                    _build_break_even_stop(
                        position_type,
                        pos.price_open,
                        atr,
                        break_even_atr_buffer=(
                            settings[
                                "break_even_atr_buffer"
                            ]
                        )
                    ),
                    price,
                    min_stop_gap,
                    digits
                )
                improved_sl = _select_more_protective_stop(
                    position_type,
                    desired_sl,
                    break_even_sl
                )

                if _price_has_changed(
                    desired_sl,
                    improved_sl,
                    point
                ):
                    desired_sl = improved_sl
                    reasons.append("break_even")

            if (
                extend_take_profit
                and tp2 is not None
                and progress_to_tp1
                >= settings[
                    "tp_extension_trigger_ratio"
                ]
                and not _prices_match(
                    desired_tp,
                    tp2,
                    point
                )
            ):
                desired_tp = tp2
                reasons.append(
                    "tp_extended_to_tp2"
                )

            tp2_active = (
                extend_take_profit
                and tp2 is not None
                and _prices_match(
                    desired_tp,
                    tp2,
                    point
                )
            )

            if (
                use_trailing_stop
                and tp2_active
                and _has_cleared_level(
                    position_type,
                    price,
                    tp1,
                    atr * settings[
                        "tp1_lock_atr_buffer"
                    ]
                )
            ):
                profit_lock_sl = _clamp_stop_loss(
                    position_type,
                    tp1,
                    price,
                    min_stop_gap,
                    digits
                )
                improved_sl = _select_more_protective_stop(
                    position_type,
                    desired_sl,
                    profit_lock_sl
                )

                if _price_has_changed(
                    desired_sl,
                    improved_sl,
                    point
                ):
                    desired_sl = improved_sl
                    reasons.append(
                        "profit_locked_at_tp1"
                    )

                trailing_sl = _clamp_stop_loss(
                    position_type,
                    get_trailing_stop(
                        position_type,
                        price,
                        atr,
                        trail_factor=settings[
                            "trail_factor"
                        ]
                    ),
                    price,
                    min_stop_gap,
                    digits
                )
                improved_sl = _select_more_protective_stop(
                    position_type,
                    desired_sl,
                    trailing_sl
                )

                if _price_has_changed(
                    desired_sl,
                    improved_sl,
                    point
                ):
                    desired_sl = improved_sl
                    reasons.append(
                        "atr_trailing_after_tp2"
                    )

        else:
            desired_sl, fallback_reasons = (
                _apply_risk_distance_protection(
                    position_type=position_type,
                    entry_price=pos.price_open,
                    current_price=price,
                    current_sl=desired_sl,
                    atr=atr,
                    min_stop_gap=min_stop_gap,
                    digits=digits,
                    point=point,
                    use_break_even=use_break_even,
                    use_trailing_stop=use_trailing_stop,
                    break_even_trigger_ratio=(
                        settings[
                            "break_even_trigger_ratio"
                        ]
                    ),
                    break_even_atr_buffer=(
                        settings[
                            "break_even_atr_buffer"
                        ]
                    ),
                    trail_factor=settings[
                        "trail_factor"
                    ]
                )
            )
            reasons.extend(fallback_reasons)

        if not reasons:
            continue

        desired_sl = _normalize_price(
            desired_sl,
            digits
        )
        desired_tp = _normalize_price(
            desired_tp,
            digits
        )

        log_event(
            "position_protection_update_requested",
            symbol=symbol,
            timeframe=timeframe_label,
            ticket=pos.ticket,
            position_type=position_type,
            entry=pos.price_open,
            current_price=price,
            current_sl=pos.sl,
            current_tp=pos.tp,
            new_sl=desired_sl,
            new_tp=desired_tp,
            atr=atr,
            profile=settings["id"],
            reasons=reasons,
            tp1=tp1,
            tp2=tp2
        )

        modify_position(
            pos,
            new_sl=desired_sl,
            new_tp=desired_tp,
            reason=",".join(reasons)
        )


# ===================================
# MODIFY POSITION TARGETS
# ===================================

def modify_position(
    position,
    new_sl=None,
    new_tp=None,
    reason="position_update"
):

    symbol_info = mt5.symbol_info(
        position.symbol
    )

    if symbol_info is None:
        log_mt5_error(
            "modify_position_failed",
            ticket=position.ticket,
            symbol=position.symbol,
            reason="symbol_info_unavailable"
        )
        return False

    digits = int(
        getattr(symbol_info, "digits", 5)
        or 5
    )
    point = float(
        getattr(symbol_info, "point", 0.0)
        or 0.0
    )
    final_sl = (
        position.sl
        if new_sl is None
        else _normalize_price(
            new_sl,
            digits
        )
    )
    final_tp = (
        position.tp
        if new_tp is None
        else _normalize_price(
            new_tp,
            digits
        )
    )

    if (
        not _price_has_changed(
            position.sl,
            final_sl,
            point
        )
        and not _price_has_changed(
            position.tp,
            final_tp,
            point
        )
    ):
        return False

    request = {
        "action": mt5.TRADE_ACTION_SLTP,
        "symbol": position.symbol,
        "position": position.ticket,
        "sl": final_sl,
        "tp": final_tp
    }

    log_event(
        "modify_position_request",
        ticket=position.ticket,
        symbol=position.symbol,
        reason=reason,
        previous_sl=position.sl,
        previous_tp=position.tp,
        new_sl=final_sl,
        new_tp=final_tp,
        request=request
    )

    result = mt5.order_send(request)

    if result is None:
        log_mt5_error(
            "modify_position_failed",
            ticket=position.ticket,
            symbol=position.symbol,
            new_sl=final_sl,
            new_tp=final_tp
        )
        return False

    if result.retcode != mt5.TRADE_RETCODE_DONE:

        print(
            f"Position update failed: {position.ticket}"
        )

        log_event(
            "modify_position_rejected",
            level="error",
            ticket=position.ticket,
            symbol=position.symbol,
            reason=reason,
            new_sl=final_sl,
            new_tp=final_tp,
            result=result
        )
        log_mt5_error(
            "modify_position_last_error",
            ticket=position.ticket,
            symbol=position.symbol
        )

    else:

        print(
            f"Position protected: {position.ticket}"
        )

        log_event(
            "modify_position_success",
            ticket=position.ticket,
            symbol=position.symbol,
            reason=reason,
            new_sl=final_sl,
            new_tp=final_tp,
            result=result
        )

        return True

    return False


def modify_stop(position, new_sl):

    return modify_position(
        position,
        new_sl=new_sl,
        reason="stop_update"
    )


def _get_position_type(position):

    if position.type == mt5.POSITION_TYPE_BUY:
        return "BUY"

    if position.type == mt5.POSITION_TYPE_SELL:
        return "SELL"

    return None


def _get_pivot_targets(
    position_type,
    pivots
):

    if position_type == "BUY":
        return pivots["R1"], pivots["R2"]

    return pivots["S1"], pivots["S2"]


def _pivot_targets_are_valid(
    position_type,
    entry_price,
    tp1,
    tp2
):

    if tp1 is None or tp2 is None:
        return False

    if position_type == "BUY":
        return (
            tp1 > entry_price
            and tp2 > tp1
        )

    return (
        tp1 < entry_price
        and tp2 < tp1
    )


def _calculate_progress_ratio(
    position_type,
    entry_price,
    current_price,
    target_price
):

    total_distance = abs(
        target_price - entry_price
    )

    if total_distance <= 0:
        return 0.0

    if position_type == "BUY":
        progress = (
            current_price - entry_price
        ) / total_distance
    else:
        progress = (
            entry_price - current_price
        ) / total_distance

    return max(progress, 0.0)


def _build_break_even_stop(
    position_type,
    entry_price,
    atr,
    break_even_atr_buffer=None
):

    if break_even_atr_buffer is None:
        break_even_atr_buffer = (
            get_trading_settings()[
                "break_even_atr_buffer"
            ]
        )

    buffer_distance = (
        atr * break_even_atr_buffer
    )

    if position_type == "BUY":
        return entry_price + buffer_distance

    return entry_price - buffer_distance


def _has_cleared_level(
    position_type,
    current_price,
    level_price,
    buffer_distance=0.0
):

    if position_type == "BUY":
        return current_price >= (
            level_price + buffer_distance
        )

    return current_price <= (
        level_price - buffer_distance
    )


def _clamp_stop_loss(
    position_type,
    desired_stop,
    current_price,
    min_stop_gap,
    digits
):

    if desired_stop is None:
        return None

    if position_type == "BUY":
        desired_stop = min(
            desired_stop,
            current_price - min_stop_gap
        )
    else:
        desired_stop = max(
            desired_stop,
            current_price + min_stop_gap
        )

    return _normalize_price(
        desired_stop,
        digits
    )


def _select_more_protective_stop(
    position_type,
    current_sl,
    candidate_sl
):

    if candidate_sl is None:
        return current_sl

    if not current_sl:
        return candidate_sl

    if position_type == "BUY":
        return max(
            current_sl,
            candidate_sl
        )

    return min(
        current_sl,
        candidate_sl
    )


def _stop_is_secured(
    position_type,
    current_sl,
    entry_price,
    point
):

    if not current_sl:
        return False

    if position_type == "BUY":
        return current_sl >= (
            entry_price - point
        )

    return current_sl <= (
        entry_price + point
    )


def _price_has_changed(
    current_price,
    new_price,
    point
):

    return not _prices_match(
        current_price,
        new_price,
        point
    )


def _prices_match(
    left_price,
    right_price,
    point
):

    return abs(
        float(left_price or 0.0)
        - float(right_price or 0.0)
    ) <= max(point * 2, 1e-9)


def _normalize_price(
    price,
    digits
):

    return round(
        float(price or 0.0),
        digits
    )


def _get_volume_precision(step):

    normalized_step = (
        f"{float(step):.8f}"
        .rstrip("0")
        .rstrip(".")
    )

    if "." not in normalized_step:
        return 0

    return len(
        normalized_step.split(".")[1]
    )


def _normalize_volume(
    volume,
    min_lot,
    max_lot,
    step
):

    normalized_step = (
        float(step)
        if float(step or 0.0) > 0
        else (
            float(min_lot)
            if float(min_lot or 0.0) > 0
            else 0.01
        )
    )
    normalized_min_lot = (
        float(min_lot)
        if float(min_lot or 0.0) > 0
        else normalized_step
    )
    normalized_max_lot = max(
        (
            float(max_lot)
            if float(max_lot or 0.0) > 0
            else normalized_min_lot
        ),
        normalized_min_lot
    )
    precision = _get_volume_precision(
        normalized_step
    )
    capped_volume = max(
        normalized_min_lot,
        min(
            normalized_max_lot,
            float(volume)
        )
    )
    stepped_volume = int(
        (capped_volume + 1e-12)
        / normalized_step
    ) * normalized_step

    return round(
        max(
            normalized_min_lot,
            min(
                normalized_max_lot,
                stepped_volume
            )
        ),
        precision
    )


def _reduce_volume(
    volume,
    min_lot,
    step
):

    precision = _get_volume_precision(step)
    reduced_volume = round(
        float(volume) - float(step),
        precision
    )

    if reduced_volume + 1e-9 < float(min_lot):
        return None

    return reduced_volume


def _volumes_match(
    left_volume,
    right_volume,
    step
):

    return abs(
        float(left_volume or 0.0)
        - float(right_volume or 0.0)
    ) <= max(float(step) / 2.0, 1e-9)


def _fit_order_volume(
    symbol,
    request
):

    symbol_info = mt5.symbol_info(symbol)

    if symbol_info is None:
        log_mt5_error(
            "order_volume_check_failed",
            symbol=symbol,
            reason="symbol_info_unavailable"
        )
        return None

    min_lot = float(
        getattr(symbol_info, "volume_min", 0.01)
        or 0.01
    )
    max_lot = float(
        getattr(symbol_info, "volume_max", min_lot)
        or min_lot
    )
    step = float(
        getattr(symbol_info, "volume_step", min_lot)
        or min_lot
    )
    requested_volume = float(
        request.get("volume", min_lot)
        or min_lot
    )
    candidate_volume = _normalize_volume(
        requested_volume,
        min_lot,
        max_lot,
        step
    )
    attempts = 0
    last_retcode = None
    last_comment = None

    while candidate_volume is not None:

        check_request = request.copy()
        check_request["volume"] = candidate_volume
        check_result = mt5.order_check(
            check_request
        )
        attempts += 1

        if (
            check_result is not None
            and check_result.retcode
            == mt5.TRADE_RETCODE_DONE
        ):
            return candidate_volume

        if check_result is None:
            error_code, error_message = (
                mt5.last_error()
            )
            last_retcode = error_code
            last_comment = error_message
        else:
            last_retcode = getattr(
                check_result,
                "retcode",
                None
            )
            last_comment = getattr(
                check_result,
                "comment",
                None
            )

        next_volume = _reduce_volume(
            candidate_volume,
            min_lot,
            step
        )

        if (
            next_volume is None
            or _volumes_match(
                candidate_volume,
                next_volume,
                step
            )
        ):
            break

        candidate_volume = next_volume

    log_event(
        "order_volume_check_failed",
        level="warning",
        symbol=symbol,
        requested_volume=requested_volume,
        min_lot=min_lot,
        max_lot=max_lot,
        step=step,
        attempts=attempts,
        last_retcode=last_retcode,
        last_comment=last_comment
    )

    return None


def _apply_risk_distance_protection(
    position_type,
    entry_price,
    current_price,
    current_sl,
    atr,
    min_stop_gap,
    digits,
    point,
    use_break_even,
    use_trailing_stop,
    break_even_trigger_ratio,
    break_even_atr_buffer,
    trail_factor
):

    desired_sl = current_sl
    reasons = []
    break_even_applied = False
    risk_distance = abs(
        float(entry_price or 0.0)
        - float(current_sl or 0.0)
    )

    if risk_distance <= point:
        return desired_sl, reasons

    if position_type == "BUY":
        break_even_target = (
            entry_price + risk_distance
        )
    else:
        break_even_target = (
            entry_price - risk_distance
        )

    if use_break_even:
        progress_to_break_even = (
            _calculate_progress_ratio(
                position_type,
                entry_price,
                current_price,
                break_even_target
            )
        )

        if (
            progress_to_break_even
            >= break_even_trigger_ratio
        ):
            break_even_sl = _clamp_stop_loss(
                position_type,
                _build_break_even_stop(
                    position_type,
                    entry_price,
                    atr,
                    break_even_atr_buffer=(
                        break_even_atr_buffer
                    )
                ),
                current_price,
                min_stop_gap,
                digits
            )
            improved_sl = _select_more_protective_stop(
                position_type,
                desired_sl,
                break_even_sl
            )

            if _price_has_changed(
                desired_sl,
                improved_sl,
                point
            ):
                desired_sl = improved_sl
                reasons.append("break_even")
                break_even_applied = True

    if (
        use_trailing_stop
        and not break_even_applied
        and _stop_is_secured(
            position_type,
            desired_sl,
            entry_price,
            point
        )
    ):
        trailing_sl = _clamp_stop_loss(
            position_type,
            get_trailing_stop(
                position_type,
                current_price,
                atr,
                trail_factor=trail_factor
            ),
            current_price,
            min_stop_gap,
            digits
        )
        improved_sl = _select_more_protective_stop(
            position_type,
            desired_sl,
            trailing_sl
        )

        if _price_has_changed(
            desired_sl,
            improved_sl,
            point
        ):
            desired_sl = improved_sl
            reasons.append(
                "atr_trailing_fallback"
            )

    return desired_sl, reasons


def _build_order_comment(strategy_codes=None):

    if not strategy_codes:
        return "BURRFX AUTO"

    compact_codes = [
        str(code).upper()
        for code in strategy_codes
        if code
    ]

    if not compact_codes:
        return "BURRFX AUTO"

    return (
        "BURRFX:"
        + "+".join(compact_codes)
    )[:31]
