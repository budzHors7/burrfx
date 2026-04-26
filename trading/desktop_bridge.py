import argparse
import json

from server.app.core.settings import settings
from trading import broker_settings


def build_status():

    brokers = [
        _build_broker_summary(broker)
        for broker in broker_settings.get_all_brokers()
    ]

    return {
        "server": {
            "host": settings.api_host,
            "port": settings.api_port,
            "local_url": _build_local_url(
                settings.api_host,
                settings.api_port
            )
        },
        "enabled_broker_count": len(
            [
                broker
                for broker in brokers
                if broker["enabled"]
            ]
        ),
        "brokers": brokers
    }


def main(argv=None):

    parser = argparse.ArgumentParser(
        description="Machine-readable BurrFx desktop app bridge."
    )
    parser.add_argument(
        "command",
        choices=["status"],
        help="Bridge command to run."
    )
    args = parser.parse_args(argv)

    if args.command == "status":
        print(
            json.dumps(
                build_status(),
                sort_keys=True
            )
        )
        return 0

    return 1


def _build_broker_summary(broker):

    validation = broker_settings.validate_broker_config(
        broker
    )

    return {
        "id": broker["id"],
        "label": broker["label"],
        "enabled": bool(
            broker.get("enabled", False)
        ),
        "terminal_path": broker.get("terminal_path") or "",
        "trading_profile": broker.get(
            "trading_profile",
            "regular_risk"
        ),
        "enabled_symbols": [
            symbol["mt5"]
            for symbol in broker.get("symbols", [])
            if symbol.get("enabled", True)
            and symbol.get("mt5")
        ],
        "validation": {
            "valid": bool(validation["valid"]),
            "errors": list(validation["errors"]),
            "warnings": list(validation["warnings"])
        },
        "requires_strategy_pause": (
            broker_settings.broker_requires_strategy_pause(
                broker
            )
        )
    }


def _build_local_url(host, port):

    local_host = (
        "localhost"
        if host in ("", "0.0.0.0", "::")
        else host
    )

    return f"http://{local_host}:{port}"


if __name__ == "__main__":
    raise SystemExit(main())
