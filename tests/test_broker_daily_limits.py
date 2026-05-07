import copy
import unittest
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


if __name__ == "__main__":
    unittest.main()
