import os
from datetime import datetime

import pandas as pd

try:
    import MetaTrader5 as mt5
except ModuleNotFoundError:  # pragma: no cover - depends on local setup
    mt5 = None

from logo import show_logo
from trading import broker_runtime, broker_settings, strategy_engine
from utils import clear_screen, pause

from .chart_exporter import save_equity_chart


DEFAULT_INITIAL_BALANCE = 10000.0
DEFAULT_BACKTEST_BARS = 500
MIN_BACKTEST_BARS = 50
MAX_BACKTEST_BARS = 10000


def list_data_files():

    files = [
        f for f in os.listdir("data")
        if f.endswith(".csv")
    ]

    return files


def backtest_menu():

    clear_screen()
    show_logo()

    print("BACKTEST MENU")
    print("=============\n")

    brokers = broker_settings.get_enabled_brokers()
    include_disabled = False

    if not brokers:
        print("No active brokers are enabled.")
        choice = input(
            "Backtest all configured brokers instead? [y/N]: "
        ).strip().lower()
        include_disabled = choice in ("y", "yes")

        if include_disabled:
            brokers = broker_settings.get_all_brokers()

    if not brokers:
        print("\nNo broker settings found.")
        pause()
        return

    print("Brokers:")

    for broker in brokers:
        print(
            f"- {broker['label']} "
            f"({len(broker_settings.get_enabled_symbol_entries(broker))} symbols)"
        )

    bars_input = input(
        f"\nBars per symbol [{DEFAULT_BACKTEST_BARS}]: "
    ).strip()
    bars = DEFAULT_BACKTEST_BARS if not bars_input else bars_input

    report = run_broker_backtest(
        {
            "broker_ids": [
                broker["id"]
                for broker in brokers
            ],
            "bars": bars,
            "include_disabled": include_disabled,
        }
    )

    print_backtest_report(report)
    pause()


def run_broker_backtest(
    payload=None,
    data_provider=None,
    initial_balance=DEFAULT_INITIAL_BALANCE
):

    payload = _normalize_backtest_payload(payload)
    brokers = _select_brokers(
        payload["broker_ids"],
        payload["include_disabled"]
    )
    report = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "bars_requested": payload["bars"],
        "include_disabled": payload["include_disabled"],
        "broker_ids": [
            broker["id"]
            for broker in brokers
        ],
        "summary": _empty_summary(),
        "brokers": []
    }

    for broker in brokers:
        broker_result = _backtest_broker(
            broker,
            payload["bars"],
            data_provider,
            initial_balance
        )
        report["brokers"].append(broker_result)

    report["summary"] = _summarize_report(report)

    return report


def run_backtest(filename):

    filepath = f"data/{filename}"
    df = pd.read_csv(filepath)
    equity = simulate_strategy(df)

    save_equity_chart(
        equity,
        filename
    )


def simulate_strategy(df):

    equity = [10000]
    balance = 10000

    for i in range(1, len(df)):
        change = df["close"].iloc[i] - df["close"].iloc[i - 1]
        balance += change
        equity.append(balance)

    return equity


def print_backtest_report(report):

    summary = report["summary"]

    print("\nBACKTEST RESULT")
    print("===============\n")
    print(f"Brokers: {summary['broker_count']}")
    print(f"Symbols: {summary['symbol_count']}")
    print(f"Strategies: {summary['strategy_count']}")
    print(f"Trades: {summary['trade_count']}")
    print(f"Net profit: {summary['net_profit']:.2f}")
    print(f"Win rate: {summary['win_rate']:.1f}%")

    for broker in report["brokers"]:
        print(f"\n{broker['label']}")

        for error in broker["errors"]:
            print(f"  Error: {error}")

        if not broker["symbols"]:
            print("  No symbols backtested.")
            continue

        for symbol in broker["symbols"]:
            for strategy in symbol["strategies"]:
                print(
                    "  "
                    f"{symbol['mt5']} | {strategy['name']} | "
                    f"{strategy['trade_count']} trades | "
                    f"{strategy['net_profit']:.2f} net"
                )


def _normalize_backtest_payload(payload):

    if payload is None:
        payload = {}

    if not isinstance(payload, dict):
        raise ValueError("Backtest payload must be a JSON object.")

    bars = _normalize_int(
        payload.get(
            "bars",
            DEFAULT_BACKTEST_BARS
        ),
        DEFAULT_BACKTEST_BARS
    )
    bars = min(
        max(bars, MIN_BACKTEST_BARS),
        MAX_BACKTEST_BARS
    )
    broker_ids = payload.get("broker_ids")

    if broker_ids in (None, "", []):
        broker_ids = []
    elif isinstance(broker_ids, str):
        broker_ids = [
            broker_ids
        ]
    elif not isinstance(broker_ids, list):
        raise ValueError("Backtest broker_ids must be a list.")

    normalized_broker_ids = [
        str(broker_id).strip()
        for broker_id in broker_ids
        if str(broker_id).strip()
    ]

    return {
        "broker_ids": normalized_broker_ids,
        "include_disabled": bool(
            payload.get(
                "include_disabled",
                False
            )
        ),
        "bars": bars
    }


def _select_brokers(
    broker_ids,
    include_disabled
):

    brokers = broker_settings.get_all_brokers()

    if broker_ids:
        requested = set(broker_ids)
        known = {
            broker["id"]
            for broker in brokers
        }
        unknown = sorted(requested - known)

        if unknown:
            raise ValueError(
                "Unknown broker: "
                + ", ".join(unknown)
            )

        brokers = [
            broker
            for broker in brokers
            if broker["id"] in requested
        ]

    if not include_disabled:
        brokers = [
            broker
            for broker in brokers
            if broker.get("enabled", False)
        ]

    return brokers


def _backtest_broker(
    broker,
    bars,
    data_provider,
    initial_balance
):

    result = {
        "id": broker["id"],
        "label": broker["label"],
        "enabled": bool(
            broker.get("enabled", False)
        ),
        "errors": [],
        "warnings": [],
        "symbols": []
    }
    validation = broker_settings.validate_broker_config(
        broker
    )
    result["warnings"].extend(
        validation.get("warnings", [])
    )

    if not validation.get("valid", False):
        result["errors"].extend(
            validation.get("errors", [])
        )

        if data_provider is None:
            return result

    if (
        broker_settings.broker_requires_strategy_pause(broker)
        and data_provider is None
    ):
        result["errors"].append(
            "No enabled strategy is configured for this broker."
        )
        return result

    initialized_mt5 = False

    try:
        if data_provider is None:
            _initialize_mt5_for_broker(broker)
            initialized_mt5 = True

        broker_runtime.set_active_broker(broker)
        strategies = strategy_engine.get_enabled_strategies()

        if not strategies:
            result["errors"].append(
                "No enabled strategies found for this broker."
            )
            return result

        for symbol in broker_settings.get_enabled_symbol_entries(broker):
            result["symbols"].append(
                _backtest_symbol(
                    broker,
                    symbol,
                    strategies,
                    bars,
                    data_provider,
                    initial_balance
                )
            )

    except Exception as exc:
        result["errors"].append(str(exc))

    finally:
        broker_runtime.clear_active_broker()

        if initialized_mt5 and mt5 is not None:
            mt5.shutdown()

    return result


def _backtest_symbol(
    broker,
    symbol,
    strategies,
    bars,
    data_provider,
    initial_balance
):

    symbol_result = {
        "canonical": symbol.get("canonical") or "",
        "mt5": symbol.get("mt5") or "",
        "strategies": []
    }

    for strategy in strategies:
        strategy_engine.LAST_EVALUATED_CANDLES.clear()
        strategy_result = _empty_strategy_result(
            strategy,
            initial_balance
        )

        try:
            df = _load_strategy_history(
                broker,
                symbol,
                strategy,
                bars,
                data_provider
            )
            strategy_result.update(
                _simulate_strategy_history(
                    symbol.get("mt5") or "",
                    strategy,
                    df,
                    initial_balance
                )
            )
        except Exception as exc:
            strategy_result["errors"].append(str(exc))

        symbol_result["strategies"].append(strategy_result)

    return symbol_result


def _load_strategy_history(
    broker,
    symbol,
    strategy,
    bars,
    data_provider
):

    if data_provider is not None:
        return _normalize_history_frame(
            data_provider(
                broker,
                symbol,
                strategy,
                bars
            )
        )

    if mt5 is None:
        raise RuntimeError(
            "MetaTrader5 is not installed in the active Python environment."
        )

    mt5_symbol = symbol.get("mt5")
    rates = mt5.copy_rates_from_pos(
        mt5_symbol,
        strategy["timeframe_code"],
        0,
        bars
    )

    if rates is None or len(rates) == 0:
        raise RuntimeError(
            f"No MT5 history returned for {mt5_symbol} "
            f"on {strategy['timeframe']}."
        )

    return _normalize_history_frame(
        pd.DataFrame(rates)
    )


def _simulate_strategy_history(
    symbol,
    strategy,
    df,
    initial_balance
):

    min_bars = min(
        max(
            _normalize_int(
                strategy.get("bars"),
                MIN_BACKTEST_BARS
            ),
            2
        ),
        len(df) - 1
    )

    if len(df) <= min_bars:
        raise RuntimeError(
            f"Not enough candles for {strategy['name']} "
            f"({len(df)} available)."
        )

    balance = float(initial_balance)
    trades = []
    equity = [
        balance
    ]

    for end_index in range(min_bars, len(df)):
        window = df.iloc[:end_index].copy()
        signal = strategy_engine.evaluate_strategy_signal(
            symbol,
            strategy,
            window,
            cycle_context={}
        )

        if not signal:
            continue

        exit_index = end_index

        if exit_index >= len(df):
            break

        entry_price = _numeric_value(
            signal.get("price"),
            window["close"].iloc[-1]
        )
        exit_price = _numeric_value(
            df["close"].iloc[exit_index],
            entry_price
        )
        direction = str(
            signal.get("signal") or ""
        ).upper()

        if direction == "BUY":
            profit = exit_price - entry_price
        elif direction == "SELL":
            profit = entry_price - exit_price
        else:
            continue

        balance += profit
        equity.append(balance)
        trades.append(
            {
                "time": _format_time_value(
                    window["time"].iloc[-1]
                ),
                "symbol": symbol,
                "strategy_id": strategy["id"],
                "strategy_name": strategy["name"],
                "direction": direction,
                "entry": round(entry_price, 5),
                "exit": round(exit_price, 5),
                "profit": round(profit, 5),
                "balance": round(balance, 5),
                "reason": signal.get("reason") or ""
            }
        )

    wins = [
        trade
        for trade in trades
        if trade["profit"] > 0
    ]
    net_profit = sum(
        trade["profit"]
        for trade in trades
    )

    return {
        "bars": len(df),
        "trade_count": len(trades),
        "net_profit": round(net_profit, 5),
        "win_rate": _percentage(
            len(wins),
            len(trades)
        ),
        "final_balance": round(balance, 5),
        "trades": trades[-100:],
        "equity": [
            round(value, 5)
            for value in equity[-200:]
        ]
    }


def _initialize_mt5_for_broker(broker):

    if mt5 is None:
        raise RuntimeError(
            "MetaTrader5 is not installed in the active Python environment."
        )

    terminal_path = str(
        broker.get("terminal_path") or ""
    ).strip()

    if not mt5.initialize(path=terminal_path):
        raise RuntimeError(
            "Failed to initialize MT5 for "
            f"{broker['label']}: {mt5.last_error()}"
        )

    account_error = _validate_connected_account(broker)

    if account_error is not None:
        mt5.shutdown()
        raise RuntimeError(account_error)


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


def _normalize_history_frame(df):

    if df is None:
        raise RuntimeError("No history data returned.")

    if not isinstance(df, pd.DataFrame):
        df = pd.DataFrame(df)

    required_columns = [
        "time",
        "open",
        "high",
        "low",
        "close"
    ]
    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise RuntimeError(
            "History data is missing columns: "
            + ", ".join(missing)
        )

    normalized = df[required_columns].copy()
    normalized = normalized.dropna(
        subset=[
            "open",
            "high",
            "low",
            "close"
        ]
    )
    normalized = normalized.sort_values("time").reset_index(drop=True)

    return normalized


def _empty_strategy_result(
    strategy,
    initial_balance
):

    return {
        "id": strategy["id"],
        "name": strategy["name"],
        "timeframe": strategy["timeframe"],
        "bars": 0,
        "trade_count": 0,
        "net_profit": 0.0,
        "win_rate": 0.0,
        "final_balance": float(initial_balance),
        "trades": [],
        "equity": [
            float(initial_balance)
        ],
        "errors": []
    }


def _summarize_report(report):

    summary = _empty_summary()
    summary["broker_count"] = len(report["brokers"])

    for broker in report["brokers"]:
        summary["symbol_count"] += len(broker["symbols"])

        for symbol in broker["symbols"]:
            summary["strategy_count"] += len(symbol["strategies"])

            for strategy in symbol["strategies"]:
                summary["trade_count"] += strategy["trade_count"]
                summary["net_profit"] += strategy["net_profit"]
                summary["_win_count"] += round(
                    strategy["trade_count"]
                    * strategy["win_rate"]
                    / 100
                )

    summary["net_profit"] = round(summary["net_profit"], 5)
    summary["win_rate"] = _percentage(
        summary.pop("_win_count"),
        summary["trade_count"]
    )

    return summary


def _empty_summary():

    return {
        "broker_count": 0,
        "symbol_count": 0,
        "strategy_count": 0,
        "trade_count": 0,
        "net_profit": 0.0,
        "win_rate": 0.0,
        "_win_count": 0
    }


def _normalize_int(value, fallback):

    try:
        return int(value)
    except (TypeError, ValueError):
        return int(fallback)


def _numeric_value(value, fallback):

    try:
        return float(value)
    except (TypeError, ValueError):
        return float(fallback)


def _percentage(part, whole):

    if not whole:
        return 0.0

    return round(
        (part / whole) * 100,
        2
    )


def _format_time_value(value):

    if isinstance(value, pd.Timestamp):
        return value.isoformat()

    try:
        numeric = int(value)

        if numeric > 10_000_000:
            return datetime.fromtimestamp(
                numeric
            ).isoformat(timespec="seconds")
    except (TypeError, ValueError, OSError):
        pass

    return str(value)
