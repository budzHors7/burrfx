import argparse
import importlib
import json
import sys

import runtime_paths


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Packaged BurrFx Python runtime sidecar."
    )
    subcommands = parser.add_subparsers(
        dest="command",
        required=True,
    )

    bridge_parser = subcommands.add_parser(
        "bridge",
        help="Run a machine-readable desktop bridge command.",
    )
    bridge_parser.add_argument(
        "bridge_command",
        choices=[
            "status",
            "settings",
            "save-settings",
            "logs",
            "backtest",
            "journal",
        ],
    )

    server_parser = subcommands.add_parser(
        "server",
        help="Run the BurrFx FastAPI server.",
    )
    server_parser.set_defaults(_server=True)

    worker_parser = subcommands.add_parser(
        "worker",
        help="Run one broker trading worker.",
    )
    worker_parser.add_argument(
        "--broker",
        required=True,
        help="Broker id from broker_settings.json.",
    )

    subcommands.add_parser(
        "doctor",
        help="Print runtime state for packaging smoke tests.",
    )

    args = parser.parse_args(argv)
    state = importlib.reload(runtime_paths).ensure_runtime_state()

    if args.command == "doctor":
        print(json.dumps(state, sort_keys=True))
        return 0

    if args.command == "bridge":
        from trading.desktop_bridge import main as bridge_main

        return bridge_main([args.bridge_command])

    if args.command == "server":
        import uvicorn

        from server.app.core.settings import settings

        uvicorn.run(
            "server.app.main:app",
            host=settings.api_host,
            port=settings.api_port,
            reload=False,
        )
        return 0

    if args.command == "worker":
        from trading.broker_worker import main as worker_main

        return worker_main(["--broker", args.broker])

    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
