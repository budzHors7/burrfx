import json
import os

from config import (
    BREAK_EVEN_ATR_BUFFER,
    BREAK_EVEN_TRIGGER_RATIO,
    MAX_SPREAD_POINTS,
    RISK_PERCENT,
    SL_ATR_MULTIPLIER,
    TP1_LOCK_ATR_BUFFER,
    TP_EXTENSION_TRIGGER_RATIO,
    TRAIL_FACTOR
)
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
    "trading_settings.json"
)
DEFAULT_PROFILE_ID = "regular_risk"
PROFILE_ORDER = [
    "smart_risk",
    "regular_risk",
    "highly_risky"
]
PUBLIC_PROFILE_FIELDS = [
    "id",
    "label",
    "description",
    "lot_mode",
    "risk_percent",
    "max_spread_points",
    "use_take_profit",
    "use_break_even",
    "use_trailing_stop"
]
PROFILE_DEFINITIONS = {
    "smart_risk": {
        "label": "Smart Risk",
        "description": (
            "Smallest broker lot, safer TP/SL, "
            "low spread filter, break-even only."
        ),
        "lot_mode": "min",
        "risk_percent": min(RISK_PERCENT, 0.50),
        "sl_atr_multiplier": max(
            SL_ATR_MULTIPLIER,
            1.80
        ),
        "trail_factor": TRAIL_FACTOR,
        "break_even_trigger_ratio": min(
            BREAK_EVEN_TRIGGER_RATIO,
            0.40
        ),
        "break_even_atr_buffer": min(
            BREAK_EVEN_ATR_BUFFER,
            0.03
        ),
        "tp_extension_trigger_ratio": 1.00,
        "tp1_lock_atr_buffer": TP1_LOCK_ATR_BUFFER,
        "max_spread_points": min(
            MAX_SPREAD_POINTS,
            18
        ),
        "use_take_profit": True,
        "extend_take_profit": False,
        "use_break_even": True,
        "use_trailing_stop": False
    },
    "regular_risk": {
        "label": "Regular Risk",
        "description": (
            "Automatic lot size, safe TP/SL, "
            "break-even, and trailing stop."
        ),
        "lot_mode": "auto",
        "risk_percent": RISK_PERCENT,
        "sl_atr_multiplier": SL_ATR_MULTIPLIER,
        "trail_factor": TRAIL_FACTOR,
        "break_even_trigger_ratio": (
            BREAK_EVEN_TRIGGER_RATIO
        ),
        "break_even_atr_buffer": (
            BREAK_EVEN_ATR_BUFFER
        ),
        "tp_extension_trigger_ratio": (
            TP_EXTENSION_TRIGGER_RATIO
        ),
        "tp1_lock_atr_buffer": (
            TP1_LOCK_ATR_BUFFER
        ),
        "max_spread_points": MAX_SPREAD_POINTS,
        "use_take_profit": True,
        "extend_take_profit": True,
        "use_break_even": True,
        "use_trailing_stop": True
    },
    "highly_risky": {
        "label": "Highly Risky",
        "description": (
            "Higher automatic lot size, no TP, "
            "break-even first, then trailing stop, "
            "with a wider spread allowance."
        ),
        "lot_mode": "auto",
        "risk_percent": max(
            RISK_PERCENT * 2.0,
            2.0
        ),
        "sl_atr_multiplier": max(
            round(
                SL_ATR_MULTIPLIER * 0.85,
                2
            ),
            1.0
        ),
        "trail_factor": max(
            TRAIL_FACTOR,
            1.35
        ),
        "break_even_trigger_ratio": min(
            BREAK_EVEN_TRIGGER_RATIO,
            0.35
        ),
        "break_even_atr_buffer": min(
            BREAK_EVEN_ATR_BUFFER,
            0.02
        ),
        "tp_extension_trigger_ratio": (
            TP_EXTENSION_TRIGGER_RATIO
        ),
        "tp1_lock_atr_buffer": (
            TP1_LOCK_ATR_BUFFER
        ),
        "max_spread_points": max(
            MAX_SPREAD_POINTS,
            45
        ),
        "use_take_profit": False,
        "extend_take_profit": False,
        "use_break_even": True,
        "use_trailing_stop": True
    }
}


def get_trading_settings():

    profile_id = _get_active_profile_id()
    settings = PROFILE_DEFINITIONS[
        profile_id
    ].copy()
    settings["id"] = profile_id

    return settings


def get_trading_profile_summary(profile_id=None):

    resolved_profile_id = (
        _get_active_profile_id()
        if profile_id is None
        else _validate_profile_id(profile_id)
    )
    profile = PROFILE_DEFINITIONS[
        resolved_profile_id
    ]

    return {
        field: (
            resolved_profile_id
            if field == "id"
            else profile[field]
        )
        for field in PUBLIC_PROFILE_FIELDS
    }


def get_available_trading_profiles():

    return [
        get_trading_profile_summary(profile_id)
        for profile_id in PROFILE_ORDER
    ]


def get_trading_profile_label():

    return get_trading_settings()["label"]


def set_trading_profile(profile_id):

    resolved_profile_id = _validate_profile_id(
        profile_id
    )
    _save_profile_selection(
        resolved_profile_id
    )

    return get_trading_profile_summary(
        resolved_profile_id
    )


def trading_settings_menu():

    while True:

        active_settings = get_trading_settings()
        active_profile_id = active_settings["id"]

        clear_screen()
        show_logo()

        print("TRADING SETTINGS")
        print("================\n")
        print(
            f"Active profile: "
            f"{active_settings['label']}\n"
        )

        for index, profile_id in enumerate(
            PROFILE_ORDER,
            start=1
        ):

            profile = PROFILE_DEFINITIONS[
                profile_id
            ]
            active_marker = (
                " [ACTIVE]"
                if profile_id == active_profile_id
                else ""
            )

            print(
                f"{index}. {profile['label']}"
                f"{active_marker}"
            )
            print(
                f"   {profile['description']}"
            )
            print(
                f"   Lot sizing: "
                f"{_format_lot_summary(profile)}"
            )
            print(
                f"   Spread limit: "
                f"{profile['max_spread_points']} points"
            )
            print(
                f"   TP: "
                f"{'ON' if profile['use_take_profit'] else 'OFF'}"
                f" | Break-even: "
                f"{'ON' if profile['use_break_even'] else 'OFF'}"
                f" | Trail SL: "
                f"{'ON' if profile['use_trailing_stop'] else 'OFF'}"
            )

        print("\nR. Restore default profile")
        print("B. Back to main menu")

        choice = input(
            "\nSelect a trading profile: "
        ).strip().upper()

        log_event(
            "trading_settings_menu_selection",
            choice=choice,
            active_profile=active_profile_id
        )

        if choice == "B":
            return

        if choice == "R":
            _save_profile_selection(
                DEFAULT_PROFILE_ID,
                restore_default=True
            )
            print(
                "\nTrading profile restored to "
                "Regular Risk."
            )
            pause()
            continue

        if not choice.isdigit():
            print("\nInvalid selection.")
            pause()
            continue

        index = int(choice)

        if index < 1 or index > len(PROFILE_ORDER):
            print("\nInvalid selection.")
            pause()
            continue

        selected_profile_id = PROFILE_ORDER[
            index - 1
        ]

        if selected_profile_id == active_profile_id:
            print(
                "\nThat trading profile is already active."
            )
            pause()
            continue

        _save_profile_selection(
            selected_profile_id
        )
        selected_profile = PROFILE_DEFINITIONS[
            selected_profile_id
        ]

        print(
            f"\nTrading profile set to "
            f"{selected_profile['label']}."
        )
        pause()


def _get_active_profile_id():

    loaded_profile_id = _load_profile_selection()

    if loaded_profile_id in PROFILE_DEFINITIONS:
        return loaded_profile_id

    return DEFAULT_PROFILE_ID


def _validate_profile_id(profile_id):

    normalized_profile_id = str(
        profile_id or ""
    ).strip()

    if normalized_profile_id not in PROFILE_DEFINITIONS:
        raise ValueError(
            f"Unknown trading profile: {profile_id}"
        )

    return normalized_profile_id


def _load_profile_selection():

    if not os.path.exists(SETTINGS_FILE):
        return None

    try:
        with open(
            SETTINGS_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            loaded = json.load(file)

        if isinstance(loaded, dict):
            return loaded.get("active_profile")

    except (
        json.JSONDecodeError,
        OSError
    ) as exc:
        log_event(
            "trading_settings_load_failed",
            level="warning",
            error=str(exc),
            path=SETTINGS_FILE
        )

    return None


def _save_profile_selection(
    profile_id,
    restore_default=False
):

    if (
        restore_default
        and os.path.exists(SETTINGS_FILE)
    ):
        os.remove(SETTINGS_FILE)
        log_event(
            "trading_profile_restored",
            profile_id=DEFAULT_PROFILE_ID,
            path=SETTINGS_FILE
        )
        return

    payload = {
        "active_profile": profile_id
    }

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
        "trading_profile_saved",
        profile_id=profile_id,
        path=SETTINGS_FILE
    )


def _format_lot_summary(profile):

    if profile["lot_mode"] == "min":
        return "Broker minimum lot"

    return (
        f"Auto risk "
        f"{profile['risk_percent']:.2f}%"
    )
