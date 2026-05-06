import json
import os
import tempfile
import unittest
from unittest.mock import patch

import pandas as pd

from trading import broker_runtime
from trading import broker_settings
from trading import strategy_settings
from trading import strategy_engine


def _strategy(include_levels=True):
    strategy = {
        "id": "stochastic_oscillator",
        "name": "Stochastic Oscillator",
        "comment_code": "STO",
        "timeframe": "M5",
        "timeframe_seconds": 5 * 60,
        "recommended_timeframes": [
            "M5",
        ],
        "k_period": 5,
        "d_period": 3,
        "slowing": 3,
        "price_field": "low_high",
        "method": "simple",
    }

    if include_levels:
        strategy["upper_level"] = 75
        strategy["lower_level"] = 25

    return strategy


def _frame(closes, *, high=100.0, low=0.0):
    return pd.DataFrame(
        {
            "time": list(range(1, len(closes) + 1)),
            "open": closes,
            "high": [high] * len(closes),
            "low": [low] * len(closes),
            "close": closes,
        }
    )


class StochasticOscillatorSignalTests(unittest.TestCase):
    def setUp(self):
        strategy_engine.LAST_EVALUATED_CANDLES.clear()

    def tearDown(self):
        broker_runtime.clear_active_broker()

    def _evaluate(self, closes, symbol="Boom 1000 Index"):
        return strategy_engine.evaluate_strategy_signal(
            symbol,
            _strategy(),
            _frame(closes),
        )

    def test_sell_signal_when_main_crosses_below_signal_above_75(self):
        signal = self._evaluate(
            ([100.0] * 22)
            + [
                100.0,
                100.0,
                30.0,
            ]
        )

        self.assertIsNotNone(signal)
        self.assertEqual(signal["signal"], "SELL")
        self.assertEqual(signal["comment_code"], "STO")
        self.assertEqual(
            signal["context"]["setup"],
            "stochastic_oscillator",
        )
        self.assertGreaterEqual(
            signal["context"]["main"],
            75,
        )
        self.assertLess(signal["context"]["main"], 80)
        self.assertGreaterEqual(
            signal["context"]["signal"],
            75,
        )
        self.assertIn("75 level", signal["reason"])

    def test_no_sell_signal_when_cross_leaves_overbought_zone(self):
        signal = self._evaluate(
            ([100.0] * 22)
            + [
                100.0,
                100.0,
                10.0,
            ]
        )

        self.assertIsNone(signal)

    def test_buy_signal_when_main_crosses_above_signal_below_25(self):
        signal = self._evaluate(
            ([0.0] * 22)
            + [
                0.0,
                0.0,
                70.0,
            ],
            symbol="Crash 1000 Index",
        )

        self.assertIsNotNone(signal)
        self.assertEqual(signal["signal"], "BUY")
        self.assertEqual(signal["comment_code"], "STO")
        self.assertLessEqual(
            signal["context"]["main"],
            25,
        )
        self.assertGreater(signal["context"]["main"], 20)
        self.assertLessEqual(
            signal["context"]["signal"],
            25,
        )
        self.assertIn("25 level", signal["reason"])

    def test_no_buy_signal_when_cross_leaves_oversold_zone(self):
        signal = self._evaluate(
            ([0.0] * 22)
            + [
                0.0,
                0.0,
                90.0,
            ],
            symbol="Crash 1000 Index",
        )

        self.assertIsNone(signal)

    def test_no_signal_when_crossover_is_outside_extreme_zones(self):
        signal = self._evaluate(
            ([50.0] * 22)
            + [
                50.0,
                50.0,
                30.0,
            ]
        )

        self.assertIsNone(signal)

    def test_no_signal_when_level_crosses_without_main_signal_crossover(self):
        with patch.object(
            strategy_engine,
            "log_event",
        ) as log_event_mock:
            broker_runtime.set_active_broker(
                {
                    "id": "deriv",
                    "label": "Deriv",
                }
            )
            signal = self._evaluate(
                ([0.0] * 18)
                + [
                    0.0,
                    0.0,
                    0.0,
                    40.0,
                    100.0,
                    100.0,
                    0.0,
                ]
            )

        self.assertIsNone(signal)
        diagnostic_events = [
            call
            for call in log_event_mock.call_args_list
            if call.args
            and call.args[0] == "deriv_stochastic_diagnostic"
        ]
        self.assertEqual(len(diagnostic_events), 1)
        diagnostic = diagnostic_events[0].kwargs
        self.assertEqual(
            diagnostic["decision"],
            "no_signal",
        )
        self.assertIn(
            "cross",
            diagnostic["decision_reason"],
        )

    def test_no_signal_when_stochastic_range_is_zero(self):
        signal = strategy_engine.evaluate_strategy_signal(
            "Boom 1000 Index",
            _strategy(),
            _frame([50.0] * 25, high=50.0, low=50.0),
        )

        self.assertIsNone(signal)

    def test_deriv_crash_ignores_overbought_sell_cross(self):
        broker_runtime.set_active_broker(
            {
                "id": "deriv",
                "label": "Deriv",
            }
        )

        signal = self._evaluate(
            ([100.0] * 22)
            + [
                100.0,
                100.0,
                30.0,
            ],
            symbol="Crash 1000 Index",
        )

        self.assertIsNone(signal)

    def test_deriv_boom_ignores_oversold_buy_cross(self):
        broker_runtime.set_active_broker(
            {
                "id": "deriv",
                "label": "Deriv",
            }
        )

        signal = self._evaluate(
            ([0.0] * 22)
            + [
                0.0,
                0.0,
                70.0,
            ],
            symbol="Boom 1000 Index",
        )

        self.assertIsNone(signal)

    def test_default_stochastic_levels_are_25_and_75(self):
        signal = strategy_engine.evaluate_strategy_signal(
            "Crash 1000 Index",
            _strategy(include_levels=False),
            _frame(
                ([0.0] * 22)
                + [
                    0.0,
                    0.0,
                    70.0,
                ]
            ),
        )

        self.assertIsNotNone(signal)
        self.assertEqual(signal["signal"], "BUY")
        self.assertEqual(
            strategy_engine.DEFAULT_STRATEGIES[
                "stochastic_oscillator"
            ]["upper_level"],
            75,
        )
        self.assertEqual(
            strategy_engine.DEFAULT_STRATEGIES[
                "stochastic_oscillator"
            ]["lower_level"],
            25,
        )
        self.assertEqual(
            strategy_settings.DEFAULT_BROKER_STRATEGY_SETTINGS[
                "deriv"
            ]["stochastic_oscillator"]["upper_level"],
            75,
        )
        self.assertEqual(
            strategy_settings.DEFAULT_BROKER_STRATEGY_SETTINGS[
                "deriv"
            ]["stochastic_oscillator"]["lower_level"],
            25,
        )


class BrokerStrategyConfigTests(unittest.TestCase):
    def tearDown(self):
        broker_runtime.clear_active_broker()

    def test_deriv_default_strategy_setting_selects_stochastic(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            settings_path = os.path.join(
                temp_dir,
                "broker_settings.json",
            )

            with patch.object(
                broker_settings,
                "SETTINGS_FILE",
                settings_path,
            ):
                broker = broker_settings.get_broker("deriv")

        self.assertFalse(
            broker_settings.broker_requires_strategy_pause(broker)
        )
        self.assertEqual(
            list(broker["strategy_settings"].keys()),
            ["stochastic_oscillator"],
        )
        self.assertTrue(
            broker["strategy_settings"][
                "stochastic_oscillator"
            ]["enabled"]
        )

    def test_deriv_pause_requires_enabled_allowed_broker_strategy(self):
        broker = {
            "id": "deriv",
        }

        for strategy_settings in (
            {},
            {
                "stochastic_oscillator": {
                    "enabled": False,
                }
            },
            {
                "ma_crossover": {
                    "enabled": True,
                }
            },
        ):
            with self.subTest(strategy_settings=strategy_settings):
                self.assertTrue(
                    broker_settings.broker_requires_strategy_pause(
                        {
                            **broker,
                            "strategy_settings": strategy_settings,
                        }
                    )
                )

        self.assertFalse(
            broker_settings.broker_requires_strategy_pause(
                {
                    **broker,
                    "strategy_settings": {
                        "stochastic_oscillator": {
                            "enabled": True,
                        }
                    },
                }
            )
        )

    def test_deriv_active_broker_uses_only_selected_strategy(self):
        broker_runtime.set_active_broker(
            {
                "id": "deriv",
                "strategy_settings": {
                    "stochastic_oscillator": {
                        "enabled": True,
                        "timeframe": "M5",
                    }
                },
            }
        )

        strategy_ids = [
            strategy["id"]
            for strategy in strategy_engine.get_enabled_strategies()
        ]

        self.assertEqual(
            strategy_ids,
            ["stochastic_oscillator"],
        )
        self.assertEqual(
            strategy_engine.get_enabled_strategies()[0]["timeframe"],
            "M5",
        )
        self.assertEqual(
            strategy_engine.get_strategy_cycle_timeframe_label(),
            "M5",
        )
        self.assertEqual(
            strategy_engine.get_enabled_strategies()[0][
                "trades_per_signal"
            ],
            5,
        )
        self.assertFalse(
            strategy_engine.get_enabled_strategies()[0][
                "use_take_profit"
            ]
        )

    def test_deriv_signal_carries_five_trade_batch_setting(self):
        broker_runtime.set_active_broker(
            {
                "id": "deriv",
                "strategy_settings": {
                    "stochastic_oscillator": {
                        "enabled": True,
                    }
                },
            }
        )

        signal = strategy_engine.evaluate_strategy_signal(
            "Crash 1000 Index",
            strategy_engine.get_enabled_strategies()[0],
            _frame(
                ([0.0] * 22)
                + [
                    0.0,
                    0.0,
                    70.0,
                ]
            ),
        )

        self.assertIsNotNone(signal)
        self.assertEqual(
            signal["trades_per_signal"],
            5,
        )
        self.assertFalse(
            signal["execution_overrides"]["use_take_profit"]
        )

    def test_deriv_active_broker_respects_disabled_strategy_option(self):
        broker_runtime.set_active_broker(
            {
                "id": "deriv",
                "strategy_settings": {
                    "stochastic_oscillator": {
                        "enabled": False,
                    }
                },
            }
        )

        self.assertEqual(
            strategy_engine.get_enabled_strategies(),
            [],
        )

    def test_exness_active_broker_does_not_get_deriv_stochastic(self):
        broker_runtime.set_active_broker(
            {
                "id": "exness",
            }
        )

        strategy_ids = [
            strategy["id"]
            for strategy in strategy_engine.get_enabled_strategies()
        ]

        self.assertNotIn(
            "stochastic_oscillator",
            strategy_ids,
        )

    def test_broker_settings_json_can_select_deriv_strategy(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            settings_path = os.path.join(
                temp_dir,
                "broker_settings.json",
            )
            with open(
                settings_path,
                "w",
                encoding="utf-8",
            ) as file:
                json.dump(
                    {
                        "brokers": {
                            "deriv": {
                                "strategy_settings": {
                                    "stochastic_oscillator": {
                                        "enabled": True,
                                    }
                                }
                            }
                        }
                    },
                    file,
                )

            with patch.object(
                broker_settings,
                "SETTINGS_FILE",
                settings_path,
            ):
                broker = broker_settings.get_broker("deriv")

        self.assertEqual(
            broker["strategy_settings"][
                "stochastic_oscillator"
            ]["enabled"],
            True,
        )


if __name__ == "__main__":
    unittest.main()
