from datetime import datetime
import time
import MetaTrader5 as mt5
import pandas as pd
import os

try:
    import keyboard
except ModuleNotFoundError:
    keyboard = None

from .risk_manager import calculate_lot_size
from utils import clear_screen, pause
from logo import show_logo
from .account import get_account_info
from config import (
    ENABLE_DAILY_LOCK,
    INITIAL_BALANCE,
    SYMBOLS
)
from .account_stats import get_stats
from .trade_manager import (
    execute_trade,
    execute_trade_batch
)
from .candle_sync import wait_for_new_candle
from .trade_manager import trail_positions
from .daily_risk_manager import (
    reset_daily_if_needed,
    update_daily_profit,
    check_daily_limits,
    is_trading_locked,
    get_daily_profit,
    get_daily_limits
)
from .market_filters import (
    market_is_safe,
    is_market_open,
    is_rollover_time,
    is_within_sessions,
    get_session_symbols,
    get_reference_symbol,
    get_active_session_label
)
from trading.debug_logger import log_event, log_mt5_error
from trading.broker_runtime import (
    get_symbol_metadata,
    set_active_broker,
    clear_active_broker
)
from trading.broker_settings import (
    broker_requires_strategy_pause
)
from trading.symbol_logger import log_symbol
from trading.strategy_engine import (
    build_strategy_cycle_context,
    evaluate_strategy_signal,
    get_enabled_strategies,
    get_slowest_enabled_strategy_timeframe,
    get_slowest_enabled_strategy_timeframe_label,
    get_strategy_cycle_timeframe,
    get_strategy_cycle_timeframe_label,
    get_strategy_overview_lines
)
from trading.trading_settings import (
    get_trading_profile_label
)


def _notify_status(
    status_callback=None,
    **payload
):

    if status_callback is None:
        return

    try:
        status_callback(payload)
    except Exception:
        return


def _should_stop(stop_event=None):

    return (
        stop_event is not None
        and stop_event.is_set()
    )


def _sleep_with_stop(
    seconds,
    stop_event=None
):

    if stop_event is None:
        time.sleep(seconds)
        return False

    return stop_event.wait(timeout=seconds)


def _keyboard_quit_requested():

    if keyboard is None:
        return False

    try:
        return keyboard.is_pressed("q")
    except Exception as exc:
        log_event(
            "keyboard_input_unavailable",
            level="warning",
            error=str(exc)
        )
        return False


def _build_runtime_result(
    status,
    reason,
    message
):

    return {
        "status": status,
        "reason": reason,
        "message": message
    }


def get_symbol_data(
    symbol,
    timeframe_code,
    timeframe_label,
    bars
):

    symbol_meta = get_symbol_metadata(symbol)

    if not mt5.symbol_select(symbol, True):
        log_mt5_error(
            "symbol_select_failed",
            level="warning",
            symbol=symbol,
            canonical_symbol=symbol_meta["canonical"],
            mt5_symbol=symbol_meta["mt5"]
        )

    rates = mt5.copy_rates_from_pos(
        symbol,
        timeframe_code,
        1,
        bars
    )

    if rates is None:
        log_mt5_error(
            "symbol_rates_unavailable",
            symbol=symbol,
            canonical_symbol=symbol_meta["canonical"],
            mt5_symbol=symbol_meta["mt5"],
            timeframe=timeframe_label,
            bars=bars,
            start_pos=1
        )
        return None

    df = pd.DataFrame(rates)

    return df

def process_symbol(
    symbol,
    cycle_context=None
):

    symbol_meta = get_symbol_metadata(symbol)
    strategies = get_enabled_strategies()

    if not strategies:
        log_event(
            "process_symbol_skipped",
            level="warning",
            symbol=symbol,
            canonical_symbol=symbol_meta["canonical"],
            mt5_symbol=symbol_meta["mt5"],
            reason="no_enabled_strategies"
        )
        return

    signals = []

    for strategy in strategies:

        log_symbol(
            symbol,
            (
                f"Checking {strategy['name']} "
                f"on {strategy['timeframe']}"
            )
        )

        df = get_symbol_data(
            symbol,
            strategy["timeframe_code"],
            strategy["timeframe"],
            strategy["bars"]
        )

        if df is None or df.empty:
            log_event(
                "process_symbol_skipped",
            level="warning",
            symbol=symbol,
            canonical_symbol=symbol_meta["canonical"],
            mt5_symbol=symbol_meta["mt5"],
            strategy=strategy["id"],
            reason="no_market_data"
            )
            continue

        signal = evaluate_strategy_signal(
            symbol,
            strategy,
            df,
            cycle_context=cycle_context
        )

        if signal is not None:
            signals.append(signal)

    if not signals:
        log_event(
            "signal_not_found",
        symbol=symbol,
        canonical_symbol=symbol_meta["canonical"],
        mt5_symbol=symbol_meta["mt5"],
        strategies=[
                strategy["id"]
                for strategy in strategies
            ]
        )
        return

    news_signals = [
        signal
        for signal in signals
        if signal["id"] == "high_impact_news"
    ]

    if news_signals:
        signals = news_signals

    buy_signals = [
        signal
        for signal in signals
        if signal["signal"] == "BUY"
    ]
    sell_signals = [
        signal
        for signal in signals
        if signal["signal"] == "SELL"
    ]

    if buy_signals and sell_signals:

        print(
            f"{symbol}: Conflicting strategy signals. "
            f"Skipping entry."
        )

        log_event(
            "strategy_signal_conflict",
            level="warning",
            symbol=symbol,
            buy_strategies=[
                signal["id"]
                for signal in buy_signals
            ],
            sell_strategies=[
                signal["id"]
                for signal in sell_signals
            ]
        )
        return

    aligned_signals = (
        buy_signals
        if buy_signals
        else sell_signals
    )

    lead_signal = max(
        aligned_signals,
        key=lambda item: item["timeframe_seconds"]
    )

    signal = lead_signal["signal"]
    price = lead_signal["price"]
    atr = lead_signal["atr"]
    strategy_names = [
        item["name"]
        for item in aligned_signals
    ]
    strategy_codes = [
        item["comment_code"]
        for item in aligned_signals
    ]
    strategy_reasons = [
        item["reason"]
        for item in aligned_signals
        if item["reason"]
    ]
    try:
        trades_per_signal = max(
            int(
                lead_signal.get(
                    "trades_per_signal",
                    1
                )
            ),
            1
        )
    except (TypeError, ValueError):
        trades_per_signal = 1
    execution_overrides = lead_signal.get(
        "execution_overrides",
        {}
    )

    account = mt5.account_info()

    if account is None:
        print("Account error")
        log_mt5_error(
            "process_symbol_account_error",
            symbol=symbol,
            canonical_symbol=symbol_meta["canonical"],
            mt5_symbol=symbol_meta["mt5"]
        )
        return None

    balance = account.balance
    equity = account.equity

    lot_size = calculate_lot_size(
        symbol,
        atr,
        balance,
        account_equity=equity,
        reference_deposit=INITIAL_BALANCE
    )

    print(
        f"{symbol}: {signal} signal detected "
        f"from {', '.join(strategy_names)}"
    )
    print(
        f"{symbol}: "
        f"Lead TF={lead_signal['timeframe']} "
        f"Lot={lot_size} "
        f"ATR={atr:.5f}"
    )

    log_event(
        "signal_detected",
        symbol=symbol,
        canonical_symbol=symbol_meta["canonical"],
        mt5_symbol=symbol_meta["mt5"],
        signal=signal,
        price=price,
        atr=atr,
        balance=balance,
        equity=equity,
        lot_size=lot_size,
        strategies=strategy_names,
        strategy_codes=strategy_codes,
        trades_per_signal=trades_per_signal,
        execution_overrides=execution_overrides,
        signal_context=lead_signal.get("context", {}),
        recommended_timeframes=[
            signal_item["recommended_timeframes"]
            for signal_item in aligned_signals
        ],
        reasons=strategy_reasons
    )

    if trades_per_signal > 1:
        tickets = execute_trade_batch(
            symbol,
            signal,
            lot_size,
            price,
            atr,
            trade_count=trades_per_signal,
            settings_overrides=execution_overrides,
            strategy_names=strategy_names,
            strategy_codes=strategy_codes
        )
        log_event(
            "signal_trade_batch_result",
            symbol=symbol,
            canonical_symbol=symbol_meta["canonical"],
            mt5_symbol=symbol_meta["mt5"],
            requested_trade_count=trades_per_signal,
            opened_trade_count=len(tickets),
            tickets=tickets,
            execution_overrides=execution_overrides
        )
    else:
        execute_trade(
            symbol,
            signal,
            lot_size,
            price,
            atr,
            strategy_names=strategy_names,
            strategy_codes=strategy_codes,
            settings_overrides=execution_overrides
        )


def start_live_trading(
    interactive=True,
    initialize_mt5=True,
    shutdown_mt5=True,
    stop_event=None,
    status_callback=None,
    broker_context=None
):

    mt5_initialized = False
    previous_profile_env = os.environ.get(
        "BURRFX_TRADING_PROFILE"
    )
    try:

        if broker_context is not None:
            set_active_broker(broker_context)
            os.environ["BURRFX_TRADING_PROFILE"] = (
                broker_context.get(
                    "trading_profile",
                    "regular_risk"
                )
            )

        log_event(
            "live_trading_start_requested",
            broker_context=broker_context
        )
        _notify_status(
            status_callback,
            phase="starting",
            detail="Preparing live trading runtime."
        )

        if (
            broker_context is not None
            and broker_requires_strategy_pause(broker_context)
        ):
            return _build_runtime_result(
                "paused",
                "broker_strategy_paused",
                (
                    f"{broker_context['label']} paused: "
                    "no enabled broker strategy configured."
                )
            )

        enabled_strategies = get_enabled_strategies()

        if not enabled_strategies:
            print("No enabled strategies found in config.")
            log_event(
                "live_trading_stopped",
                level="warning",
                reason="no_enabled_strategies"
            )
            _notify_status(
                status_callback,
                phase="not_started",
                detail="No enabled strategies found in config."
            )
            if interactive:
                pause()
            return _build_runtime_result(
                "error",
                "no_enabled_strategies",
                "No enabled strategies found in config."
            )

        if (
            initialize_mt5
            and not _initialize_mt5_for_broker(
                broker_context
            )
        ):

            print("MT5 initialization failed")
            log_mt5_error("mt5_initialize_failed")
            _notify_status(
                status_callback,
                phase="error",
                detail="MT5 initialization failed."
            )
            if interactive:
                pause()
            return _build_runtime_result(
                "error",
                "mt5_initialize_failed",
                "MT5 initialization failed."
            )

        mt5_initialized = initialize_mt5

        account_validation_error = (
            _validate_broker_account(
                broker_context
            )
        )

        if account_validation_error is not None:
            print(account_validation_error)
            log_event(
                "broker_account_validation_failed",
                level="error",
                error=account_validation_error
            )
            return _build_runtime_result(
                "error",
                "broker_account_mismatch",
                account_validation_error
            )

        if interactive:
            print("MT5 Connected")
        log_event(
            "mt5_initialize_success",
            terminal_info=mt5.terminal_info(),
            account_info=mt5.account_info()
        )
        log_event(
            "strategy_engine_loaded",
            strategies=[
                {
                    "id": strategy["id"],
                    "name": strategy["name"],
                    "timeframe": strategy["timeframe"],
                    "recommended_timeframes": (
                        strategy["recommended_timeframes"]
                    )
                }
                for strategy in enabled_strategies
            ],
            cycle_timeframe=get_strategy_cycle_timeframe_label()
        )
        _notify_status(
            status_callback,
            phase="starting",
            detail=(
                "MT5 connected. Waiting for the first trading cycle."
            )
        )

        # Wait for first candle sync
        reference_symbol = get_reference_symbol() or SYMBOLS[0]
        log_event(
            "initial_trading_cycle_wait",
            reference_symbol=reference_symbol
        )

        new_candle = wait_for_next_trading_cycle(
            reference_symbol,
            interactive=interactive,
            stop_event=stop_event,
            status_callback=status_callback
        )

        if (
            new_candle is None
            and _should_stop(stop_event)
        ):
            return _build_runtime_result(
                "stopped",
                "stop_requested",
                "Live trading stopped before the first cycle."
            )

        while not _should_stop(stop_event):

            if interactive:
                clear_screen()
                show_logo()

            acc = get_account_info()

            if acc is None:

                print("Failed to get account info")
                log_event(
                    "live_trading_stopped",
                    level="error",
                    reason="account_info_unavailable"
                )
                _notify_status(
                    status_callback,
                    phase="error",
                    detail="Failed to get account info."
                )
                if interactive:
                    pause()
                return _build_runtime_result(
                    "error",
                    "account_info_unavailable",
                    "Failed to get account info."
                )
            
            # =========================
            # DAILY CHECK
            # =========================

            reset_daily_if_needed()

            update_daily_profit()

            if check_daily_limits():

                print(
                    f"Trading locked. "
                    f"Today's PnL: "
                    f"{get_daily_profit():.2f}"
                )

                log_event(
                    "live_trading_paused_daily_limit",
                    daily_profit=get_daily_profit()
                )
                _notify_status(
                    status_callback,
                    phase="daily_limit_locked",
                    detail=(
                        "Trading is locked by daily limits."
                    ),
                    daily_profit=get_daily_profit(),
                    account_number=acc.get("login"),
                    server=acc.get("server")
                )

                if _sleep_with_stop(
                    60,
                    stop_event=stop_event
                ):
                    return _build_runtime_result(
                        "stopped",
                        "stop_requested",
                        "Live trading stopped while daily lock was active."
                    )

                continue

            # =========================
            # DISPLAY DASHBOARD
            # =========================

            stats = get_stats()

            pause_reason = get_trading_pause_reason()

            if pause_reason is not None:

                log_event(
                    "live_trading_pause_detected",
                    reason=pause_reason
                )
                if not wait_while_trading_paused(
                    acc=acc,
                    stats=stats,
                    interactive=interactive,
                    stop_event=stop_event,
                    status_callback=status_callback
                ):
                    return _build_runtime_result(
                        "stopped",
                        "stop_requested",
                        "Live trading stopped while trading was paused."
                    )
                new_candle = wait_for_next_trading_cycle(
                    reference_symbol,
                    interactive=interactive,
                    stop_event=stop_event,
                    status_callback=status_callback
                )
                if (
                    new_candle is None
                    and _should_stop(stop_event)
                ):
                    return _build_runtime_result(
                        "stopped",
                        "stop_requested",
                        "Live trading stopped while waiting for the next cycle."
                    )
                continue

            log_event(
                "trading_cycle_started",
                account=acc,
                daily_profit=get_daily_profit()
            )
            _notify_status(
                status_callback,
                phase="processing_new_candle",
                detail="Scanning symbols and managing trades.",
                daily_profit=get_daily_profit(),
                account_number=acc.get("login"),
                server=acc.get("server"),
                broker=(
                    None
                    if broker_context is None
                    else broker_context.get("id")
                )
            )

            if interactive:
                display_dashboard(
                    acc=acc,
                    stats=stats,
                    phase_label="PROCESSING NEW CANDLE",
                    phase_detail="Scanning symbols and managing trades."
                )

            active_symbols = get_session_symbols()
            cycle_context = build_strategy_cycle_context()

            if not active_symbols:

                log_event(
                    "trading_cycle_skipped",
                    level="warning",
                    reason="no_active_session_symbols"
                )
                _notify_status(
                    status_callback,
                    phase="idle",
                    detail=(
                        "No active session symbols. Waiting for the next cycle."
                    ),
                    daily_profit=get_daily_profit(),
                    account_number=acc.get("login"),
                    server=acc.get("server"),
                    active_symbols=[]
                )

                new_candle = wait_for_next_trading_cycle(
                    get_reference_symbol() or reference_symbol
                    ,
                    interactive=interactive,
                    stop_event=stop_event,
                    status_callback=status_callback
                )
                if (
                    new_candle is None
                    and _should_stop(stop_event)
                ):
                    return _build_runtime_result(
                        "stopped",
                        "stop_requested",
                        "Live trading stopped while idle."
                    )
                continue

            reference_symbol = active_symbols[0]

            log_event(
                "trading_cycle_symbols_selected",
                session=get_active_session_label(),
                symbols=active_symbols
            )
            _notify_status(
                status_callback,
                phase="processing_symbols",
                detail="Processing active session symbols.",
                daily_profit=get_daily_profit(),
                account_number=acc.get("login"),
                server=acc.get("server"),
                active_symbols=active_symbols,
                session_label=get_active_session_label()
            )

            # ===================================
            # PROCESS ALL SYMBOLS ON NEW CANDLE
            # ===================================

            for symbol in active_symbols:

                if _should_stop(stop_event):
                    return _build_runtime_result(
                        "stopped",
                        "stop_requested",
                        "Live trading stopped during symbol processing."
                    )

                print(f"Processing {symbol}")
                symbol_meta = get_symbol_metadata(symbol)
                log_event(
                    "symbol_processing_started",
                    symbol=symbol,
                    canonical_symbol=symbol_meta["canonical"],
                    mt5_symbol=symbol_meta["mt5"]
                )

                if is_trading_locked():

                    print(
                        f"{symbol}: Trading locked."
                    )

                    log_event(
                        "symbol_processing_stopped",
                        level="warning",
                        symbol=symbol,
                        canonical_symbol=symbol_meta["canonical"],
                        mt5_symbol=symbol_meta["mt5"],
                        reason="trading_locked"
                    )

                    return _build_runtime_result(
                        "stopped",
                        "trading_locked",
                        "Live trading stopped because trading is locked."
                    )

                _notify_status(
                    status_callback,
                    phase="processing_symbol",
                    detail=f"Processing {symbol}.",
                    current_symbol=symbol,
                    daily_profit=get_daily_profit(),
                    account_number=acc.get("login"),
                    server=acc.get("server"),
                    active_symbols=active_symbols,
                    session_label=get_active_session_label()
                )

                if market_is_safe(symbol):

                    process_symbol(
                        symbol,
                        cycle_context=cycle_context
                    )

                else:

                    print(
                        f"{symbol}: Skipped (market unsafe)"
                    )

                    log_event(
                        "symbol_processing_skipped",
                        level="warning",
                        symbol=symbol,
                        canonical_symbol=symbol_meta["canonical"],
                        mt5_symbol=symbol_meta["mt5"],
                        reason="market_unsafe"
                    )

                # Apply trailing stop
                trail_positions(
                    symbol,
                    timeframe_code=(
                        get_slowest_enabled_strategy_timeframe()
                    ),
                    timeframe_label=(
                        get_slowest_enabled_strategy_timeframe_label()
                    )
                )

            if (
                interactive
                and _keyboard_quit_requested()
            ):

                print("Returning to menu...")
                log_event("live_trading_return_to_menu_requested")

                time.sleep(1)

                return _build_runtime_result(
                    "stopped",
                    "keyboard_stop",
                    "Live trading stopped from the terminal."
                )

            # Wait for next candle
            new_candle = wait_for_next_trading_cycle(
                reference_symbol,
                interactive=interactive,
                stop_event=stop_event,
                status_callback=status_callback
            )

            if (
                new_candle is None
                and _should_stop(stop_event)
            ):
                return _build_runtime_result(
                    "stopped",
                    "stop_requested",
                    "Live trading stopped while waiting for the next cycle."
                )
            
    except KeyboardInterrupt:

        if interactive:
            clear_screen()
            print("Stopping live trading...")
        log_event("live_trading_stopped_by_keyboard_interrupt")
        time.sleep(1)
        return _build_runtime_result(
            "stopped",
            "keyboard_interrupt",
            "Live trading stopped by keyboard interrupt."
        )

    finally:

        if (
            mt5_initialized
            and shutdown_mt5
        ):
            log_event("mt5_shutdown_requested")
            mt5.shutdown()
            log_event("mt5_shutdown_complete")

        if broker_context is not None:
            clear_active_broker()
            if previous_profile_env is None:
                os.environ.pop(
                    "BURRFX_TRADING_PROFILE",
                    None
                )
            else:
                os.environ["BURRFX_TRADING_PROFILE"] = (
                    previous_profile_env
                )

    return _build_runtime_result(
        "stopped",
        "stop_requested",
        "Live trading stopped."
    )


def _initialize_mt5_for_broker(broker_context):

    if broker_context is None:
        return mt5.initialize()

    return mt5.initialize(
        path=broker_context["terminal_path"]
    )


def _validate_broker_account(broker_context):

    if broker_context is None:
        return None

    account = mt5.account_info()

    if account is None:
        return "MT5 account info unavailable."

    expected_login = broker_context.get(
        "expected_login"
    )
    expected_server = str(
        broker_context.get("expected_server") or ""
    ).strip()

    if (
        expected_login not in ("", None)
        and int(expected_login) != int(account.login)
    ):
        return (
            f"Connected login {account.login} does not "
            f"match expected login {expected_login}."
        )

    if (
        expected_server
        and expected_server != str(account.server)
    ):
        return (
            f"Connected server {account.server} does not "
            f"match expected server {expected_server}."
        )

    return None


def get_trading_pause_reason():

    if not is_market_open(verbose=False):
        return "Market closed."

    if is_rollover_time(verbose=False):
        return "Rollover protection active."

    if not is_within_sessions(verbose=False):
        return "Outside trading session."

    return None


def wait_while_trading_paused(
    acc=None,
    stats=None,
    interactive=True,
    stop_event=None,
    status_callback=None
):

    pause_reason = get_trading_pause_reason()

    if pause_reason is None:
        return True

    log_event(
        "trading_paused",
        reason=pause_reason
    )

    while True:

        if _should_stop(stop_event):
            return False

        pause_reason = get_trading_pause_reason()

        if pause_reason is None:
            log_event("trading_resumed")
            return True

        if acc is None:
            acc = get_account_info()

        update_daily_profit()

        _notify_status(
            status_callback,
            phase="trading_paused",
            detail=(
                f"{pause_reason} "
                f"Trading is idle until conditions allow trading again."
            ),
            daily_profit=get_daily_profit(),
            account_number=(
                None if acc is None else acc.get("login")
            ),
            server=(
                None if acc is None else acc.get("server")
            ),
            active_symbols=get_session_symbols(verbose=False),
            session_label=get_active_session_label()
        )

        if interactive:
            display_dashboard(
                acc=acc,
                stats=stats or get_stats(),
                phase_label="TRADING PAUSED",
                phase_detail=(
                    f"{pause_reason} "
                    f"Trading is idle until conditions allow trading again."
                )
            )

        if _sleep_with_stop(
            1,
            stop_event=stop_event
        ):
            return False
        acc = None
        stats = None


def wait_for_next_trading_cycle(
    reference_symbol,
    interactive=True,
    stop_event=None,
    status_callback=None
):

    while True:

        if _should_stop(stop_event):
            return None

        if not wait_while_trading_paused(
            interactive=interactive,
            stop_event=stop_event,
            status_callback=status_callback
        ):
            return None

        active_reference_symbol = (
            get_reference_symbol()
            or reference_symbol
        )
        cycle_timeframe_label = (
            get_strategy_cycle_timeframe_label()
        )

        new_candle = wait_for_new_candle(
            active_reference_symbol,
            timeframe=get_strategy_cycle_timeframe(),
            timeframe_label=cycle_timeframe_label,
            render_callback=lambda remaining_seconds: (
                render_waiting_dashboard(
                    remaining_seconds,
                    interactive=interactive,
                    status_callback=status_callback
                )
            ),
            interrupt_condition=lambda: (
                get_trading_pause_reason() is not None
                or _should_stop(stop_event)
            )
        )

        if _should_stop(stop_event):
            return None

        if new_candle is not None:
            log_event(
                "trading_cycle_ready",
                reference_symbol=active_reference_symbol,
                candle_time=new_candle
            )
            return new_candle


def render_waiting_dashboard(
    remaining_seconds,
    phase_label=None,
    phase_detail="Monitoring the account while the next candle forms.",
    interactive=True,
    status_callback=None
):

    if phase_label is None:
        phase_label = (
            "WAITING FOR NEW "
            f"{get_strategy_cycle_timeframe_label()} "
            "CANDLE"
        )

    acc = get_account_info()

    if acc is None:
        _notify_status(
            status_callback,
            phase="waiting_for_account",
            detail="Waiting for account info...",
            countdown_seconds=remaining_seconds
        )
        if interactive:
            clear_screen()
            show_logo()
            print("LIVE TRADING DASHBOARD")
            print("=======================\n")
            print("Waiting for account info...")
        return

    update_daily_profit()

    pause_reason = get_trading_pause_reason()

    if (
        pause_reason is not None
        and phase_label == (
            "WAITING FOR NEW "
            f"{get_strategy_cycle_timeframe_label()} "
            "CANDLE"
        )
    ):
        phase_label = "TRADING PAUSED"
        phase_detail = (
            f"{pause_reason} "
            f"Waiting for the next candle before rechecking."
        )

    _notify_status(
        status_callback,
        phase=(
            "trading_paused"
            if phase_label == "TRADING PAUSED"
            else "waiting_for_new_candle"
        ),
        detail=phase_detail,
        countdown_seconds=remaining_seconds,
        daily_profit=get_daily_profit(),
        account_number=acc.get("login"),
        server=acc.get("server"),
        active_symbols=get_session_symbols(verbose=False),
        session_label=get_active_session_label()
    )

    if interactive:
        display_dashboard(
            acc=acc,
            stats=get_stats(),
            phase_label=phase_label,
            countdown_seconds=remaining_seconds,
            phase_detail=phase_detail
        )


def display_dashboard(
    acc=None,
    stats=None,
    phase_label=None,
    phase_detail=None,
    countdown_seconds=None
):

    if acc is None:
        acc = get_account_info()

    if acc is None:
        return

    balance = acc.get("balance", 0)
    equity = acc.get("equity", 0)
    profit = acc.get("profit", 0)
    margin = acc.get("margin", 0)
    free_margin = acc.get("free_margin", 0)
    login = acc.get("login", "N/A")
    server = acc.get("server", "N/A")
    daily = get_daily_profit()
    daily_limits = get_daily_limits()
    daily_limits_enabled = (
        ENABLE_DAILY_LOCK
        and bool(daily_limits.get("enabled"))
    )
    remaining = None
    loss_buffer = None

    if daily_limits_enabled:
        remaining = daily_limits["target"] - daily
        loss_buffer = daily - daily_limits["max_loss"]
    stats = stats or get_stats()
    realized_profit = stats.get("profit", 0)
    realized_loss = stats.get("loss", 0)
    realized_net = realized_profit + realized_loss
    now = datetime.now()
    market_active = get_trading_pause_reason() is None
    session_status = get_active_session_label()
    active_symbols = get_session_symbols(verbose=False)
    strategy_lines = get_strategy_overview_lines()
    trading_profile = get_trading_profile_label()
    from trading.broker_runtime import (
        get_active_broker_label
    )
    broker_label = get_active_broker_label()
    trade_status = (
        "LOCKED"
        if is_trading_locked()
        else "ACTIVE"
        if market_active
        else "PAUSED"
    )

    clear_screen()
    show_logo()

    print("LIVE TRADING DASHBOARD")
    print("=======================\n")

    print(f"Account: {login}")
    print(f"Server: {server}\n")
    print(f"Balance: {balance:.2f}")
    print(f"Equity: {equity:.2f}")
    print(f"Floating PnL: {profit:.2f}")
    print(f"Margin: {margin:.2f}")
    print(f"Free Margin: {free_margin:.2f}")
    print(f"\nRealized Profit: +{realized_profit:.2f}")
    print(f"Realized Loss: {realized_loss:.2f}")
    print(f"Realized Net: {realized_net:.2f}")
    print(f"\nDaily PnL: {daily:.2f}")

    if daily_limits_enabled:
        print(f"Target Remaining: {remaining:.2f}")
        print(f"Loss Buffer: {loss_buffer:.2f}")

    print(f"\nSTATUS: {trade_status}")
    if broker_label:
        print(f"Broker: {broker_label}")
    print(f"Profile: {trading_profile}")
    print(f"Session: {session_status}")
    print(f"Symbols: {', '.join(active_symbols) if active_symbols else 'None'}")
    print(
        "Engine Cycle: "
        f"{get_strategy_cycle_timeframe_label()}"
    )
    print(f"Time: {now.strftime('%H:%M:%S')}")

    if strategy_lines:
        print("\nEnabled Strategies:")
        for line in strategy_lines:
            print(f"- {line}")

    if phase_label:
        print(f"\n{phase_label}")
        print("=" * len(phase_label))

    if countdown_seconds is not None:
        minutes = countdown_seconds // 60
        seconds = countdown_seconds % 60
        print(f"Next candle in: {minutes:02d}:{seconds:02d}")

    if phase_detail:
        print(phase_detail)

    print("\nPress CTRL+C to return to menu")
