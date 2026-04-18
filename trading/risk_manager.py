import MetaTrader5 as mt5

from config import (
    INITIAL_BALANCE,
    RISK_PERCENT,
    SL_ATR_MULTIPLIER
)
from trading.debug_logger import log_event


def _is_positive_number(value):

    return isinstance(
        value,
        (int, float)
    ) and value > 0


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

    if symbol_info is None:
        log_event(
            "lot_size_defaulted",
            level="warning",
            symbol=symbol,
            reason="symbol_info_unavailable",
            fallback_lot=0.01
        )
        return 0.01

    tick_value = symbol_info.trade_tick_value
    tick_size = symbol_info.trade_tick_size

    if tick_value == 0 or tick_size == 0:
        log_event(
            "lot_size_defaulted",
            level="warning",
            symbol=symbol,
            tick_value=tick_value,
            tick_size=tick_size,
            reason="invalid_tick_value_or_size",
            fallback_lot=0.01
        )
        return 0.01

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
            account_balance=account_balance,
            account_equity=account_equity,
            reference_deposit=reference_deposit,
            reason="invalid_sizing_balance",
            fallback_lot=0.01
        )
        return 0.01

    risk_amount = (
        sizing_balance
        * (RISK_PERCENT / 100)
    )

    # =========================
    # Stop distance
    # =========================

    stop_distance = (
        atr
        * SL_ATR_MULTIPLIER
    )

    # Convert to ticks

    ticks = stop_distance / tick_size

    if ticks == 0:
        log_event(
            "lot_size_defaulted",
            level="warning",
            symbol=symbol,
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

    min_lot = symbol_info.volume_min
    max_lot = symbol_info.volume_max
    step = symbol_info.volume_step

    lot = max(min_lot, lot)
    lot = min(max_lot, lot)

    lot = round(
        lot / step
    ) * step

    final_lot = round(lot, 2)

    log_event(
        "lot_size_calculated",
        symbol=symbol,
        atr=atr,
        account_balance=account_balance,
        account_equity=account_equity,
        deposit_reference=sizing_context["deposit_reference"],
        sizing_source=sizing_context["source"],
        sizing_balance=sizing_balance,
        equity_multiplier=sizing_context["equity_multiplier"],
        risk_amount=risk_amount,
        stop_distance=stop_distance,
        ticks=ticks,
        min_lot=min_lot,
        max_lot=max_lot,
        step=step,
        final_lot=final_lot
    )

    return final_lot
