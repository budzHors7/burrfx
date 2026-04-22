import math

import MetaTrader5 as mt5

from config import (
    INITIAL_BALANCE
)
from trading.debug_logger import log_event
from trading.trading_settings import (
    get_trading_settings
)


def _is_positive_number(value):

    return isinstance(
        value,
        (int, float)
    ) and value > 0


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
        if _is_positive_number(step)
        else (
            float(min_lot)
            if _is_positive_number(min_lot)
            else 0.01
        )
    )
    normalized_min_lot = (
        float(min_lot)
        if _is_positive_number(min_lot)
        else normalized_step
    )
    normalized_max_lot = (
        float(max_lot)
        if _is_positive_number(max_lot)
        else max(
            normalized_min_lot,
            float(volume)
        )
    )
    capped_volume = max(
        normalized_min_lot,
        min(
            normalized_max_lot,
            float(volume)
        )
    )
    stepped_volume = math.floor(
        (capped_volume + 1e-12)
        / normalized_step
    ) * normalized_step
    precision = _get_volume_precision(
        normalized_step
    )

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


def _resolve_sizing_balance(
    account_balance,
    account_equity=None,
    reference_deposit=None
):

    balance_reference = (
        float(account_balance)
        if _is_positive_number(account_balance)
        else None
    )
    equity_reference = (
        float(account_equity)
        if _is_positive_number(account_equity)
        else None
    )
    deposit_reference = (
        float(reference_deposit)
        if _is_positive_number(reference_deposit)
        else None
    )

    if deposit_reference is None:
        deposit_reference = (
            float(INITIAL_BALANCE)
            if _is_positive_number(INITIAL_BALANCE)
            else balance_reference
        )

    if (
        deposit_reference is not None
        and equity_reference is not None
    ):
        equity_multiplier = (
            equity_reference
            / deposit_reference
        )
        sizing_balance = (
            deposit_reference
            * equity_multiplier
        )

        return {
            "sizing_balance": sizing_balance,
            "deposit_reference": deposit_reference,
            "equity_reference": equity_reference,
            "equity_multiplier": equity_multiplier,
            "source": "deposit_adjusted_by_equity"
        }

    if equity_reference is not None:
        return {
            "sizing_balance": equity_reference,
            "deposit_reference": deposit_reference,
            "equity_reference": equity_reference,
            "equity_multiplier": None,
            "source": "equity_only"
        }

    if balance_reference is not None:
        return {
            "sizing_balance": balance_reference,
            "deposit_reference": deposit_reference,
            "equity_reference": None,
            "equity_multiplier": None,
            "source": "balance_only"
        }

    if deposit_reference is not None:
        return {
            "sizing_balance": deposit_reference,
            "deposit_reference": deposit_reference,
            "equity_reference": None,
            "equity_multiplier": None,
            "source": "deposit_only"
        }

    return {
        "sizing_balance": 0.0,
        "deposit_reference": None,
        "equity_reference": None,
        "equity_multiplier": None,
        "source": "no_valid_reference"
    }


def calculate_lot_size(
    symbol,
    atr,
    account_balance,
    account_equity=None,
    reference_deposit=None
):
    """
    Risk-based lot sizing
    """

    symbol_info = mt5.symbol_info(symbol)
    settings = get_trading_settings()

    if symbol_info is None:
        log_event(
            "lot_size_defaulted",
            level="warning",
            symbol=symbol,
            profile=settings["id"],
            reason="symbol_info_unavailable",
            fallback_lot=0.01
        )
        return 0.01

    tick_value = symbol_info.trade_tick_value
    tick_size = symbol_info.trade_tick_size
    min_lot = symbol_info.volume_min
    max_lot = symbol_info.volume_max
    step = symbol_info.volume_step

    if tick_value == 0 or tick_size == 0:
        log_event(
            "lot_size_defaulted",
            level="warning",
            symbol=symbol,
            profile=settings["id"],
            tick_value=tick_value,
            tick_size=tick_size,
            reason="invalid_tick_value_or_size",
            fallback_lot=0.01
        )
        return 0.01

    if settings["lot_mode"] == "min":
        final_lot = _normalize_volume(
            min_lot,
            min_lot,
            max_lot,
            step
        )

        log_event(
            "lot_size_calculated",
            symbol=symbol,
            atr=atr,
            account_balance=account_balance,
            account_equity=account_equity,
            deposit_reference=reference_deposit,
            profile=settings["id"],
            lot_mode=settings["lot_mode"],
            min_lot=min_lot,
            max_lot=max_lot,
            step=step,
            final_lot=final_lot
        )

        return final_lot

    # =========================
    # Risk amount
    # =========================

    sizing_context = _resolve_sizing_balance(
        account_balance,
        account_equity=account_equity,
        reference_deposit=reference_deposit
    )
    sizing_balance = sizing_context["sizing_balance"]

    if sizing_balance <= 0:
        log_event(
            "lot_size_defaulted",
            level="warning",
            symbol=symbol,
            profile=settings["id"],
            account_balance=account_balance,
            account_equity=account_equity,
            reference_deposit=reference_deposit,
            reason="invalid_sizing_balance",
            fallback_lot=0.01
        )
        return 0.01

    risk_amount = (
        sizing_balance
        * (settings["risk_percent"] / 100)
    )

    # =========================
    # Stop distance
    # =========================

    stop_distance = (
        atr
        * settings["sl_atr_multiplier"]
    )

    # Convert to ticks

    ticks = stop_distance / tick_size

    if ticks <= 0:
        log_event(
            "lot_size_defaulted",
            level="warning",
            symbol=symbol,
            profile=settings["id"],
            stop_distance=stop_distance,
            tick_size=tick_size,
            reason="zero_ticks",
            fallback_lot=0.01
        )
        return 0.01

    # =========================
    # Lot calculation
    # =========================

    lot = (
        risk_amount
        / (ticks * tick_value)
    )

    # =========================
    # Normalize lot
    # =========================

    final_lot = _normalize_volume(
        lot,
        min_lot,
        max_lot,
        step
    )

    log_event(
        "lot_size_calculated",
        symbol=symbol,
        atr=atr,
        account_balance=account_balance,
        account_equity=account_equity,
        deposit_reference=sizing_context["deposit_reference"],
        profile=settings["id"],
        lot_mode=settings["lot_mode"],
        sizing_source=sizing_context["source"],
        sizing_balance=sizing_balance,
        equity_multiplier=sizing_context["equity_multiplier"],
        risk_percent=settings["risk_percent"],
        risk_amount=risk_amount,
        sl_atr_multiplier=settings["sl_atr_multiplier"],
        stop_distance=stop_distance,
        ticks=ticks,
        min_lot=min_lot,
        max_lot=max_lot,
        step=step,
        final_lot=final_lot
    )

    return final_lot
