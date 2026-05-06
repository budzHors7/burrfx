import types
import unittest
from unittest.mock import patch

from trading import broker_runtime
from trading import market_filters


class DerivSpreadFilterTests(unittest.TestCase):
    def tearDown(self):
        broker_runtime.clear_active_broker()

    def _fake_mt5(self, bid=1000.0, ask=1018.0, point=0.001):
        return types.SimpleNamespace(
            symbol_info_tick=lambda _symbol: types.SimpleNamespace(
                bid=bid,
                ask=ask,
            ),
            symbol_info=lambda _symbol: types.SimpleNamespace(
                point=point,
            ),
        )

    def _settings(self):
        return {
            "id": "regular_risk",
            "max_spread_points": 30,
            "bypass_spread_filter": False,
        }

    def test_deriv_uses_broker_spread_cap_for_synthetic_indices(self):
        broker_runtime.set_active_broker(
            {
                "id": "deriv",
                "label": "Deriv",
                "max_spread_points": 25000,
            }
        )

        with (
            patch.object(
                market_filters,
                "mt5",
                self._fake_mt5(),
            ),
            patch.object(
                market_filters,
                "get_trading_settings",
                return_value=self._settings(),
            ),
            patch.object(market_filters, "log_event"),
        ):
            self.assertTrue(
                market_filters.check_spread(
                    "Boom 1000 Index"
                )
            )

    def test_non_deriv_keeps_profile_spread_cap(self):
        broker_runtime.set_active_broker(
            {
                "id": "exness",
                "label": "Exness",
                "max_spread_points": 25000,
            }
        )

        with (
            patch.object(
                market_filters,
                "mt5",
                self._fake_mt5(),
            ),
            patch.object(
                market_filters,
                "get_trading_settings",
                return_value=self._settings(),
            ),
            patch.object(market_filters, "log_event"),
        ):
            self.assertFalse(
                market_filters.check_spread(
                    "EURUSDm"
                )
            )


if __name__ == "__main__":
    unittest.main()
