import unittest
from unittest.mock import patch

import pandas as pd

from backtesting import backtester
from trading import broker_runtime


def _broker(
    broker_id,
    *,
    enabled=True,
    symbol="EURUSDm",
    strategy_id="ma_crossover",
):
    return {
        "id": broker_id,
        "label": broker_id.title(),
        "enabled": enabled,
        "terminal_path": r"C:\MT5\terminal64.exe",
        "expected_login": 123456,
        "expected_server": "Demo",
        "symbols": [
            {
                "canonical": symbol.upper(),
                "mt5": symbol,
                "enabled": True,
            }
        ],
        "strategy_settings": {
            strategy_id: {
                "enabled": True,
                "timeframe": "M5",
                "recommended_timeframes": ["M5"],
            }
        },
    }


def _strategy(strategy_id):
    return {
        "id": strategy_id,
        "name": strategy_id.replace("_", " ").title(),
        "comment_code": "TST",
        "enabled": True,
        "timeframe": "M5",
        "timeframe_code": 5,
        "timeframe_seconds": 300,
        "recommended_timeframes": ["M5"],
        "bars": 20,
        "trades_per_signal": 1,
    }


def _frame(length=30):
    closes = [
        100.0 + index
        for index in range(length)
    ]

    return pd.DataFrame(
        {
            "time": list(range(1, length + 1)),
            "open": closes,
            "high": [
                close + 1.0
                for close in closes
            ],
            "low": [
                close - 1.0
                for close in closes
            ],
            "close": closes,
        }
    )


class BrokerBacktesterTests(unittest.TestCase):
    def tearDown(self):
        broker_runtime.clear_active_broker()

    def test_backtest_runs_each_broker_with_its_broker_strategy_context(self):
        brokers = [
            _broker(
                "exness",
                symbol="EURUSDm",
                strategy_id="ma_crossover",
            ),
            _broker(
                "deriv",
                symbol="Crash 1000 Index",
                strategy_id="stochastic_oscillator",
            ),
        ]
        contexts = []

        def enabled_strategies():
            broker = broker_runtime.get_active_broker()
            strategy_id = next(
                iter(broker["strategy_settings"])
            )
            return [_strategy(strategy_id)]

        def data_provider(_broker, _symbol, _strategy, _bars):
            return _frame()

        def evaluate(symbol, strategy, df, cycle_context=None):
            broker = broker_runtime.get_active_broker()
            contexts.append(
                (
                    broker["id"],
                    symbol,
                    strategy["id"],
                    len(df),
                )
            )

            if len(df) == 20:
                return {
                    "signal": "BUY",
                    "price": float(df.iloc[-1]["close"]),
                    "reason": "test signal",
                    "context": {},
                }

            return None

        with (
            patch.object(
                backtester.broker_settings,
                "get_all_brokers",
                return_value=brokers,
            ),
            patch.object(
                backtester.broker_settings,
                "validate_broker_config",
                return_value={
                    "valid": True,
                    "errors": [],
                    "warnings": [],
                },
            ),
            patch.object(
                backtester.strategy_engine,
                "get_enabled_strategies",
                side_effect=enabled_strategies,
            ),
            patch.object(
                backtester.strategy_engine,
                "evaluate_strategy_signal",
                side_effect=evaluate,
            ),
        ):
            report = backtester.run_broker_backtest(
                {
                    "broker_ids": ["exness", "deriv"],
                    "bars": 30,
                    "include_disabled": True,
                },
                data_provider=data_provider,
            )

        self.assertEqual(report["summary"]["broker_count"], 2)
        self.assertEqual(report["summary"]["trade_count"], 2)
        self.assertIn(
            ("exness", "EURUSDm", "ma_crossover", 20),
            contexts,
        )
        self.assertIn(
            (
                "deriv",
                "Crash 1000 Index",
                "stochastic_oscillator",
                20,
            ),
            contexts,
        )

    def test_backtest_skips_disabled_brokers_unless_requested(self):
        brokers = [
            _broker("exness", enabled=False),
            _broker("deriv", symbol="Crash 1000 Index"),
        ]

        with (
            patch.object(
                backtester.broker_settings,
                "get_all_brokers",
                return_value=brokers,
            ),
            patch.object(
                backtester.broker_settings,
                "validate_broker_config",
                return_value={
                    "valid": True,
                    "errors": [],
                    "warnings": [],
                },
            ),
            patch.object(
                backtester.strategy_engine,
                "get_enabled_strategies",
                return_value=[_strategy("stochastic_oscillator")],
            ),
        ):
            report = backtester.run_broker_backtest(
                {"bars": 30},
                data_provider=lambda *_args: _frame(),
            )

        self.assertEqual(
            [
                broker["id"]
                for broker in report["brokers"]
            ],
            ["deriv"],
        )


if __name__ == "__main__":
    unittest.main()
