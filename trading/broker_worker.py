import argparse
import os
import time

import MetaTrader5 as mt5

from logo import show_logo
from trading.account import get_account_info
from trading.broker_runtime import (
    set_active_broker,
    clear_active_broker
)
from trading.broker_settings import (
    broker_requires_strategy_pause,
    get_broker,
    get_enabled_symbol_entries,
    validate_broker_config
)
from trading.debug_logger import (
    init_debug_logger,
    log_event,
    log_mt5_error
)
from trading.journal import init_trade_log
from trading.live_trader import start_live_trading
from utils import clear_screen


def main():

    parser = argparse.ArgumentParser(
        description="Run one BurrFx broker worker."
    )
    parser.add_argument(
        "--broker",
        required=True,
        help="Broker id from broker_settings.json"
    )
    args = parser.parse_args()

    init_debug_logger()
    init_trade_log()

    broker = get_broker(args.broker)
    set_active_broker(broker)
    os.environ["BURRFX_TRADING_PROFILE"] = broker.get(
        "trading_profile",
        "regular_risk"
    )

    try:
        return _run_worker(broker)
    finally:
        clear_active_broker()


def _run_worker(broker):

    validation = validate_broker_config(broker)

    if not validation["valid"]:
        _print_validation_errors(
            broker,
            validation
        )
        log_event(
            "broker_worker_validation_failed",
            level="error",
            broker=broker["id"],
            validation=validation
        )
        return 1

    if broker_requires_strategy_pause(broker):
        return _run_paused_deriv_worker(broker)

    return _run_trading_worker(broker)


def _run_trading_worker(broker):

    result = start_live_trading(
        broker_context=broker,
        interactive=True,
        initialize_mt5=True,
        shutdown_mt5=True
    )

    log_event(
        "broker_worker_finished",
        broker=broker["id"],
        result=result
    )

    return 0


def _run_paused_deriv_worker(broker):

    initialized = False

    try:
        if not mt5.initialize(
            path=broker["terminal_path"]
        ):
            print("MT5 initialization failed")
            log_mt5_error(
                "broker_worker_mt5_initialize_failed",
                broker=broker["id"],
                terminal_path=broker["terminal_path"]
            )
            return 1

        initialized = True

        account_error = _validate_connected_account(
            broker
        )

        if account_error is not None:
            print(account_error)
            log_event(
                "broker_worker_account_validation_failed",
                level="error",
                broker=broker["id"],
                error=account_error
            )
            return 1

        log_event(
            "deriv_worker_paused",
            broker=broker["id"],
            reason="no_synthetic_strategy_config"
        )

        while True:
            _render_deriv_paused_dashboard(broker)
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nStopping Deriv worker...")
        log_event(
            "deriv_worker_stopped_by_keyboard_interrupt",
            broker=broker["id"]
        )
        return 0
    finally:
        if initialized:
            mt5.shutdown()


def _validate_connected_account(broker):

    account = mt5.account_info()

    if account is None:
        return "MT5 account info unavailable."

    expected_login = broker.get("expected_login")
    expected_server = str(
        broker.get("expected_server") or ""
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


def _render_deriv_paused_dashboard(broker):

    account = get_account_info()
    symbols = get_enabled_symbol_entries(broker)

    clear_screen()
    show_logo()

    print(f"{broker['label'].upper()} BROKER WORKER")
    print("=" * (len(broker["label"]) + 14))
    print()

    if account is None:
        print("Account: unavailable")
    else:
        print(f"Account: {account.get('login', 'N/A')}")
        print(f"Server: {account.get('server', 'N/A')}")
        print(f"Balance: {account.get('balance', 0):.2f}")
        print(f"Equity: {account.get('equity', 0):.2f}")
        print(f"Free Margin: {account.get('free_margin', 0):.2f}")

    print("\nSTATUS: PAUSED")
    print(
        "Deriv paused: no synthetic strategy config enabled."
    )
    print(
        "Configured symbols: "
        + (
            ", ".join(
                symbol["mt5"]
                for symbol in symbols
            )
            if symbols
            else "None"
        )
    )
    print("\nPress CTRL+C to stop this broker worker.")


def _print_validation_errors(
    broker,
    validation
):

    clear_screen()
    show_logo()

    print(f"{broker['label']} broker is not ready.")
    print()

    for error in validation["errors"]:
        print(f"Error: {error}")

    for warning in validation["warnings"]:
        print(f"Warning: {warning}")


if __name__ == "__main__":
    raise SystemExit(main())
