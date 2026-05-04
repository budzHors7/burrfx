import json
import os

from logo import show_logo
from trading.debug_logger import log_event
from utils import clear_screen, pause


PROJECT_ROOT = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)
SETTINGS_FILE = os.path.join(
    PROJECT_ROOT,
    "broker_settings.json"
)
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
            "symbols": []
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
        and _contains_strategy_keys(broker)
    ):
        errors.append(
            "Deriv broker settings must not contain strategies."
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
        and not os.path.exists(
            os.path.join(
                PROJECT_ROOT,
                "deriv_strategy_settings.json"
            )
        )
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
            print(
                f"   Terminal: "
                f"{broker.get('terminal_path') or 'Not set'}"
            )

            for warning in validation["warnings"]:
                print(f"   Warning: {warning}")

            for error in validation["errors"]:
                print(f"   Error: {error}")

        print("\nSelect broker number to toggle active/off.")
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
            base.update(broker)
            normalized["brokers"][broker_id] = base

    return normalized


def _prepare_broker(
    broker_id,
    broker
):

    prepared = broker.copy()
    prepared["id"] = broker_id
    prepared["label"] = (
        prepared.get("label")
        or broker_id.title()
    )
    prepared["symbols"] = [
        symbol.copy()
        for symbol in prepared.get("symbols", [])
        if isinstance(symbol, dict)
    ]

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
