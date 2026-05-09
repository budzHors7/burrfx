import json
import os

from config import (
    BROKER_SETTINGS_FILE,
    DAILY_TARGET,
    ENABLE_DAILY_LOCK,
    MAX_DAILY_LOSS
)
from logo import show_logo
from trading.debug_logger import log_event
from trading.strategy_settings import (
    broker_strategy_config_has_enabled_strategy,
    get_default_broker_strategy_settings,
    get_enabled_broker_strategy_names
)
from utils import clear_screen, pause


SETTINGS_FILE = BROKER_SETTINGS_FILE
DEFAULT_DAILY_LIMITS = {
    "enabled": bool(ENABLE_DAILY_LOCK),
    "target": float(DAILY_TARGET),
    "max_loss": float(MAX_DAILY_LOSS)
}
BROKER_ORDER = [
    "exness",
    "deriv"
]
DEFAULT_SETTINGS = {
    "brokers": {
        "exness": {
            "enabled": False,
            "label": "Exness",
            "terminal_path": "",
            "expected_login": None,
            "expected_server": "",
            "trading_profile": "regular_risk",
            "daily_limits": DEFAULT_DAILY_LIMITS.copy(),
            "symbols": [
                {
                    "canonical": "EURUSD",
                    "mt5": "EURUSDm",
                    "enabled": True
                },
                {
                    "canonical": "GBPUSD",
                    "mt5": "GBPUSDm",
                    "enabled": True
                },
                {
                    "canonical": "USDJPY",
                    "mt5": "USDJPYm",
                    "enabled": True
                },
                {
                    "canonical": "USTEC",
                    "mt5": "USTECm",
                    "enabled": True
                },
                {
                    "canonical": "US30",
                    "mt5": "US30m",
                    "enabled": True
                },
                {
                    "canonical": "DE30",
                    "mt5": "DE30m",
                    "enabled": True
                },
                {
                    "canonical": "XAUUSD",
                    "mt5": "XAUUSDm",
                    "enabled": True
                }
            ]
        },
        "deriv": {
            "enabled": False,
            "label": "Deriv",
            "terminal_path": "",
            "expected_login": None,
            "expected_server": "",
            "trading_profile": "regular_risk",
            "max_spread_points": 25000,
            "daily_limits": DEFAULT_DAILY_LIMITS.copy(),
            "symbols": [
                {
                    "canonical": "BOOM1000",
                    "mt5": "Boom 1000 Index",
                    "enabled": True
                },
                {
                    "canonical": "CRASH1000",
                    "mt5": "Crash 1000 Index",
                    "enabled": True
                }
            ],
            "strategy_settings": get_default_broker_strategy_settings(
                "deriv"
            )
        }
    }
}


def load_broker_settings():

    if not os.path.exists(SETTINGS_FILE):
        save_broker_settings(DEFAULT_SETTINGS)
        return _clone_settings(DEFAULT_SETTINGS)

    try:
        with open(
            SETTINGS_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            loaded = json.load(file)

    except (
        json.JSONDecodeError,
        OSError
    ) as exc:
        log_event(
            "broker_settings_load_failed",
            level="error",
            path=SETTINGS_FILE,
            error=str(exc)
        )
        return _clone_settings(DEFAULT_SETTINGS)

    return _normalize_settings(loaded)


def save_broker_settings(settings):

    os.makedirs(
        os.path.dirname(SETTINGS_FILE),
        exist_ok=True
    )

    with open(
        SETTINGS_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            settings,
            file,
            indent=2
        )

    log_event(
        "broker_settings_saved",
        path=SETTINGS_FILE
    )


def get_broker(broker_id):

    settings = load_broker_settings()
    brokers = settings.get("brokers", {})
    broker = brokers.get(broker_id)

    if broker is None:
        raise ValueError(
            f"Unknown broker: {broker_id}"
        )

    return _prepare_broker(
        broker_id,
        broker
    )


def get_all_brokers():

    settings = load_broker_settings()
    brokers = settings.get("brokers", {})
    ordered = []

    for broker_id in BROKER_ORDER:

        if broker_id in brokers:
            ordered.append(
                _prepare_broker(
                    broker_id,
                    brokers[broker_id]
                )
            )

    for broker_id, broker in brokers.items():

        if broker_id in BROKER_ORDER:
            continue

        ordered.append(
            _prepare_broker(
                broker_id,
                broker
            )
        )

    return ordered


def get_enabled_brokers():

    return [
        broker
        for broker in get_all_brokers()
        if broker.get("enabled", False)
    ]


def get_broker_display_label(broker):

    if not isinstance(broker, dict):
        return "Broker"

    broker_id = str(
        broker.get("id") or ""
    ).strip()
    label = str(
        broker.get("label") or ""
    ).strip()

    if label and not label.isdigit():
        return label

    default_label = (
        DEFAULT_SETTINGS
        .get("brokers", {})
        .get(broker_id, {})
        .get("label")
    )

    if default_label:
        return default_label

    if broker_id:
        return broker_id.replace("_", " ").title()

    return "Broker"


def set_broker_enabled(
    broker_id,
    enabled
):

    settings = load_broker_settings()
    brokers = settings.setdefault(
        "brokers",
        {}
    )

    if broker_id not in brokers:
        raise ValueError(
            f"Unknown broker: {broker_id}"
        )

    brokers[broker_id]["enabled"] = bool(enabled)
    save_broker_settings(settings)

    log_event(
        "broker_enabled_updated",
        broker_id=broker_id,
        enabled=bool(enabled)
    )


def set_broker_connection_config(
    broker_id,
    config_updates
):

    if not isinstance(config_updates, dict):
        raise ValueError(
            "Broker connection config must be an object."
        )

    settings = load_broker_settings()
    brokers = settings.setdefault(
        "brokers",
        {}
    )

    if broker_id not in brokers:
        raise ValueError(
            f"Unknown broker: {broker_id}"
        )

    broker = brokers[broker_id]

    if "label" in config_updates:
        label = str(
            config_updates.get("label") or ""
        ).strip()

        if not label:
            raise ValueError("Broker label cannot be empty.")

        broker["label"] = label

    if "terminal_path" in config_updates:
        broker["terminal_path"] = str(
            config_updates.get("terminal_path") or ""
        ).strip()

    if "expected_login" in config_updates:
        broker["expected_login"] = _normalize_expected_login(
            config_updates.get("expected_login")
        )

    if "expected_server" in config_updates:
        broker["expected_server"] = str(
            config_updates.get("expected_server") or ""
        ).strip()

    save_broker_settings(settings)

    log_event(
        "broker_connection_config_updated",
        broker_id=broker_id,
        terminal_path=broker.get("terminal_path") or "",
        expected_login=broker.get("expected_login"),
        expected_server=broker.get("expected_server") or ""
    )

    return _prepare_broker(
        broker_id,
        broker
    )


def set_broker_daily_limits(
    broker_id,
    daily_limits
):

    settings = load_broker_settings()
    brokers = settings.setdefault(
        "brokers",
        {}
    )

    if broker_id not in brokers:
        raise ValueError(
            f"Unknown broker: {broker_id}"
        )

    normalized_limits = normalize_daily_limits(
        daily_limits
    )
    brokers[broker_id]["daily_limits"] = (
        normalized_limits
    )
    save_broker_settings(settings)

    log_event(
        "broker_daily_limits_updated",
        broker_id=broker_id,
        daily_limits=normalized_limits
    )

    return normalized_limits


def get_broker_daily_limits(broker=None):

    if broker is None:
        return normalize_daily_limits()

    return normalize_daily_limits(
        broker.get("daily_limits")
    )


def set_broker_strategy_trade_count(
    broker_id,
    strategy_id,
    trade_count
):

    settings = load_broker_settings()
    brokers = settings.setdefault(
        "brokers",
        {}
    )

    if broker_id not in brokers:
        raise ValueError(
            f"Unknown broker: {broker_id}"
        )

    broker = brokers[broker_id]
    strategies = broker.setdefault(
        "strategy_settings",
        {}
    )

    if strategy_id not in strategies:
        raise ValueError(
            f"Unknown broker strategy: {strategy_id}"
        )

    strategy = strategies[strategy_id]

    if not isinstance(strategy, dict):
        raise ValueError(
            f"Broker strategy {strategy_id} must be an object."
        )

    max_positions = _normalize_strategy_int(
        strategy.get("max_positions_per_symbol"),
        default=5,
        minimum=1,
        maximum=25
    )
    strategy["max_positions_per_symbol"] = max_positions
    strategy["trades_per_signal"] = _normalize_strategy_int(
        trade_count,
        default=strategy.get("trades_per_signal", 1),
        minimum=1,
        maximum=max_positions
    )
    save_broker_settings(settings)

    log_event(
        "broker_strategy_trade_count_updated",
        broker_id=broker_id,
        strategy_id=strategy_id,
        trades_per_signal=strategy["trades_per_signal"],
        max_positions_per_symbol=max_positions
    )

    return strategy.copy()


def set_broker_strategy_trade_mode(
    broker_id,
    strategy_id,
    trade_mode
):

    settings = load_broker_settings()
    brokers = settings.setdefault(
        "brokers",
        {}
    )

    if broker_id not in brokers:
        raise ValueError(
            f"Unknown broker: {broker_id}"
        )

    broker = brokers[broker_id]
    strategies = broker.setdefault(
        "strategy_settings",
        {}
    )

    if strategy_id not in strategies:
        raise ValueError(
            f"Unknown broker strategy: {strategy_id}"
        )

    strategy = strategies[strategy_id]

    if not isinstance(strategy, dict):
        raise ValueError(
            f"Broker strategy {strategy_id} must be an object."
        )

    strategy["trade_mode"] = _normalize_deriv_trade_mode(
        trade_mode
    )
    save_broker_settings(settings)

    log_event(
        "broker_strategy_trade_mode_updated",
        broker_id=broker_id,
        strategy_id=strategy_id,
        trade_mode=strategy["trade_mode"]
    )

    return strategy.copy()


def normalize_daily_limits(daily_limits=None):

    normalized = DEFAULT_DAILY_LIMITS.copy()

    if daily_limits is None:
        return normalized

    if not isinstance(daily_limits, dict):
        raise ValueError(
            "Daily limits must be an object."
        )

    if "enabled" in daily_limits:
        normalized["enabled"] = bool(
            daily_limits["enabled"]
        )

    if "target" in daily_limits:
        normalized["target"] = _normalize_money_limit(
            daily_limits["target"],
            "Daily target",
            must_be_positive=True
        )

    if "daily_target" in daily_limits:
        normalized["target"] = _normalize_money_limit(
            daily_limits["daily_target"],
            "Daily target",
            must_be_positive=True
        )

    if "max_loss" in daily_limits:
        normalized["max_loss"] = _normalize_daily_loss(
            daily_limits["max_loss"]
        )

    if "max_daily_loss" in daily_limits:
        normalized["max_loss"] = _normalize_daily_loss(
            daily_limits["max_daily_loss"]
        )

    return normalized


def validate_broker_config(broker):

    errors = []
    warnings = []
    terminal_path = str(
        broker.get("terminal_path") or ""
    ).strip()
    enabled_symbols = get_enabled_symbol_entries(
        broker
    )

    if not terminal_path:
        errors.append("MT5 terminal path is empty.")
    elif not os.path.exists(terminal_path):
        errors.append(
            f"MT5 terminal path does not exist: {terminal_path}"
        )

    if not enabled_symbols:
        errors.append("No enabled symbols configured.")

    if broker.get("expected_login") in ("", None):
        warnings.append("Expected login is not set.")

    if not str(
        broker.get("expected_server") or ""
    ).strip():
        warnings.append("Expected server is not set.")

    if (
        broker.get("id") == "deriv"
        and not broker_strategy_config_has_enabled_strategy(broker)
    ):
        warnings.append(
            "No enabled Deriv strategy configured. "
            "The broker worker will pause."
        )

    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings
    }


def get_enabled_symbol_entries(broker):

    return [
        symbol
        for symbol in broker.get("symbols", [])
        if symbol.get("enabled", True)
        and symbol.get("mt5")
    ]


def broker_requires_strategy_pause(broker):

    return (
        broker.get("id") == "deriv"
        and not broker_strategy_config_has_enabled_strategy(broker)
    )


def broker_settings_menu():

    while True:

        brokers = get_all_brokers()

        clear_screen()
        show_logo()

        print("BROKER SETTINGS")
        print("===============\n")

        for index, broker in enumerate(
            brokers,
            start=1
        ):

            validation = validate_broker_config(
                broker
            )
            status = (
                "ACTIVE"
                if broker.get("enabled", False)
                else "OFF"
            )
            validity = (
                "READY"
                if validation["valid"]
                else "NEEDS SETUP"
            )

            print(
                f"{index}. {broker['label']} "
                f"[{status}] [{validity}]"
            )
            print(
                f"   Symbols: "
                f"{len(get_enabled_symbol_entries(broker))}"
            )
            strategy_names = get_enabled_broker_strategy_names(
                broker
            )
            if strategy_names:
                print(
                    "   Strategies: "
                    + ", ".join(strategy_names)
                )
            print(
                f"   Terminal: "
                f"{broker.get('terminal_path') or 'Not set'}"
            )
            daily_limits = get_broker_daily_limits(
                broker
            )
            print(
                "   Daily lock: "
                + (
                    "ON"
                    if daily_limits["enabled"]
                    else "OFF"
                )
                + (
                    f" | Target: {daily_limits['target']:.2f}"
                    f" | Loss: {daily_limits['max_loss']:.2f}"
                )
            )

            for warning in validation["warnings"]:
                print(f"   Warning: {warning}")

            for error in validation["errors"]:
                print(f"   Error: {error}")

        print("\nSelect broker number to toggle active/off.")
        print("C. Edit broker connection settings")
        print("D. Edit broker daily target/loss")
        print("M. Edit Deriv normal/spike mode")
        print("T. Edit broker strategy trade count")
        print("V. Validate active brokers")
        print("B. Back to main menu")

        choice = input(
            "\nSelect option: "
        ).strip().upper()

        log_event(
            "broker_settings_menu_selection",
            choice=choice
        )

        if choice == "B":
            return

        if choice == "V":
            _print_validation_summary(
                get_enabled_brokers()
            )
            pause()
            continue

        if choice == "C":
            _broker_connection_menu(brokers)
            continue

        if choice == "D":
            _daily_limits_menu(brokers)
            continue

        if choice == "M":
            _strategy_trade_mode_menu(brokers)
            continue

        if choice == "T":
            _strategy_trade_count_menu(brokers)
            continue

        if not choice.isdigit():
            print("\nInvalid selection.")
            pause()
            continue

        index = int(choice)

        if index < 1 or index > len(brokers):
            print("\nInvalid selection.")
            pause()
            continue

        broker = brokers[index - 1]
        set_broker_enabled(
            broker["id"],
            not broker.get("enabled", False)
        )

        print(
            f"\n{broker['label']} set to "
            f"{'OFF' if broker.get('enabled', False) else 'ACTIVE'}."
        )
        pause()


def _print_validation_summary(brokers):

    print("\nVALIDATION")
    print("==========\n")

    if not brokers:
        print("No active brokers selected.")
        return

    for broker in brokers:

        validation = validate_broker_config(
            broker
        )

        print(
            f"{broker['label']}: "
            f"{'READY' if validation['valid'] else 'NEEDS SETUP'}"
        )

        for warning in validation["warnings"]:
            print(f"  Warning: {warning}")

        for error in validation["errors"]:
            print(f"  Error: {error}")


def _broker_connection_menu(brokers):

    if not brokers:
        print("\nNo broker settings found.")
        pause()
        return

    print("\nBROKER CONNECTION SETTINGS")
    print("==========================\n")

    for index, broker in enumerate(
        brokers,
        start=1
    ):
        print(
            f"{index}. {broker['label']}"
        )
        print(
            f"   Terminal: "
            f"{broker.get('terminal_path') or 'Not set'}"
        )
        print(
            f"   Login: "
            f"{broker.get('expected_login') or 'Not set'}"
        )
        print(
            f"   Server: "
            f"{broker.get('expected_server') or 'Not set'}"
        )

    choice = input(
        "\nSelect broker number or B to go back: "
    ).strip().upper()

    if choice == "B":
        return

    if not choice.isdigit():
        print("\nInvalid selection.")
        pause()
        return

    index = int(choice)

    if index < 1 or index > len(brokers):
        print("\nInvalid selection.")
        pause()
        return

    broker = brokers[index - 1]
    updates = {}

    print(
        "\nLeave a field blank to keep its current value. "
        "Type CLEAR to unset optional fields."
    )

    label = input(
        f"Broker label [current {broker['label']}]: "
    ).strip()
    terminal_path = input(
        "MT5 terminal path "
        f"[current {broker.get('terminal_path') or 'Not set'}]: "
    ).strip()
    expected_login = input(
        "Account login "
        f"[current {broker.get('expected_login') or 'Not set'}]: "
    ).strip()
    expected_server = input(
        "Server "
        f"[current {broker.get('expected_server') or 'Not set'}]: "
    ).strip()

    if label:
        updates["label"] = label

    if terminal_path:
        updates["terminal_path"] = (
            ""
            if terminal_path.upper() == "CLEAR"
            else terminal_path
        )

    if expected_login:
        updates["expected_login"] = (
            None
            if expected_login.upper() == "CLEAR"
            else expected_login
        )

    if expected_server:
        updates["expected_server"] = (
            ""
            if expected_server.upper() == "CLEAR"
            else expected_server
        )

    if not updates:
        print("\nNo changes made.")
        pause()
        return

    try:
        saved_broker = set_broker_connection_config(
            broker["id"],
            updates
        )
    except ValueError as exc:
        print(f"\n{exc}")
        pause()
        return

    print(
        f"\n{saved_broker['label']} connection settings saved."
    )
    pause()


def _daily_limits_menu(brokers):

    if not brokers:
        print("\nNo broker settings found.")
        pause()
        return

    print("\nDAILY TARGET / LOSS")
    print("===================\n")

    for index, broker in enumerate(
        brokers,
        start=1
    ):
        daily_limits = get_broker_daily_limits(
            broker
        )
        state = (
            "ON"
            if daily_limits["enabled"]
            else "OFF"
        )
        print(
            f"{index}. {broker['label']} [{state}] "
            f"Target {daily_limits['target']:.2f} | "
            f"Loss {daily_limits['max_loss']:.2f}"
        )

    choice = input(
        "\nSelect broker number or B to go back: "
    ).strip().upper()

    if choice == "B":
        return

    if not choice.isdigit():
        print("\nInvalid selection.")
        pause()
        return

    index = int(choice)

    if index < 1 or index > len(brokers):
        print("\nInvalid selection.")
        pause()
        return

    broker = brokers[index - 1]
    current_limits = get_broker_daily_limits(
        broker
    )
    enabled_input = input(
        "Enable daily lock for this broker? "
        f"[Y/N, current {'Y' if current_limits['enabled'] else 'N'}]: "
    ).strip().upper()
    enabled = current_limits["enabled"]

    if enabled_input in ("Y", "YES"):
        enabled = True
    elif enabled_input in ("N", "NO"):
        enabled = False

    target_input = input(
        "Daily profit target "
        f"[current {current_limits['target']:.2f}]: "
    ).strip()
    loss_input = input(
        "Daily loss limit "
        f"[current {abs(current_limits['max_loss']):.2f}]: "
    ).strip()

    try:
        saved_limits = set_broker_daily_limits(
            broker["id"],
            {
                "enabled": enabled,
                "target": (
                    current_limits["target"]
                    if not target_input
                    else target_input
                ),
                "max_loss": (
                    current_limits["max_loss"]
                    if not loss_input
                    else loss_input
                )
            }
        )
    except ValueError as exc:
        print(f"\n{exc}")
        pause()
        return

    print(
        f"\n{broker['label']} daily limits saved: "
        f"target {saved_limits['target']:.2f}, "
        f"loss {saved_limits['max_loss']:.2f}."
    )
    pause()


def _strategy_trade_count_menu(brokers):

    strategy_rows = []

    for broker in brokers:
        strategies = broker.get(
            "strategy_settings",
            {}
        )

        if not isinstance(strategies, dict):
            continue

        for strategy_id, strategy in strategies.items():
            if not isinstance(strategy, dict):
                continue

            max_positions = _normalize_strategy_int(
                strategy.get("max_positions_per_symbol"),
                default=5,
                minimum=1,
                maximum=25
            )
            current_count = _normalize_strategy_int(
                strategy.get("trades_per_signal"),
                default=1,
                minimum=1,
                maximum=max_positions
            )
            strategy_rows.append(
                (
                    broker,
                    strategy_id,
                    current_count,
                    max_positions
                )
            )

    if not strategy_rows:
        print("\nNo broker strategy trade-count options found.")
        pause()
        return

    print("\nBROKER STRATEGY TRADE COUNT")
    print("===========================\n")

    for index, (
        broker,
        strategy_id,
        current_count,
        max_positions
    ) in enumerate(strategy_rows, start=1):
        print(
            f"{index}. {broker['label']} - "
            f"{_format_strategy_name(strategy_id)}: "
            f"{current_count} trades "
            f"(max {max_positions})"
        )

    choice = input(
        "\nSelect strategy number or B to go back: "
    ).strip().upper()

    if choice == "B":
        return

    if not choice.isdigit():
        print("\nInvalid selection.")
        pause()
        return

    index = int(choice)

    if index < 1 or index > len(strategy_rows):
        print("\nInvalid selection.")
        pause()
        return

    (
        broker,
        strategy_id,
        current_count,
        max_positions
    ) = strategy_rows[index - 1]
    count_input = input(
        "Trades per signal "
        f"[current {current_count}, max {max_positions}]: "
    ).strip()

    if not count_input:
        return

    try:
        saved_strategy = set_broker_strategy_trade_count(
            broker["id"],
            strategy_id,
            count_input
        )
    except ValueError as exc:
        print(f"\n{exc}")
        pause()
        return

    print(
        f"\n{broker['label']} "
        f"{_format_strategy_name(strategy_id)} saved: "
        f"{saved_strategy['trades_per_signal']} trades "
        f"(max {saved_strategy['max_positions_per_symbol']})."
    )
    pause()


def _strategy_trade_mode_menu(brokers):

    strategy_rows = []

    for broker in brokers:
        if broker.get("id") != "deriv":
            continue

        strategies = broker.get(
            "strategy_settings",
            {}
        )

        if not isinstance(strategies, dict):
            continue

        for strategy_id, strategy in strategies.items():
            if not isinstance(strategy, dict):
                continue

            if strategy_id != "stochastic_oscillator":
                continue

            strategy_rows.append(
                (
                    broker,
                    strategy_id,
                    _normalize_deriv_trade_mode(
                        strategy.get("trade_mode")
                    )
                )
            )

    if not strategy_rows:
        print("\nNo Deriv trade-mode options found.")
        pause()
        return

    print("\nDERIV TRADE MODE")
    print("================\n")

    for index, (
        broker,
        strategy_id,
        current_mode
    ) in enumerate(strategy_rows, start=1):
        print(
            f"{index}. {broker['label']} - "
            f"{_format_strategy_name(strategy_id)}: "
            f"{_format_deriv_trade_mode(current_mode)}"
        )

    choice = input(
        "\nSelect strategy number or B to go back: "
    ).strip().upper()

    if choice == "B":
        return

    if not choice.isdigit():
        print("\nInvalid selection.")
        pause()
        return

    index = int(choice)

    if index < 1 or index > len(strategy_rows):
        print("\nInvalid selection.")
        pause()
        return

    broker, strategy_id, current_mode = strategy_rows[index - 1]

    print("\n1. Normal - Crash BUY, Boom SELL")
    print("2. Spike - Crash SELL, Boom BUY")
    print("3. Both - trade normal and spike directions")

    mode_input = input(
        "Mode "
        f"[current {_format_deriv_trade_mode(current_mode)}]: "
    ).strip().upper()

    if not mode_input:
        return

    mode_lookup = {
        "1": "normal",
        "N": "normal",
        "NORMAL": "normal",
        "2": "spike",
        "S": "spike",
        "SPIKE": "spike",
        "3": "both",
        "BOTH": "both"
    }
    trade_mode = mode_lookup.get(mode_input)

    if trade_mode is None:
        print("\nInvalid trade mode.")
        pause()
        return

    try:
        saved_strategy = set_broker_strategy_trade_mode(
            broker["id"],
            strategy_id,
            trade_mode
        )
    except ValueError as exc:
        print(f"\n{exc}")
        pause()
        return

    print(
        f"\n{broker['label']} "
        f"{_format_strategy_name(strategy_id)} mode saved: "
        f"{_format_deriv_trade_mode(saved_strategy['trade_mode'])}."
    )
    pause()


def _normalize_settings(settings):

    normalized = _clone_settings(DEFAULT_SETTINGS)
    loaded_brokers = {}

    if isinstance(settings, dict):
        loaded_brokers = settings.get(
            "brokers",
            {}
        )

    if isinstance(loaded_brokers, dict):

        for broker_id, broker in loaded_brokers.items():

            if not isinstance(broker, dict):
                continue

            base = normalized["brokers"].get(
                broker_id,
                {}
            ).copy()
            if (
                broker_id == "deriv"
                and "strategy_settings" not in base
            ):
                base["strategy_settings"] = (
                    get_default_broker_strategy_settings(
                        broker_id
                    )
                )
            base.update(broker)
            base["daily_limits"] = normalize_daily_limits(
                base.get("daily_limits")
            )
            normalized["brokers"][broker_id] = base

    for broker in normalized["brokers"].values():
        broker["daily_limits"] = normalize_daily_limits(
            broker.get("daily_limits")
        )

    return normalized


def _prepare_broker(
    broker_id,
    broker
):

    prepared = broker.copy()
    prepared["id"] = broker_id
    prepared["label"] = get_broker_display_label(
        prepared
    )
    prepared["symbols"] = [
        symbol.copy()
        for symbol in prepared.get("symbols", [])
        if isinstance(symbol, dict)
    ]
    prepared["strategy_settings"] = {
        strategy_id: strategy.copy()
        for strategy_id, strategy in (
            prepared.get(
                "strategy_settings",
                {}
            ).items()
        )
        if isinstance(strategy, dict)
    }
    prepared["daily_limits"] = normalize_daily_limits(
        prepared.get("daily_limits")
    )

    return prepared


def _clone_settings(settings):

    return json.loads(
        json.dumps(settings)
    )


def _contains_strategy_keys(broker):

    return any(
        key in broker
        for key in (
            "strategies",
            "strategy_settings",
            "strategy_overrides"
        )
    )


def _normalize_expected_login(value):

    if value in (None, ""):
        return None

    try:
        login = int(str(value).strip())
    except (TypeError, ValueError) as exc:
        raise ValueError(
            "Expected login must be a whole number."
        ) from exc

    if login <= 0:
        raise ValueError(
            "Expected login must be greater than zero."
        )

    return login


def _normalize_deriv_trade_mode(value):

    mode = str(value or "normal").strip().lower()

    if mode not in ("normal", "spike", "both"):
        raise ValueError(
            "Deriv trade mode must be normal, spike, or both."
        )

    return mode


def _format_deriv_trade_mode(mode):

    normalized = _normalize_deriv_trade_mode(mode)
    labels = {
        "normal": "Normal (Crash BUY, Boom SELL)",
        "spike": "Spike (Crash SELL, Boom BUY)",
        "both": "Both (normal and spike)"
    }

    return labels[normalized]


def _normalize_money_limit(
    value,
    label,
    must_be_positive=False
):

    try:
        numeric_value = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"{label} must be a number."
        ) from exc

    if (
        must_be_positive
        and numeric_value <= 0
    ):
        raise ValueError(
            f"{label} must be greater than zero."
        )

    return numeric_value


def _normalize_daily_loss(value):

    numeric_value = _normalize_money_limit(
        value,
        "Daily loss"
    )

    if numeric_value == 0:
        raise ValueError(
            "Daily loss must be greater than zero."
        )

    return -abs(numeric_value)


def _normalize_strategy_int(
    value,
    default,
    minimum,
    maximum
):

    try:
        normalized = int(value)
    except (TypeError, ValueError):
        normalized = int(default)

    return max(
        int(minimum),
        min(
            normalized,
            int(maximum)
        )
    )


def _format_strategy_name(strategy_id):

    return str(strategy_id).replace(
        "_",
        " "
    ).title()
