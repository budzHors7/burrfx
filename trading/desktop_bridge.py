import argparse
import csv
from collections import deque
from datetime import datetime
import json
from pathlib import Path
import re
import sys

from config import LOGS_FOLDER
from server.app.core.settings import settings
from trading import broker_settings, journal, strategy_settings, trading_settings


DESKTOP_LOG_LIMIT = 300
LOG_FILE_LIMIT = 12
JOURNAL_ENTRY_LIMIT = 200
TRADE_LOG_FILE = journal.TRADE_LOG_FILE
DEBUG_LOG_PATTERN = re.compile(
    r"^(?P<at>[^|]+?)\s+\|\s+(?P<level>[^|]+?)\s+\|\s+(?P<line>.*)$"
)
SYMBOL_LOG_PATTERN = re.compile(
    r"^\[(?P<at>[^\]]+)\]\s*(?P<line>.*)$"
)


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


def build_settings():

    status = build_status()
    active_trading_settings = (
        trading_settings.get_trading_settings()
    )
    strategies = strategy_settings.get_strategy_settings()

    return {
        "status": status,
        "trading": {
            "active_profile": active_trading_settings["id"],
            "default_profile": trading_settings.DEFAULT_PROFILE_ID,
            "profiles": (
                trading_settings.get_available_trading_profiles()
            )
        },
        "strategies": [
            _build_strategy_summary(
                strategy_id,
                strategy
            )
            for strategy_id, strategy in strategies.items()
        ],
        "strategy_catalog": _build_strategy_catalog(),
        "brokers": status["brokers"]
    }


def save_settings(payload):

    if not isinstance(payload, dict):
        raise ValueError("Settings payload must be a JSON object.")

    profile_to_save = _validate_profile_payload(
        payload
    )
    strategy_updates = _validate_strategy_payload(
        payload
    )
    broker_updates = _validate_broker_payload(
        payload
    )

    if profile_to_save is not None:
        if profile_to_save == "restore_default":
            trading_settings._save_profile_selection(
                trading_settings.DEFAULT_PROFILE_ID,
                restore_default=True
            )
        else:
            trading_settings.set_trading_profile(
                profile_to_save
            )

    if strategy_updates is not None:
        if strategy_updates == "restore_defaults":
            strategy_settings._save_overrides({})
        else:
            strategy_settings._save_overrides(
                strategy_updates
            )

    if broker_updates is not None:
        broker_settings.save_broker_settings(
            broker_updates
        )

    return {
        "message": "Settings saved.",
        "settings": build_settings()
    }


def build_logs(limit=DESKTOP_LOG_LIMIT):

    logs_root = Path(LOGS_FOLDER).resolve()
    limit = _normalize_log_limit(limit)

    if not logs_root.exists():
        return {
            "generated_at": _now_iso(),
            "logs_root": str(logs_root),
            "files": [],
            "entries": []
        }

    files = _discover_log_files(logs_root)
    entries = []

    for file_info in files:
        path = Path(file_info["path"])

        for line_number, line in _read_recent_lines(
            path,
            limit
        ):
            entries.append(
                _build_log_entry(
                    logs_root,
                    path,
                    line_number,
                    line,
                    file_info["category"]
                )
            )

    entries.sort(
        key=lambda entry: (
            entry["_sort_at"],
            entry["file"],
            entry["line_number"]
        ),
        reverse=True
    )
    entries = entries[:limit]

    for entry in entries:
        entry.pop("_sort_at", None)

    return {
        "generated_at": _now_iso(),
        "logs_root": str(logs_root),
        "files": [
            {
                key: value
                for key, value in file_info.items()
                if key != "path"
            }
            for file_info in files
        ],
        "entries": entries
    }


def run_backtest(payload=None):

    backtester = _load_backtester()
    payload = _normalize_backtest_payload(
        payload or {},
        backtester
    )

    return backtester.run_broker_backtest(
        payload
    )


def _load_backtester():

    from backtesting import backtester

    return backtester


def build_journal(limit=JOURNAL_ENTRY_LIMIT):

    path = Path(TRADE_LOG_FILE).resolve()
    limit = _normalize_log_limit(limit)

    if not path.exists():
        return {
            "generated_at": _now_iso(),
            "path": str(path),
            "exists": False,
            "count": 0,
            "entries": []
        }

    entries = []

    try:
        with path.open(
            "r",
            encoding="utf-8",
            errors="replace",
            newline=""
        ) as handle:
            reader = csv.DictReader(handle)

            for row_number, row in enumerate(
                reader,
                start=2
            ):
                entries.append(
                    _build_journal_entry(
                        row,
                        row_number
                    )
                )
    except OSError as exc:
        return {
            "generated_at": _now_iso(),
            "path": str(path),
            "exists": True,
            "count": 0,
            "entries": [],
            "error": str(exc)
        }

    entries = entries[-limit:]
    entries.reverse()

    return {
        "generated_at": _now_iso(),
        "path": str(path),
        "exists": True,
        "count": len(entries),
        "entries": entries
    }


def main(argv=None):

    parser = argparse.ArgumentParser(
        description="Machine-readable BurrFx desktop app bridge."
    )
    parser.add_argument(
        "command",
        choices=[
            "status",
            "settings",
            "save-settings",
            "logs",
            "backtest",
            "journal"
        ],
        help="Bridge command to run."
    )
    args = parser.parse_args(argv)

    try:
        if args.command == "status":
            result = build_status()
        elif args.command == "settings":
            result = build_settings()
        elif args.command == "save-settings":
            result = save_settings(
                _read_json_stdin()
            )
        elif args.command == "logs":
            result = build_logs()
        elif args.command == "backtest":
            result = run_backtest(
                _read_json_stdin(default={})
            )
        elif args.command == "journal":
            result = build_journal()
        else:
            return 1

        print(
            json.dumps(
                result,
                sort_keys=True
            )
        )
        return 0

    except (
        json.JSONDecodeError,
        ValueError
    ) as exc:
        print(str(exc), file=sys.stderr)
        return 2

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
        "expected_login": broker.get("expected_login"),
        "expected_server": broker.get("expected_server") or "",
        "trading_profile": broker.get(
            "trading_profile",
            "regular_risk"
        ),
        "symbols": [
            {
                "canonical": symbol.get("canonical") or "",
                "mt5": symbol.get("mt5") or "",
                "enabled": bool(symbol.get("enabled", True))
            }
            for symbol in broker.get("symbols", [])
            if isinstance(symbol, dict)
        ],
        "enabled_symbols": [
            symbol["mt5"]
            for symbol in broker.get("symbols", [])
            if symbol.get("enabled", True)
            and symbol.get("mt5")
        ],
        "daily_limits": broker_settings.get_broker_daily_limits(
            broker
        ),
        "validation": {
            "valid": bool(validation["valid"]),
            "errors": list(validation["errors"]),
            "warnings": list(validation["warnings"])
        },
        "requires_strategy_pause": (
            broker_settings.broker_requires_strategy_pause(
                broker
            )
        ),
        "allowed_strategies": (
            _build_allowed_broker_strategy_options(
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


def _discover_log_files(logs_root):

    candidates = []

    for folder_name, category in (
        ("debug", "debug"),
        ("symbol_logs", "symbol"),
    ):
        folder = logs_root / folder_name

        if not folder.exists():
            continue

        candidates.extend(
            (
                path,
                category
            )
            for path in folder.glob("*.log")
            if path.is_file()
        )

    candidates.sort(
        key=lambda item: item[0].stat().st_mtime,
        reverse=True
    )

    return [
        _build_log_file_info(
            logs_root,
            path,
            category
        )
        for path, category in candidates[:LOG_FILE_LIMIT]
    ]


def _build_log_file_info(logs_root, path, category):

    stat = path.stat()

    return {
        "path": str(path),
        "file": _relative_log_path(logs_root, path),
        "name": path.stem,
        "category": category,
        "size": stat.st_size,
        "modified_at": datetime.fromtimestamp(
            stat.st_mtime
        ).isoformat(timespec="seconds")
    }


def _read_recent_lines(path, limit):

    lines = deque(maxlen=limit)

    try:
        with path.open(
            "r",
            encoding="utf-8",
            errors="replace"
        ) as handle:
            for line_number, line in enumerate(
                handle,
                start=1
            ):
                line = line.rstrip("\r\n")

                if line.strip():
                    lines.append((line_number, line))
    except OSError as exc:
        return [
            (
                0,
                f"Failed to read {path.name}: {exc}"
            )
        ]

    return list(lines)


def _build_log_entry(
    logs_root,
    path,
    line_number,
    raw_line,
    category
):

    parsed = _parse_log_line(raw_line, category)

    return {
        "at": parsed["at"],
        "_sort_at": parsed["sort_at"],
        "level": parsed["level"],
        "category": category,
        "source": path.stem,
        "file": _relative_log_path(logs_root, path),
        "line_number": line_number,
        "line": parsed["line"],
        "raw": raw_line
    }


def _parse_log_line(raw_line, category):

    if category == "debug":
        match = DEBUG_LOG_PATTERN.match(raw_line)

        if match:
            at = match.group("at").strip()

            return {
                "at": at,
                "sort_at": _timestamp_sort_value(at),
                "level": match.group("level").strip().upper(),
                "line": match.group("line").strip()
            }

    if category == "symbol":
        match = SYMBOL_LOG_PATTERN.match(raw_line)

        if match:
            at = match.group("at").strip()

            return {
                "at": at,
                "sort_at": _timestamp_sort_value(at),
                "level": "INFO",
                "line": match.group("line").strip()
            }

    return {
        "at": "",
        "sort_at": 0.0,
        "level": "INFO",
        "line": raw_line.strip()
    }


def _timestamp_sort_value(value):

    if not value:
        return 0.0

    for fmt in (
        "%Y-%m-%d %H:%M:%S,%f",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S"
    ):
        try:
            return datetime.strptime(value, fmt).timestamp()
        except ValueError:
            continue

    return 0.0


def _relative_log_path(logs_root, path):

    try:
        return path.relative_to(logs_root).as_posix()
    except ValueError:
        return path.name


def _normalize_log_limit(limit):

    try:
        limit = int(limit)
    except (TypeError, ValueError):
        return DESKTOP_LOG_LIMIT

    return min(
        max(limit, 1),
        DESKTOP_LOG_LIMIT
    )


def _normalize_backtest_payload(payload, backtester):

    if not isinstance(payload, dict):
        raise ValueError("Backtest payload must be a JSON object.")

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

    try:
        bars = int(
            payload.get(
                "bars",
                backtester.DEFAULT_BACKTEST_BARS
            )
        )
    except (TypeError, ValueError):
        bars = backtester.DEFAULT_BACKTEST_BARS

    bars = min(
        max(bars, backtester.MIN_BACKTEST_BARS),
        backtester.MAX_BACKTEST_BARS
    )

    return {
        "broker_ids": normalized_broker_ids,
        "bars": bars,
        "include_disabled": bool(
            payload.get(
                "include_disabled",
                False
            )
        )
    }


def _read_json_stdin(default=None):

    raw = sys.stdin.read().strip()

    if not raw:
        if default is not None:
            return default

        raise ValueError("JSON payload is required.")

    return json.loads(raw)


def _build_journal_entry(row, row_number):

    return {
        "row": row_number,
        "time": row.get("Time") or "",
        "symbol": row.get("Symbol") or "",
        "type": row.get("Type") or "",
        "lot": row.get("Lot") or "",
        "entry": row.get("Entry") or "",
        "sl": row.get("SL") or "",
        "tp": row.get("TP") or "",
        "ticket": row.get("Ticket") or "",
        "status": row.get("Status") or ""
    }


def _now_iso():

    return datetime.now().isoformat(timespec="seconds")


def _build_strategy_summary(
    strategy_id,
    strategy
):

    defaults = _get_strategy_defaults(
        strategy_id,
        strategy
    )

    summary = {
        "id": strategy_id,
        "label": _format_strategy_name(strategy_id),
        "enabled": bool(
            strategy.get("enabled", False)
        ),
        "default_enabled": bool(
            defaults.get(
                "enabled",
                strategy.get("enabled", False)
            )
        ),
        "timeframe": strategy.get("timeframe", "N/A"),
        "recommended_timeframes": list(
            strategy.get(
                "recommended_timeframes",
                []
            )
        ),
        "trades_per_signal": _normalize_strategy_int(
            strategy.get("trades_per_signal"),
            default=1,
            minimum=1,
            maximum=_strategy_max_positions_per_symbol(strategy)
        ),
        "max_positions_per_symbol": _strategy_max_positions_per_symbol(
            strategy
        )
    }

    if (
        strategy_id == "stochastic_oscillator"
        and "trade_mode" in strategy
    ):
        summary["trade_mode"] = _normalize_deriv_trade_mode(
            strategy.get("trade_mode")
        )

    return summary


def _build_strategy_catalog():

    catalog = []
    seen_strategy_ids = set()

    for strategy_id, strategy in _iter_strategy_catalog_items():

        if strategy_id in seen_strategy_ids:
            continue

        seen_strategy_ids.add(strategy_id)
        catalog.append(
            _build_strategy_summary(
                strategy_id,
                strategy
            )
        )

    return catalog


def _build_allowed_broker_strategy_options(broker):

    return [
        _build_strategy_summary(
            strategy_id,
            strategy
        )
        for strategy_id, strategy in (
            _get_allowed_broker_strategy_settings(
                broker
            ).items()
        )
    ]


def _validate_profile_payload(payload):

    if payload.get("restore_trading_default", False):
        return "restore_default"

    if "active_profile" not in payload:
        return None

    profile_id = str(
        payload.get("active_profile") or ""
    ).strip()
    trading_settings.get_trading_profile_summary(
        profile_id
    )

    return profile_id


def _validate_strategy_payload(payload):

    if payload.get("restore_strategy_defaults", False):
        return "restore_defaults"

    if "strategies" not in payload:
        return None

    updates = payload.get("strategies")

    if not isinstance(updates, dict):
        raise ValueError("Strategies payload must be an object.")

    settings = strategy_settings.get_strategy_settings()
    unknown_ids = [
        strategy_id
        for strategy_id in updates
        if strategy_id not in settings
    ]

    if unknown_ids:
        raise ValueError(
            "Unknown strategy: "
            + ", ".join(sorted(unknown_ids))
        )

    updated_settings = {
        strategy_id: strategy.copy()
        for strategy_id, strategy in settings.items()
    }

    for strategy_id, enabled in updates.items():
        updated_settings[strategy_id]["enabled"] = bool(
            enabled
        )

    if not any(
        strategy.get("enabled", False)
        for strategy in updated_settings.values()
    ):
        raise ValueError(
            "At least one strategy must stay enabled."
        )

    return updated_settings


def _validate_broker_payload(payload):

    has_broker_updates = "brokers" in payload
    has_broker_strategy_updates = (
        "broker_strategies" in payload
    )
    has_broker_daily_limit_updates = (
        "broker_daily_limits" in payload
    )
    has_broker_config_updates = (
        "broker_configs" in payload
    )
    has_new_brokers = "new_brokers" in payload

    if (
        not has_broker_updates
        and not has_broker_strategy_updates
        and not has_broker_daily_limit_updates
        and not has_broker_config_updates
        and not has_new_brokers
    ):
        return None

    updates = payload.get(
        "brokers",
        {}
    )
    broker_strategy_updates = payload.get(
        "broker_strategies",
        {}
    )
    broker_daily_limit_updates = payload.get(
        "broker_daily_limits",
        {}
    )
    broker_config_updates = payload.get(
        "broker_configs",
        {}
    )
    new_brokers = payload.get(
        "new_brokers",
        []
    )

    if (
        has_broker_updates
        and not isinstance(updates, dict)
    ):
        raise ValueError("Brokers payload must be an object.")

    if (
        has_broker_strategy_updates
        and not isinstance(broker_strategy_updates, dict)
    ):
        raise ValueError(
            "Broker strategies payload must be an object."
        )

    if (
        has_broker_daily_limit_updates
        and not isinstance(broker_daily_limit_updates, dict)
    ):
        raise ValueError(
            "Broker daily limits payload must be an object."
        )

    if (
        has_broker_config_updates
        and not isinstance(broker_config_updates, dict)
    ):
        raise ValueError(
            "Broker configs payload must be an object."
        )

    if has_new_brokers and not isinstance(new_brokers, list):
        raise ValueError("New brokers payload must be a list.")

    settings = broker_settings.load_broker_settings()
    brokers = settings.setdefault(
        "brokers",
        {}
    )
    requested_broker_ids = (
        set(updates)
        | set(broker_strategy_updates)
        | set(broker_daily_limit_updates)
        | set(broker_config_updates)
    )
    unknown_ids = [
        broker_id
        for broker_id in requested_broker_ids
        if broker_id not in brokers
    ]

    if unknown_ids:
        raise ValueError(
            "Unknown broker: "
            + ", ".join(sorted(unknown_ids))
        )

    for broker_payload in new_brokers:
        broker_id, broker = _build_new_broker_config(
            broker_payload
        )

        if broker_id in brokers:
            raise ValueError(
                f"Broker already exists: {broker_id}"
            )

        brokers[broker_id] = broker

    for broker_id, config_updates in (
        broker_config_updates.items()
    ):
        _apply_broker_config_updates(
            brokers[broker_id],
            config_updates
        )

    for broker_id, enabled in updates.items():
        brokers[broker_id]["enabled"] = bool(enabled)

    for broker_id, strategy_updates in (
        broker_strategy_updates.items()
    ):

        if not isinstance(strategy_updates, dict):
            raise ValueError(
                f"Broker strategies for {broker_id} must be an object."
            )

        _apply_broker_strategy_updates(
            brokers[broker_id],
            broker_id,
            strategy_updates
        )

    for broker_id, daily_limits in (
        broker_daily_limit_updates.items()
    ):

        brokers[broker_id]["daily_limits"] = (
            broker_settings.normalize_daily_limits(
                daily_limits
            )
        )

    return settings


def _apply_broker_config_updates(
    broker,
    config_updates
):

    if not isinstance(config_updates, dict):
        raise ValueError(
            "Broker config updates must be an object."
        )

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

    if "trading_profile" in config_updates:
        profile_id = str(
            config_updates.get("trading_profile") or ""
        ).strip()
        trading_settings.get_trading_profile_summary(
            profile_id
        )
        broker["trading_profile"] = profile_id

    if "symbols" in config_updates:
        broker["symbols"] = _normalize_symbol_payload(
            config_updates.get("symbols")
        )


def _build_new_broker_config(broker_payload):

    if not isinstance(broker_payload, dict):
        raise ValueError("New broker entries must be objects.")

    label = str(
        broker_payload.get("label") or ""
    ).strip()

    if not label:
        raise ValueError("New broker label is required.")

    broker_id = _normalize_broker_id(
        broker_payload.get("id") or label
    )
    trading_profile = str(
        broker_payload.get(
            "trading_profile",
            trading_settings.DEFAULT_PROFILE_ID
        )
        or trading_settings.DEFAULT_PROFILE_ID
    ).strip()
    trading_settings.get_trading_profile_summary(
        trading_profile
    )

    return broker_id, {
        "enabled": bool(
            broker_payload.get("enabled", False)
        ),
        "label": label,
        "terminal_path": str(
            broker_payload.get("terminal_path") or ""
        ).strip(),
        "expected_login": _normalize_expected_login(
            broker_payload.get("expected_login")
        ),
        "expected_server": str(
            broker_payload.get("expected_server") or ""
        ).strip(),
        "trading_profile": trading_profile,
        "daily_limits": broker_settings.normalize_daily_limits(
            broker_payload.get("daily_limits")
        ),
        "symbols": _normalize_symbol_payload(
            broker_payload.get("symbols", [])
        )
    }


def _normalize_broker_id(value):

    normalized = re.sub(
        r"[^a-z0-9]+",
        "_",
        str(value or "").strip().lower()
    ).strip("_")

    if not normalized:
        raise ValueError("Broker id is required.")

    return normalized


def _normalize_expected_login(value):

    if value in (None, ""):
        return None

    try:
        login = int(str(value).strip())
    except (TypeError, ValueError):
        raise ValueError(
            "Expected login must be a whole number."
        )

    if login <= 0:
        raise ValueError(
            "Expected login must be greater than zero."
        )

    return login


def _normalize_symbol_payload(value):

    if value in (None, ""):
        return []

    if isinstance(value, str):
        items = [
            item.strip()
            for item in re.split(r"[\n,]+", value)
            if item.strip()
        ]
    elif isinstance(value, list):
        items = value
    else:
        raise ValueError("Broker symbols must be a list or text.")

    symbols = []

    for item in items:
        if isinstance(item, str):
            mt5_symbol = item.strip()
            enabled = True
            canonical = _canonical_symbol_name(
                mt5_symbol
            )
        elif isinstance(item, dict):
            mt5_symbol = str(
                item.get("mt5") or ""
            ).strip()
            enabled = bool(
                item.get("enabled", True)
            )
            canonical = str(
                item.get("canonical")
                or _canonical_symbol_name(mt5_symbol)
            ).strip()
        else:
            raise ValueError(
                "Broker symbols must be text or objects."
            )

        if not mt5_symbol:
            continue

        symbols.append({
            "canonical": canonical,
            "mt5": mt5_symbol,
            "enabled": enabled
        })

    return symbols


def _canonical_symbol_name(symbol):

    return "".join(
        char
        for char in str(symbol).upper()
        if char.isalnum()
    )


def _apply_broker_strategy_updates(
    broker,
    broker_id,
    strategy_updates
):

    broker_for_rules = broker.copy()
    broker_for_rules["id"] = broker_id
    allowed_settings = _get_allowed_broker_strategy_settings(
        broker_for_rules
    )
    unknown_strategy_ids = [
        strategy_id
        for strategy_id in strategy_updates
        if strategy_id not in allowed_settings
    ]

    if unknown_strategy_ids:
        raise ValueError(
            ", ".join(sorted(unknown_strategy_ids))
            + f" is not allowed for broker {broker_id}."
        )

    existing_settings = broker.get(
        "strategy_settings",
        {}
    )

    if not isinstance(existing_settings, dict):
        existing_settings = {}

    next_settings = {}

    for strategy_id, allowed_strategy in (
        allowed_settings.items()
    ):

        strategy = _get_strategy_defaults(
            strategy_id,
            allowed_strategy
        ).copy()
        strategy.update(allowed_strategy)

        existing_strategy = existing_settings.get(
            strategy_id,
            {}
        )

        if isinstance(existing_strategy, dict):
            strategy.update(existing_strategy)

        if strategy_id in strategy_updates:
            strategy.update(
                _normalize_broker_strategy_update(
                    broker_id,
                    strategy_id,
                    strategy_updates[strategy_id],
                    strategy
                )
            )

        next_settings[strategy_id] = strategy

    broker["strategy_settings"] = next_settings


def _normalize_broker_strategy_update(
    broker_id,
    strategy_id,
    update,
    strategy
):

    if isinstance(update, bool):
        return {
            "enabled": update
        }

    if not isinstance(update, dict):
        raise ValueError(
            "Broker strategy updates must be booleans or objects."
        )

    normalized = {}

    if "enabled" in update:
        normalized["enabled"] = bool(
            update["enabled"]
        )

    if "trades_per_signal" in update:
        normalized["trades_per_signal"] = (
            _normalize_strategy_int(
                update["trades_per_signal"],
                default=strategy.get(
                    "trades_per_signal",
                    1
                ),
                minimum=1,
                maximum=_strategy_max_positions_per_symbol(
                    strategy
                )
            )
        )

    if "trade_mode" in update:
        if (
            broker_id != "deriv"
            or strategy_id != "stochastic_oscillator"
        ):
            raise ValueError(
                "Deriv trade mode is only available for "
                "the Deriv stochastic strategy."
            )

        normalized["trade_mode"] = _normalize_deriv_trade_mode(
            update["trade_mode"]
        )

    return normalized


def _get_allowed_broker_strategy_settings(broker):

    broker_id = broker.get("id")
    configured_settings = (
        strategy_settings.get_broker_strategy_settings(
            broker
        )
    )
    allowed_strategy_ids = (
        strategy_settings.BROKER_ALLOWED_STRATEGIES.get(
            broker_id
        )
    )

    if allowed_strategy_ids is None:
        defaults = strategy_settings.get_strategy_settings()
        ordered_strategy_ids = list(defaults)
    else:
        defaults = {
            strategy_id: _get_strategy_defaults(
                strategy_id,
                {}
            )
            for strategy_id, _strategy in (
                _iter_strategy_catalog_items()
            )
            if strategy_id in allowed_strategy_ids
        }
        ordered_strategy_ids = [
            strategy_id
            for strategy_id, _strategy in (
                _iter_strategy_catalog_items()
            )
            if strategy_id in allowed_strategy_ids
        ]

    allowed_settings = {}

    for strategy_id in ordered_strategy_ids:

        strategy = _get_strategy_defaults(
            strategy_id,
            defaults.get(
                strategy_id,
                {}
            )
        ).copy()
        strategy.update(
            defaults.get(
                strategy_id,
                {}
            )
        )
        strategy.update(
            configured_settings.get(
                strategy_id,
                {}
            )
        )
        allowed_settings[strategy_id] = strategy

    return allowed_settings


def _iter_strategy_catalog_items():

    for strategy_id, strategy in (
        strategy_settings.get_strategy_settings().items()
    ):
        yield strategy_id, strategy

    for broker_defaults in (
        strategy_settings.DEFAULT_BROKER_STRATEGY_SETTINGS.values()
    ):
        for strategy_id, strategy in broker_defaults.items():
            yield strategy_id, strategy


def _get_strategy_defaults(
    strategy_id,
    fallback
):

    if strategy_id in strategy_settings.STRATEGY_SETTINGS:
        return strategy_settings.STRATEGY_SETTINGS[
            strategy_id
        ]

    for broker_defaults in (
        strategy_settings.DEFAULT_BROKER_STRATEGY_SETTINGS.values()
    ):
        if strategy_id in broker_defaults:
            return broker_defaults[strategy_id]

    return fallback or {}


def _strategy_max_positions_per_symbol(strategy):

    return _normalize_strategy_int(
        strategy.get("max_positions_per_symbol"),
        default=5,
        minimum=1,
        maximum=25
    )


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


def _normalize_deriv_trade_mode(value):

    mode = str(value or "normal").strip().lower()

    if mode not in ("normal", "spike", "both"):
        raise ValueError(
            "Deriv trade mode must be normal, spike, or both."
        )

    return mode


def _format_strategy_name(strategy_id):

    return strategy_settings.DISPLAY_NAMES.get(
        strategy_id,
        strategy_id.replace("_", " ").title()
    )


if __name__ == "__main__":
    raise SystemExit(main())
