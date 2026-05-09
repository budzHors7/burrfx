import json
import os

from config import STRATEGY_SETTINGS, STRATEGY_SETTINGS_FILE
from logo import show_logo
from trading.debug_logger import log_event
from utils import clear_screen, pause


SETTINGS_FILE = STRATEGY_SETTINGS_FILE
DEFAULT_BROKER_STRATEGY_SETTINGS = {
    "deriv": {
        "stochastic_oscillator": {
            "enabled": True,
            "timeframe": "M5",
            "recommended_timeframes": [
                "M5"
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
}
BROKER_ALLOWED_STRATEGIES = {
    "deriv": {
        "stochastic_oscillator"
    }
}
BROKER_SCOPED_STRATEGIES = {
    "stochastic_oscillator": {
        "deriv"
    }
}
DISPLAY_NAMES = {
    "ma_crossover": "MA Crossover",
    "trendline_price_action": (
        "Trendline + Price Action"
    ),
    "smc_liquidity_sweep": (
        "SMC Liquidity Sweep"
    ),
    "high_impact_news": (
        "High Impact News"
    ),
    "stochastic_oscillator": (
        "Stochastic Oscillator"
    )
}


def get_strategy_settings():

    settings = _clone_settings(
        STRATEGY_SETTINGS
    )
    overrides = _load_overrides()

    for strategy_id, override in overrides.items():

        if strategy_id not in settings:
            continue

        if not isinstance(override, dict):
            continue

        settings[strategy_id].update(override)

    return settings


def get_default_broker_strategy_settings(broker_id):

    return _clone_settings(
        DEFAULT_BROKER_STRATEGY_SETTINGS.get(
            broker_id,
            {}
        )
    )


def get_broker_strategy_settings(broker):

    if not isinstance(broker, dict):
        return {}

    broker_id = broker.get("id")
    raw_settings = broker.get(
        "strategy_settings",
        {}
    )

    if not isinstance(raw_settings, dict):
        return {}

    allowed_strategies = BROKER_ALLOWED_STRATEGIES.get(
        broker_id
    )
    settings = {}

    for strategy_id, strategy in raw_settings.items():

        if not isinstance(strategy, dict):
            continue

        if (
            allowed_strategies is not None
            and strategy_id not in allowed_strategies
        ):
            continue

        scoped_brokers = BROKER_SCOPED_STRATEGIES.get(
            strategy_id
        )

        if (
            scoped_brokers is not None
            and broker_id not in scoped_brokers
        ):
            continue

        settings[strategy_id] = strategy.copy()

    return settings


def broker_strategy_config_has_enabled_strategy(broker):

    return any(
        strategy.get("enabled", False)
        for strategy in (
            get_broker_strategy_settings(broker).values()
        )
    )


def get_enabled_broker_strategy_names(broker):

    return [
        _format_strategy_name(strategy_id)
        for strategy_id, strategy in (
            get_broker_strategy_settings(broker).items()
        )
        if strategy.get("enabled", False)
    ]


def strategy_settings_menu():

    while True:

        settings = get_strategy_settings()
        strategy_items = list(settings.items())

        clear_screen()
        show_logo()

        print("STRATEGY SETTINGS")
        print("=================\n")

        for index, (strategy_id, strategy) in enumerate(
            strategy_items,
            start=1
        ):

            name = _format_strategy_name(strategy_id)
            status = (
                "ON"
                if strategy.get("enabled", False)
                else "OFF"
            )
            timeframe = strategy.get("timeframe", "N/A")
            recommendations = ", ".join(
                strategy.get(
                    "recommended_timeframes",
                    []
                )
            )

            print(
                f"{index}. {name} [{status}]"
            )
            print(
                f"   Live timeframe: {timeframe}"
            )
            print(
                f"   Best timeframes: {recommendations}"
            )

        print("\nR. Restore config defaults")
        print("B. Back to main menu")

        choice = input(
            "\nSelect a strategy to toggle: "
        ).strip().upper()

        log_event(
            "strategy_settings_menu_selection",
            choice=choice
        )

        if choice == "B":
            return

        if choice == "R":
            _save_overrides({})
            print("\nStrategy settings restored to defaults.")
            log_event(
                "strategy_settings_restored"
            )
            pause()
            continue

        if not choice.isdigit():
            print("\nInvalid selection.")
            pause()
            continue

        index = int(choice)

        if index < 1 or index > len(strategy_items):
            print("\nInvalid selection.")
            pause()
            continue

        strategy_id, strategy = strategy_items[index - 1]
        updated_settings = _clone_settings(settings)
        currently_enabled = strategy.get(
            "enabled",
            False
        )

        updated_settings[strategy_id]["enabled"] = (
            not currently_enabled
        )

        if not any(
            item.get("enabled", False)
            for item in updated_settings.values()
        ):
            print(
                "\nAt least one strategy must stay enabled."
            )
            pause()
            continue

        _save_overrides(updated_settings)

        print(
            f"\n{_format_strategy_name(strategy_id)} "
            f"set to "
            f"{'ON' if not currently_enabled else 'OFF'}."
        )
        log_event(
            "strategy_setting_toggled",
            strategy_id=strategy_id,
            enabled=not currently_enabled
        )
        pause()


def _load_overrides():

    if not os.path.exists(SETTINGS_FILE):
        return {}

    try:
        with open(
            SETTINGS_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            loaded = json.load(file)

        if isinstance(loaded, dict):
            return loaded

    except (
        json.JSONDecodeError,
        OSError
    ) as exc:
        log_event(
            "strategy_settings_load_failed",
            level="warning",
            error=str(exc),
            path=SETTINGS_FILE
        )

    return {}


def _save_overrides(settings):

    payload = {}

    for strategy_id, strategy in settings.items():
        default = STRATEGY_SETTINGS.get(
            strategy_id,
            {}
        )
        payload[strategy_id] = {
            "enabled": strategy.get(
                "enabled",
                default.get("enabled", True)
            )
        }

    if not payload:
        if os.path.exists(SETTINGS_FILE):
            os.remove(SETTINGS_FILE)
    else:
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
                payload,
                file,
                indent=2
            )

    log_event(
        "strategy_settings_saved",
        path=SETTINGS_FILE,
        overrides=payload
    )


def _clone_settings(settings):

    return {
        key: value.copy()
        for key, value in settings.items()
    }


def _format_strategy_name(strategy_id):

    if strategy_id in DISPLAY_NAMES:
        return DISPLAY_NAMES[strategy_id]

    return strategy_id.replace(
        "_",
        " "
    ).title()
