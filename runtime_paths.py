import os
import shutil
import sys
from pathlib import Path


SOURCE_ROOT = Path(
    getattr(sys, "_MEIPASS", Path(__file__).resolve().parent)
).resolve()

TRADE_JOURNAL_HEADER = [
    "Time",
    "Symbol",
    "Type",
    "Lot",
    "Entry",
    "SL",
    "TP",
    "Ticket",
    "Status",
]


def _default_runtime_root():
    if getattr(sys, "frozen", False):
        base = (
            os.environ.get("LOCALAPPDATA")
            or os.environ.get("APPDATA")
            or str(Path.home())
        )
        return Path(base) / "BurrFx"

    return SOURCE_ROOT


RUNTIME_ROOT = Path(
    os.environ.get("BURRFX_RUNTIME_ROOT") or _default_runtime_root()
).resolve()


def runtime_path(*parts):
    return RUNTIME_ROOT.joinpath(*parts)


DATA_FOLDER = str(runtime_path("data"))
RESULTS_FOLDER = str(runtime_path("results"))
LOGS_FOLDER = str(runtime_path("logs"))
BROKER_SETTINGS_FILE = str(runtime_path("broker_settings.json"))
STRATEGY_SETTINGS_FILE = str(runtime_path("strategy_settings.json"))
TRADING_SETTINGS_FILE = str(runtime_path("trading_settings.json"))
SERVER_ENV_FILE = str(runtime_path("server", ".env"))


def ensure_runtime_state():
    runtime_path("logs", "debug").mkdir(parents=True, exist_ok=True)
    runtime_path("logs", "symbol_logs").mkdir(parents=True, exist_ok=True)
    runtime_path("data").mkdir(parents=True, exist_ok=True)
    runtime_path("results").mkdir(parents=True, exist_ok=True)
    runtime_path("server").mkdir(parents=True, exist_ok=True)

    _ensure_trade_journal()
    _seed_file("broker_settings.json", "broker_settings.json")
    _seed_file("strategy_settings.json", "strategy_settings.json", "{}\n")
    _seed_file("trading_settings.json", "trading_settings.json", "{}\n")
    _seed_file("server/.env.example", "server/.env")

    return {
        "runtime_root": str(RUNTIME_ROOT),
        "logs_root": LOGS_FOLDER,
        "data_root": DATA_FOLDER,
        "results_root": RESULTS_FOLDER,
        "settings": {
            "broker_settings": runtime_path("broker_settings.json").exists(),
            "strategy_settings": runtime_path("strategy_settings.json").exists(),
            "trading_settings": runtime_path("trading_settings.json").exists(),
            "server_env": runtime_path("server", ".env").exists(),
        },
    }


def _ensure_trade_journal():
    journal_path = runtime_path("logs", "trade_journal.csv")

    if journal_path.exists():
        return

    journal_path.write_text(
        ",".join(TRADE_JOURNAL_HEADER) + "\n",
        encoding="utf-8",
    )


def _seed_file(source_relative, destination_relative, fallback_text=None):
    destination = runtime_path(*destination_relative.split("/"))

    if destination.exists():
        return

    destination.parent.mkdir(parents=True, exist_ok=True)
    source = SOURCE_ROOT.joinpath(*source_relative.split("/"))

    if source.exists():
        shutil.copyfile(source, destination)
        return

    if fallback_text is not None:
        destination.write_text(fallback_text, encoding="utf-8")
