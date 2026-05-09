import copy
import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from trading import broker_settings


class BrokerDailyLimitsTests(unittest.TestCase):
    def test_normalizes_daily_limits_from_defaults_and_loaded_config(self):
        loaded = copy.deepcopy(broker_settings.DEFAULT_SETTINGS)
        loaded["brokers"]["deriv"]["daily_limits"] = {
            "enabled": True,
            "target": "250.50",
            "max_loss": "125.25",
        }

        with (
            patch.object(
                broker_settings,
                "SETTINGS_FILE",
                "missing-broker-settings.json",
            ),
            patch.object(
                broker_settings.os.path,
                "exists",
                return_value=True,
            ),
            patch(
                "builtins.open",
                unittest.mock.mock_open(),
            ) as open_mock,
            patch.object(
                broker_settings.json,
                "load",
                return_value=loaded,
            ),
        ):
            settings = broker_settings.load_broker_settings()

        self.assertTrue(open_mock.called)
        self.assertEqual(
            settings["brokers"]["deriv"]["daily_limits"],
            {
                "enabled": True,
                "target": 250.5,
                "max_loss": -125.25,
            },
        )
        self.assertEqual(
            settings["brokers"]["exness"]["daily_limits"],
            {
                "enabled": True,
                "target": 150.0,
                "max_loss": -100.0,
            },
        )

    def test_known_broker_numeric_label_falls_back_to_default_name(self):
        loaded = copy.deepcopy(broker_settings.DEFAULT_SETTINGS)
        loaded["brokers"]["deriv"]["label"] = "2"

        with (
            patch.object(
                broker_settings,
                "SETTINGS_FILE",
                "missing-broker-settings.json",
            ),
            patch.object(
                broker_settings.os.path,
                "exists",
                return_value=True,
            ),
            patch(
                "builtins.open",
                unittest.mock.mock_open(),
            ),
            patch.object(
                broker_settings.json,
                "load",
                return_value=loaded,
            ),
        ):
            broker = broker_settings.get_broker("deriv")

        self.assertEqual(broker["label"], "Deriv")

    def test_set_broker_daily_limits_persists_normalized_values(self):
        settings = copy.deepcopy(broker_settings.DEFAULT_SETTINGS)
        saved = []

        with (
            patch.object(
                broker_settings,
                "load_broker_settings",
                return_value=settings,
            ),
            patch.object(
                broker_settings,
                "save_broker_settings",
                side_effect=lambda payload: saved.append(
                    copy.deepcopy(payload)
                ),
            ),
        ):
            result = broker_settings.set_broker_daily_limits(
                "deriv",
                {
                    "enabled": False,
                    "target": 300,
                    "max_loss": 90,
                },
            )

        self.assertEqual(
            result,
            {
                "enabled": False,
                "target": 300.0,
                "max_loss": -90.0,
            },
        )
        self.assertEqual(
            saved[0]["brokers"]["deriv"]["daily_limits"],
            result,
        )

    def test_rejects_invalid_daily_limits(self):
        with self.assertRaisesRegex(ValueError, "Daily target"):
            broker_settings.normalize_daily_limits(
                {
                    "enabled": True,
                    "target": 0,
                    "max_loss": -50,
                }
            )

        with self.assertRaisesRegex(ValueError, "Daily loss"):
            broker_settings.normalize_daily_limits(
                {
                    "enabled": True,
                    "target": 100,
                    "max_loss": 0,
                }
            )

    def test_set_broker_strategy_trade_count_clamps_to_strategy_cap(self):
        settings = copy.deepcopy(broker_settings.DEFAULT_SETTINGS)
        saved = []

        with (
            patch.object(
                broker_settings,
                "load_broker_settings",
                return_value=settings,
            ),
            patch.object(
                broker_settings,
                "save_broker_settings",
                side_effect=lambda payload: saved.append(
                    copy.deepcopy(payload)
                ),
            ),
        ):
            result = broker_settings.set_broker_strategy_trade_count(
                "deriv",
                "stochastic_oscillator",
                30,
            )

        self.assertEqual(result["trades_per_signal"], 25)
        self.assertEqual(result["max_positions_per_symbol"], 25)
        self.assertEqual(
            saved[0]["brokers"]["deriv"]["strategy_settings"][
                "stochastic_oscillator"
            ]["trades_per_signal"],
            25,
        )

    def test_set_broker_strategy_trade_mode_persists_both(self):
        settings = copy.deepcopy(broker_settings.DEFAULT_SETTINGS)
        saved = []

        with (
            patch.object(
                broker_settings,
                "load_broker_settings",
                return_value=settings,
            ),
            patch.object(
                broker_settings,
                "save_broker_settings",
                side_effect=lambda payload: saved.append(
                    copy.deepcopy(payload)
                ),
            ),
        ):
            result = broker_settings.set_broker_strategy_trade_mode(
                "deriv",
                "stochastic_oscillator",
                "both",
            )

        self.assertEqual(result["trade_mode"], "both")
        self.assertEqual(
            saved[0]["brokers"]["deriv"]["strategy_settings"][
                "stochastic_oscillator"
            ]["trade_mode"],
            "both",
        )

    def test_set_broker_strategy_trade_mode_rejects_invalid_mode(self):
        settings = copy.deepcopy(broker_settings.DEFAULT_SETTINGS)

        with patch.object(
            broker_settings,
            "load_broker_settings",
            return_value=settings,
        ):
            with self.assertRaisesRegex(ValueError, "trade mode"):
                broker_settings.set_broker_strategy_trade_mode(
                    "deriv",
                    "stochastic_oscillator",
                    "reverse",
                )

    def test_set_broker_connection_config_persists_login_server_and_path(self):
        settings = copy.deepcopy(broker_settings.DEFAULT_SETTINGS)
        saved = []

        with (
            patch.object(
                broker_settings,
                "load_broker_settings",
                return_value=settings,
            ),
            patch.object(
                broker_settings,
                "save_broker_settings",
                side_effect=lambda payload: saved.append(
                    copy.deepcopy(payload)
                ),
            ),
        ):
            result = broker_settings.set_broker_connection_config(
                "deriv",
                {
                    "terminal_path": r" C:\Deriv\terminal64.exe ",
                    "expected_login": "41052686",
                    "expected_server": " Deriv-Demo ",
                },
            )

        self.assertEqual(result["terminal_path"], r"C:\Deriv\terminal64.exe")
        self.assertEqual(result["expected_login"], 41052686)
        self.assertEqual(result["expected_server"], "Deriv-Demo")
        self.assertEqual(
            saved[0]["brokers"]["deriv"]["terminal_path"],
            r"C:\Deriv\terminal64.exe",
        )
        self.assertEqual(
            saved[0]["brokers"]["deriv"]["expected_login"],
            41052686,
        )
        self.assertEqual(
            saved[0]["brokers"]["deriv"]["expected_server"],
            "Deriv-Demo",
        )

    def test_set_broker_connection_config_rejects_invalid_login(self):
        settings = copy.deepcopy(broker_settings.DEFAULT_SETTINGS)

        with patch.object(
            broker_settings,
            "load_broker_settings",
            return_value=settings,
        ):
            with self.assertRaisesRegex(ValueError, "Expected login"):
                broker_settings.set_broker_connection_config(
                    "deriv",
                    {
                        "expected_login": "abc",
                    },
                )

    def test_broker_settings_menu_routes_connection_editor(self):
        brokers = [
            {
                "id": "deriv",
                "label": "Deriv",
                "enabled": False,
                "terminal_path": "",
                "expected_login": None,
                "expected_server": "",
                "symbols": [],
                "daily_limits": broker_settings.DEFAULT_DAILY_LIMITS.copy(),
                "strategy_settings": {},
            }
        ]

        with redirect_stdout(io.StringIO()):
            with (
                patch.object(
                    broker_settings,
                    "get_all_brokers",
                    return_value=brokers,
                ),
                patch.object(
                    broker_settings,
                    "clear_screen",
                ),
                patch.object(
                    broker_settings,
                    "show_logo",
                ),
                patch.object(
                    broker_settings,
                    "pause",
                ),
                patch.object(
                    broker_settings,
                    "_broker_connection_menu",
                ) as connection_menu,
                patch(
                    "builtins.input",
                    side_effect=["C", "B"],
                ),
            ):
                broker_settings.broker_settings_menu()

        connection_menu.assert_called_once_with(brokers)

    def test_broker_settings_menu_routes_trade_mode_editor(self):
        brokers = [
            {
                "id": "deriv",
                "label": "Deriv",
                "enabled": False,
                "terminal_path": "",
                "expected_login": None,
                "expected_server": "",
                "symbols": [],
                "daily_limits": broker_settings.DEFAULT_DAILY_LIMITS.copy(),
                "strategy_settings": {},
            }
        ]

        with redirect_stdout(io.StringIO()):
            with (
                patch.object(
                    broker_settings,
                    "get_all_brokers",
                    return_value=brokers,
                ),
                patch.object(
                    broker_settings,
                    "clear_screen",
                ),
                patch.object(
                    broker_settings,
                    "show_logo",
                ),
                patch.object(
                    broker_settings,
                    "pause",
                ),
                patch.object(
                    broker_settings,
                    "_strategy_trade_mode_menu",
                ) as trade_mode_menu,
                patch(
                    "builtins.input",
                    side_effect=["M", "B"],
                ),
            ):
                broker_settings.broker_settings_menu()

        trade_mode_menu.assert_called_once_with(brokers)


if __name__ == "__main__":
    unittest.main()
