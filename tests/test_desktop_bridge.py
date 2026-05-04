import io
import json
import unittest
from contextlib import redirect_stdout
from types import SimpleNamespace
from unittest.mock import patch

from trading import desktop_bridge


def _broker(
    broker_id,
    *,
    enabled=True,
    symbols=None,
    terminal_path=r"C:\MT5\terminal64.exe",
):
    return {
        "id": broker_id,
        "label": broker_id.title(),
        "enabled": enabled,
        "terminal_path": terminal_path,
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


class DesktopBridgeTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
