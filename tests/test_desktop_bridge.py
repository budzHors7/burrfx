import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from trading import desktop_bridge


def _broker(
    broker_id,
    *,
    enabled=True,
    symbols=None,
    terminal_path=r"C:\MT5\terminal64.exe",
    expected_login=123456,
    expected_server="Demo",
    strategy_settings=None,
    daily_limits=None,
):
    broker = {
        "id": broker_id,
        "label": broker_id.title(),
        "enabled": enabled,
        "terminal_path": terminal_path,
        "expected_login": expected_login,
        "expected_server": expected_server,
        "trading_profile": "regular_risk",
        "symbols": symbols
        if symbols is not None
        else [
            {
                "canonical": "EURUSD",
                "mt5": "EURUSDm",
                "enabled": True,
            },
            {
                "canonical": "GBPUSD",
                "mt5": "GBPUSDm",
                "enabled": False,
            },
        ],
    }

    if strategy_settings is not None:
        broker["strategy_settings"] = strategy_settings

    if daily_limits is not None:
        broker["daily_limits"] = daily_limits

    return broker


class DesktopBridgeTests(unittest.TestCase):
    def test_backtester_import_is_lazy_for_lightweight_bridge_commands(self):
        sys.modules.pop("backtesting.backtester", None)

        with patch.object(
            desktop_bridge.broker_settings,
            "get_all_brokers",
            return_value=[],
        ):
            desktop_bridge.build_status()

        self.assertNotIn("backtesting.backtester", sys.modules)

    def test_build_status_summarizes_brokers_and_server_url(self):
        brokers = [
            _broker("exness"),
            _broker("deriv", enabled=False),
        ]

        with (
            patch.object(
                desktop_bridge.broker_settings,
                "get_all_brokers",
                return_value=brokers,
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "validate_broker_config",
                return_value={
                    "valid": True,
                    "errors": [],
                    "warnings": ["Expected login is not set."],
                },
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "broker_requires_strategy_pause",
                return_value=False,
            ),
            patch.object(
                desktop_bridge,
                "settings",
                SimpleNamespace(api_host="0.0.0.0", api_port=8000),
            ),
        ):
            status = desktop_bridge.build_status()

        self.assertEqual(status["server"]["host"], "0.0.0.0")
        self.assertEqual(status["server"]["port"], 8000)
        self.assertEqual(status["server"]["local_url"], "http://localhost:8000")
        self.assertEqual(status["enabled_broker_count"], 1)
        self.assertEqual(status["brokers"][0]["id"], "exness")
        self.assertEqual(status["brokers"][0]["enabled_symbols"], ["EURUSDm"])
        self.assertEqual(status["brokers"][0]["expected_login"], 123456)
        self.assertEqual(status["brokers"][0]["expected_server"], "Demo")
        self.assertEqual(
            status["brokers"][0]["daily_limits"],
            {
                "enabled": True,
                "target": 150.0,
                "max_loss": -100.0,
            },
        )
        self.assertTrue(status["brokers"][0]["validation"]["valid"])
        self.assertFalse(status["brokers"][1]["enabled"])

    def test_main_writes_machine_readable_json(self):
        with patch.object(
            desktop_bridge,
            "build_status",
            return_value={"ok": True, "brokers": []},
        ):
            output = io.StringIO()

            with redirect_stdout(output):
                exit_code = desktop_bridge.main(["status"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(
            json.loads(output.getvalue()),
            {"ok": True, "brokers": []},
        )

    def test_build_logs_reads_debug_and_symbol_logs(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            logs_root = Path(temp_dir)
            debug_dir = logs_root / "debug"
            symbol_dir = logs_root / "symbol_logs"
            debug_dir.mkdir()
            symbol_dir.mkdir()
            debug_log = debug_dir / "debug.log"
            symbol_log = symbol_dir / "Boom 1000 Index.log"
            debug_log.write_text(
                "\n".join(
                    [
                        "2026-05-06 03:59:00,100 | INFO | old_event | {}",
                        (
                            "2026-05-06 04:00:00,200 | WARNING | "
                            "stochastic_signal_missing | {\"symbol\":\"Boom\"}"
                        ),
                    ]
                ),
                encoding="utf-8",
            )
            symbol_log.write_text(
                (
                    "[2026-05-06 04:01:00.300000] "
                    "Checking Stochastic Oscillator on M5\n"
                ),
                encoding="utf-8",
            )

            with patch.object(
                desktop_bridge,
                "LOGS_FOLDER",
                str(logs_root),
            ):
                result = desktop_bridge.build_logs(limit=5)

        self.assertEqual(result["logs_root"], str(logs_root.resolve()))
        self.assertEqual(
            [entry["category"] for entry in result["entries"]],
            ["symbol", "debug", "debug"],
        )
        self.assertEqual(result["entries"][0]["source"], "Boom 1000 Index")
        self.assertEqual(result["entries"][0]["level"], "INFO")
        self.assertEqual(
            result["entries"][0]["line"],
            "Checking Stochastic Oscillator on M5",
        )
        self.assertEqual(result["entries"][1]["level"], "WARNING")
        self.assertEqual(
            result["entries"][0]["file"],
            "symbol_logs/Boom 1000 Index.log",
        )
        self.assertEqual(len(result["files"]), 2)

    def test_build_logs_handles_missing_log_folder(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            logs_root = Path(temp_dir) / "missing"

            with patch.object(
                desktop_bridge,
                "LOGS_FOLDER",
                str(logs_root),
            ):
                result = desktop_bridge.build_logs()

        self.assertEqual(result["entries"], [])
        self.assertEqual(result["files"], [])

    def test_main_writes_logs_json(self):
        with patch.object(
            desktop_bridge,
            "build_logs",
            return_value={"entries": [], "files": []},
        ):
            output = io.StringIO()

            with redirect_stdout(output):
                exit_code = desktop_bridge.main(["logs"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(
            json.loads(output.getvalue()),
            {"entries": [], "files": []},
        )

    def test_run_backtest_passes_payload_to_broker_backtester(self):
        backtester = SimpleNamespace(
            DEFAULT_BACKTEST_BARS=500,
            MIN_BACKTEST_BARS=50,
            MAX_BACKTEST_BARS=10000,
        )
        backtester.run_broker_backtest = Mock(
            return_value={"summary": {"trade_count": 0}},
        )

        with patch.object(
            desktop_bridge,
            "_load_backtester",
            return_value=backtester,
        ):
            result = desktop_bridge.run_backtest(
                {
                    "broker_ids": ["exness", "deriv"],
                    "bars": "250",
                    "include_disabled": True,
                }
            )

        self.assertEqual(result, {"summary": {"trade_count": 0}})
        backtester.run_broker_backtest.assert_called_once_with(
            {
                "broker_ids": ["exness", "deriv"],
                "bars": 250,
                "include_disabled": True,
            }
        )

    def test_main_writes_backtest_json_from_stdin(self):
        with (
            patch("sys.stdin", io.StringIO('{"bars":"120"}')),
            patch.object(
                desktop_bridge,
                "run_backtest",
                return_value={"summary": {"trade_count": 2}},
            ) as run_backtest,
        ):
            output = io.StringIO()

            with redirect_stdout(output):
                exit_code = desktop_bridge.main(["backtest"])

        self.assertEqual(exit_code, 0)
        run_backtest.assert_called_once_with({"bars": "120"})
        self.assertEqual(
            json.loads(output.getvalue()),
            {"summary": {"trade_count": 2}},
        )

    def test_build_journal_reads_recent_trade_entries(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            journal_path = Path(temp_dir) / "trade_journal.csv"
            journal_path.write_text(
                "\n".join(
                    [
                        "Time,Symbol,Type,Lot,Entry,SL,TP,Ticket,Status",
                        "2026-05-06 04:00:00,Boom 1000 Index,SELL,0.2,1200,1205,,9001,EXECUTED",
                        "2026-05-06 04:05:00,Crash 1000 Index,BUY,0.2,800,795,,9002,FAILED",
                    ]
                ),
                encoding="utf-8",
            )

            with patch.object(
                desktop_bridge,
                "TRADE_LOG_FILE",
                str(journal_path),
            ):
                result = desktop_bridge.build_journal(limit=1)

        self.assertTrue(result["exists"])
        self.assertEqual(result["path"], str(journal_path.resolve()))
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["entries"][0]["symbol"], "Crash 1000 Index")
        self.assertEqual(result["entries"][0]["type"], "BUY")
        self.assertEqual(result["entries"][0]["ticket"], "9002")
        self.assertEqual(result["entries"][0]["status"], "FAILED")

    def test_main_writes_journal_json(self):
        with patch.object(
            desktop_bridge,
            "build_journal",
            return_value={"entries": [], "exists": False},
        ):
            output = io.StringIO()

            with redirect_stdout(output):
                exit_code = desktop_bridge.main(["journal"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(
            json.loads(output.getvalue()),
            {"entries": [], "exists": False},
        )

    def test_build_settings_returns_cli_editable_settings(self):
        with (
            patch.object(
                desktop_bridge.broker_settings,
                "get_all_brokers",
                return_value=[_broker("exness", enabled=False)],
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "validate_broker_config",
                return_value={
                    "valid": True,
                    "errors": [],
                    "warnings": [],
                },
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "broker_requires_strategy_pause",
                return_value=False,
            ),
            patch.object(
                desktop_bridge.trading_settings,
                "get_trading_settings",
                return_value={"id": "regular_risk", "label": "Regular Risk"},
            ),
            patch.object(
                desktop_bridge.trading_settings,
                "get_available_trading_profiles",
                return_value=[
                    {
                        "id": "regular_risk",
                        "label": "Regular Risk",
                        "description": "Default",
                        "lot_mode": "auto",
                        "risk_percent": 1.0,
                        "max_spread_points": 30,
                        "use_take_profit": True,
                        "use_break_even": True,
                        "use_trailing_stop": True,
                        "safe_floating_profit_percent": 2.0,
                        "max_positions_per_symbol": 3,
                        "addon_spacing_atr": 1.0,
                    },
                ],
            ),
            patch.object(
                desktop_bridge.strategy_settings,
                "get_strategy_settings",
                return_value={
                    "ma_crossover": {
                        "enabled": True,
                        "timeframe": "M15",
                        "recommended_timeframes": ["M15"],
                    },
                },
            ),
        ):
            settings = desktop_bridge.build_settings()

        self.assertEqual(settings["trading"]["active_profile"], "regular_risk")
        self.assertEqual(settings["trading"]["default_profile"], "regular_risk")
        self.assertEqual(
            settings["trading"]["profiles"][0]["label"],
            "Regular Risk",
        )
        self.assertEqual(settings["strategies"][0]["id"], "ma_crossover")
        self.assertEqual(settings["strategies"][0]["label"], "MA Crossover")
        self.assertTrue(settings["strategies"][0]["enabled"])
        self.assertEqual(settings["strategy_catalog"][0]["id"], "ma_crossover")
        self.assertEqual(settings["brokers"][0]["id"], "exness")
        self.assertEqual(
            settings["brokers"][0]["allowed_strategies"][0]["id"],
            "ma_crossover",
        )

    def test_build_status_adds_allowed_strategies_for_each_broker(self):
        brokers = [
            _broker("exness"),
            _broker(
                "deriv",
                strategy_settings={
                    "stochastic_oscillator": {
                        "enabled": False,
                        "timeframe": "M5",
                        "recommended_timeframes": ["M5"],
                    }
                },
            ),
        ]

        with (
            patch.object(
                desktop_bridge.broker_settings,
                "get_all_brokers",
                return_value=brokers,
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "validate_broker_config",
                return_value={
                    "valid": True,
                    "errors": [],
                    "warnings": [],
                },
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "broker_requires_strategy_pause",
                return_value=False,
            ),
            patch.object(
                desktop_bridge.strategy_settings,
                "get_strategy_settings",
                return_value={
                    "ma_crossover": {
                        "enabled": True,
                        "timeframe": "M15",
                        "recommended_timeframes": ["M15"],
                    },
                    "trendline_price_action": {
                        "enabled": False,
                        "timeframe": "H1",
                        "recommended_timeframes": ["H1"],
                    },
                },
            ),
            patch.object(
                desktop_bridge,
                "settings",
                SimpleNamespace(api_host="0.0.0.0", api_port=8000),
            ),
        ):
            status = desktop_bridge.build_status()

        exness_strategies = status["brokers"][0]["allowed_strategies"]
        deriv_strategies = status["brokers"][1]["allowed_strategies"]

        self.assertEqual(
            [strategy["id"] for strategy in exness_strategies],
            ["ma_crossover", "trendline_price_action"],
        )
        self.assertTrue(exness_strategies[0]["enabled"])
        self.assertEqual(
            [strategy["id"] for strategy in deriv_strategies],
            ["stochastic_oscillator"],
        )
        self.assertFalse(deriv_strategies[0]["enabled"])

    def test_save_settings_updates_cli_fields_and_preserves_broker_details(self):
        existing_settings = {
            "brokers": {
                "exness": {
                    "enabled": False,
                    "label": "Exness",
                    "terminal_path": r"C:\MT5\terminal64.exe",
                    "expected_login": 123456,
                    "expected_server": "Demo",
                    "trading_profile": "regular_risk",
                    "symbols": [
                        {
                            "canonical": "EURUSD",
                            "mt5": "EURUSDm",
                            "enabled": True,
                        }
                    ],
                },
                "deriv": {
                    "enabled": True,
                    "label": "Deriv",
                    "terminal_path": r"C:\Deriv\terminal64.exe",
                    "expected_login": 654321,
                    "expected_server": "Deriv-Demo",
                    "trading_profile": "regular_risk",
                    "symbols": [
                        {
                            "canonical": "BOOM1000",
                            "mt5": "Boom 1000 Index",
                            "enabled": True,
                        }
                    ],
                    "strategy_settings": {
                        "stochastic_oscillator": {
                            "enabled": True,
                        }
                    },
                    "daily_limits": {
                        "enabled": True,
                        "target": 250.0,
                        "max_loss": -75.0,
                    },
                },
            }
        }
        saved_broker_settings = []
        saved_strategy_settings = []

        with (
            patch.object(
                desktop_bridge.trading_settings,
                "set_trading_profile",
                return_value={"id": "smart_risk"},
            ) as set_trading_profile,
            patch.object(
                desktop_bridge.strategy_settings,
                "get_strategy_settings",
                return_value={
                    "ma_crossover": {"enabled": True},
                    "trendline_price_action": {"enabled": True},
                },
            ),
            patch.object(
                desktop_bridge.strategy_settings,
                "_save_overrides",
                side_effect=lambda settings: saved_strategy_settings.append(
                    json.loads(json.dumps(settings))
                ),
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "load_broker_settings",
                return_value=json.loads(json.dumps(existing_settings)),
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "save_broker_settings",
                side_effect=lambda settings: saved_broker_settings.append(
                    json.loads(json.dumps(settings))
                ),
            ),
            patch.object(
                desktop_bridge,
                "build_settings",
                return_value={"saved": True},
            ),
        ):
            response = desktop_bridge.save_settings(
                {
                    "active_profile": "smart_risk",
                    "strategies": {
                        "ma_crossover": False,
                        "trendline_price_action": True,
                    },
                    "brokers": {
                        "exness": True,
                        "deriv": False,
                    },
                    "broker_strategies": {
                        "exness": {
                            "ma_crossover": True,
                            "trendline_price_action": False,
                        },
                        "deriv": {
                            "stochastic_oscillator": False,
                        },
                    },
                    "broker_daily_limits": {
                        "exness": {
                            "enabled": True,
                            "target": 200,
                            "max_loss": 80,
                        },
                        "deriv": {
                            "enabled": False,
                            "target": 300,
                            "max_loss": -90,
                        },
                    },
                }
            )

        self.assertEqual(response["message"], "Settings saved.")
        self.assertEqual(response["settings"], {"saved": True})
        set_trading_profile.assert_called_once_with("smart_risk")
        self.assertEqual(
            saved_strategy_settings,
            [
                {
                    "ma_crossover": {"enabled": False},
                    "trendline_price_action": {"enabled": True},
                }
            ],
        )
        self.assertTrue(saved_broker_settings[0]["brokers"]["exness"]["enabled"])
        self.assertFalse(saved_broker_settings[0]["brokers"]["deriv"]["enabled"])
        self.assertEqual(
            saved_broker_settings[0]["brokers"]["exness"]["terminal_path"],
            r"C:\MT5\terminal64.exe",
        )
        self.assertTrue(
            saved_broker_settings[0]["brokers"]["exness"]["strategy_settings"][
                "ma_crossover"
            ]["enabled"]
        )
        self.assertFalse(
            saved_broker_settings[0]["brokers"]["exness"]["strategy_settings"][
                "trendline_price_action"
            ]["enabled"]
        )
        self.assertFalse(
            saved_broker_settings[0]["brokers"]["deriv"]["strategy_settings"][
                "stochastic_oscillator"
            ]["enabled"]
        )
        self.assertEqual(
            saved_broker_settings[0]["brokers"]["exness"]["daily_limits"],
            {
                "enabled": True,
                "target": 200.0,
                "max_loss": -80.0,
            },
        )
        self.assertEqual(
            saved_broker_settings[0]["brokers"]["deriv"]["daily_limits"],
            {
                "enabled": False,
                "target": 300.0,
                "max_loss": -90.0,
            },
        )
        self.assertEqual(
            saved_broker_settings[0]["brokers"]["deriv"]["strategy_settings"][
                "stochastic_oscillator"
            ]["method"],
            "simple",
        )

    def test_save_settings_updates_broker_credentials(self):
        existing_settings = {
            "brokers": {
                "exness": {
                    "enabled": False,
                    "label": "Exness",
                    "terminal_path": r"C:\MT5\terminal64.exe",
                    "expected_login": 123456,
                    "expected_server": "Demo",
                    "trading_profile": "regular_risk",
                    "symbols": [
                        {
                            "canonical": "EURUSD",
                            "mt5": "EURUSDm",
                            "enabled": True,
                        }
                    ],
                }
            }
        }
        saved_broker_settings = []

        with (
            patch.object(
                desktop_bridge.broker_settings,
                "load_broker_settings",
                return_value=json.loads(json.dumps(existing_settings)),
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "save_broker_settings",
                side_effect=lambda settings: saved_broker_settings.append(
                    json.loads(json.dumps(settings))
                ),
            ),
            patch.object(
                desktop_bridge,
                "build_settings",
                return_value={"saved": True},
            ),
        ):
            desktop_bridge.save_settings(
                {
                    "broker_configs": {
                        "exness": {
                            "terminal_path": r"D:\MT5\terminal64.exe",
                            "expected_login": "999001",
                            "expected_server": "Exness-Demo2",
                        }
                    }
                }
            )

        saved_broker = saved_broker_settings[0]["brokers"]["exness"]
        self.assertEqual(
            saved_broker["terminal_path"],
            r"D:\MT5\terminal64.exe",
        )
        self.assertEqual(saved_broker["expected_login"], 999001)
        self.assertEqual(saved_broker["expected_server"], "Exness-Demo2")
        self.assertEqual(saved_broker["symbols"][0]["mt5"], "EURUSDm")

    def test_save_settings_adds_new_broker_with_credentials_and_symbols(self):
        saved_broker_settings = []

        with (
            patch.object(
                desktop_bridge.broker_settings,
                "load_broker_settings",
                return_value={"brokers": {}},
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "save_broker_settings",
                side_effect=lambda settings: saved_broker_settings.append(
                    json.loads(json.dumps(settings))
                ),
            ),
            patch.object(
                desktop_bridge,
                "build_settings",
                return_value={"saved": True},
            ),
        ):
            desktop_bridge.save_settings(
                {
                    "new_brokers": [
                        {
                            "id": "new_deriv",
                            "label": "New Deriv",
                            "enabled": False,
                            "terminal_path": r"C:\Deriv\terminal64.exe",
                            "expected_login": "41052686",
                            "expected_server": "Deriv-Demo",
                            "symbols": [
                                "Boom 1000 Index",
                                "Crash 1000 Index",
                            ],
                        }
                    ]
                }
            )

        broker = saved_broker_settings[0]["brokers"]["new_deriv"]
        self.assertEqual(broker["label"], "New Deriv")
        self.assertFalse(broker["enabled"])
        self.assertEqual(broker["expected_login"], 41052686)
        self.assertEqual(broker["expected_server"], "Deriv-Demo")
        self.assertEqual(
            broker["symbols"],
            [
                {
                    "canonical": "BOOM1000INDEX",
                    "mt5": "Boom 1000 Index",
                    "enabled": True,
                },
                {
                    "canonical": "CRASH1000INDEX",
                    "mt5": "Crash 1000 Index",
                    "enabled": True,
                },
            ],
        )

    def test_save_settings_rejects_disallowed_broker_strategies(self):
        with (
            patch.object(
                desktop_bridge.strategy_settings,
                "get_strategy_settings",
                return_value={"ma_crossover": {"enabled": True}},
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "load_broker_settings",
                return_value={
                    "brokers": {
                        "deriv": {
                            "enabled": True,
                            "label": "Deriv",
                            "strategy_settings": {
                                "stochastic_oscillator": {
                                    "enabled": True,
                                }
                            },
                        }
                    }
                },
            ),
        ):
            with self.assertRaisesRegex(ValueError, "not allowed"):
                desktop_bridge.save_settings(
                    {
                        "broker_strategies": {
                            "deriv": {
                                "ma_crossover": True,
                            }
                        }
                    }
                )

    def test_save_settings_updates_manual_broker_trade_count_with_cap(self):
        existing_settings = {
            "brokers": {
                "deriv": {
                    "enabled": True,
                    "label": "Deriv",
                    "strategy_settings": {
                        "stochastic_oscillator": {
                            "enabled": True,
                            "trades_per_signal": 5,
                            "max_positions_per_symbol": 25,
                        }
                    },
                }
            }
        }
        saved_broker_settings = []

        with (
            patch.object(
                desktop_bridge.broker_settings,
                "load_broker_settings",
                return_value=json.loads(json.dumps(existing_settings)),
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "save_broker_settings",
                side_effect=lambda settings: saved_broker_settings.append(
                    json.loads(json.dumps(settings))
                ),
            ),
            patch.object(
                desktop_bridge,
                "build_settings",
                return_value={"saved": True},
            ),
        ):
            desktop_bridge.save_settings(
                {
                    "broker_strategies": {
                        "deriv": {
                            "stochastic_oscillator": {
                                "enabled": True,
                                "trades_per_signal": 30,
                            }
                        }
                    }
                }
            )

        strategy = (
            saved_broker_settings[0]["brokers"]["deriv"][
                "strategy_settings"
            ]["stochastic_oscillator"]
        )
        self.assertTrue(strategy["enabled"])
        self.assertEqual(strategy["trades_per_signal"], 25)
        self.assertEqual(strategy["max_positions_per_symbol"], 25)

    def test_save_settings_rejects_disabling_all_global_strategies(self):
        with patch.object(
            desktop_bridge.strategy_settings,
            "get_strategy_settings",
            return_value={
                "ma_crossover": {"enabled": True},
                "trendline_price_action": {"enabled": True},
            },
        ):
            with self.assertRaisesRegex(
                ValueError,
                "At least one strategy must stay enabled",
            ):
                desktop_bridge.save_settings(
                    {
                        "strategies": {
                            "ma_crossover": False,
                            "trendline_price_action": False,
                        }
                    }
                )

    def test_save_settings_rejects_unknown_broker_ids(self):
        with (
            patch.object(
                desktop_bridge.strategy_settings,
                "get_strategy_settings",
                return_value={"ma_crossover": {"enabled": True}},
            ),
            patch.object(
                desktop_bridge.broker_settings,
                "load_broker_settings",
                return_value={"brokers": {"exness": {"enabled": False}}},
            ),
        ):
            with self.assertRaisesRegex(ValueError, "Unknown broker"):
                desktop_bridge.save_settings(
                    {
                        "strategies": {"ma_crossover": True},
                        "brokers": {"unknown": True},
                    }
                )

    def test_main_save_settings_reads_json_payload_from_stdin(self):
        with (
            patch("sys.stdin", io.StringIO('{"active_profile":"regular_risk"}')),
            patch.object(
                desktop_bridge,
                "save_settings",
                return_value={"message": "Settings saved."},
            ) as save_settings,
        ):
            output = io.StringIO()

            with redirect_stdout(output):
                exit_code = desktop_bridge.main(["save-settings"])

        self.assertEqual(exit_code, 0)
        save_settings.assert_called_once_with({"active_profile": "regular_risk"})
        self.assertEqual(
            json.loads(output.getvalue()),
            {"message": "Settings saved."},
        )


if __name__ == "__main__":
    unittest.main()
