import os
import base64
import subprocess
import sys

from trading.broker_settings import (
    get_broker_display_label,
    get_enabled_brokers,
    validate_broker_config
)
from trading.debug_logger import log_event


PROJECT_ROOT = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)


def launch_active_broker_tabs():

    brokers = get_enabled_brokers()

    if not brokers:
        return {
            "launched": False,
            "message": "No active brokers selected."
        }

    invalid = [
        (
            broker,
            validate_broker_config(broker)
        )
        for broker in brokers
        if not validate_broker_config(broker)["valid"]
    ]

    if invalid:
        messages = []

        for broker, validation in invalid:
            messages.append(
                f"{broker['label']}: "
                + "; ".join(validation["errors"])
            )

        return {
            "launched": False,
            "message": "\n".join(messages)
        }

    same_window_args = _build_wt_args(
        brokers,
        same_window=True
    )
    fallback_args = _build_wt_args(
        brokers,
        same_window=False
    )

    try:
        subprocess.run(
            same_window_args,
            cwd=PROJECT_ROOT,
            check=True,
            timeout=10
        )
        log_event(
            "broker_tabs_launched",
            mode="same_window",
            brokers=[
                broker["id"]
                for broker in brokers
            ]
        )
    except (
        FileNotFoundError,
        subprocess.CalledProcessError,
        subprocess.TimeoutExpired
    ) as exc:
        log_event(
            "broker_tabs_same_window_failed",
            level="warning",
            error=str(exc)
        )
        subprocess.run(
            fallback_args,
            cwd=PROJECT_ROOT,
            check=True,
            timeout=10
        )
        log_event(
            "broker_tabs_launched",
            mode="new_window",
            brokers=[
                broker["id"]
                for broker in brokers
            ]
        )

    return {
        "launched": True,
        "message": (
            f"Launched {len(brokers)} broker "
            f"{'tab' if len(brokers) == 1 else 'tabs'}."
        )
    }


def _build_wt_args(
    brokers,
    same_window
):

    args = ["wt.exe"]

    if same_window:
        args.extend(["-w", "0"])

    for index, broker in enumerate(brokers):

        if index > 0:
            args.append(";")

        args.extend(
            _build_new_tab_args(broker)
        )

    return args


def _build_new_tab_args(broker):

    title = _broker_tab_title(broker)
    command = _encode_powershell_command(
        "\n".join(
            [
                "$ErrorActionPreference = 'Continue'",
                (
                    "$Host.UI.RawUI.WindowTitle = "
                    f"'{_escape_ps(title)}'"
                ),
                f"Set-Location -LiteralPath '{_escape_ps(PROJECT_ROOT)}'",
                "try {",
                f"    & '{_escape_ps(sys.executable)}' "
                f"-m trading.broker_worker "
                f"--broker '{_escape_ps(broker['id'])}'",
                "} finally {",
                "    Write-Host ''",
                "    Read-Host 'Press ENTER to close this tab'",
                "}"
            ]
        )
    )

    return [
        "new-tab",
        "--title",
        title,
        "--suppressApplicationTitle",
        "powershell.exe",
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-EncodedCommand",
        command
    ]


def _broker_tab_title(broker):

    return get_broker_display_label(broker)


def _encode_powershell_command(command):

    return base64.b64encode(
        command.encode("utf-16le")
    ).decode("ascii")


def _escape_ps(value):

    return str(value).replace("'", "''")
