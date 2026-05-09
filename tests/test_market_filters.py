import types
import unittest
from datetime import datetime
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


class DerivMarketHoursTests(unittest.TestCase):
    def tearDown(self):
        broker_runtime.clear_active_broker()

    def _settings(self):
        return {
            "id": "regular_risk",
            "bypass_session_filter": False,
        }

    def test_deriv_market_is_open_on_weekends(self):
        broker_runtime.set_active_broker(
            {
                "id": "deriv",
                "label": "Deriv",
            }
        )

        with (
            patch.object(
                market_filters,
                "datetime",
                types.SimpleNamespace(
                    now=lambda: datetime(2026, 5, 9, 12, 0)
                ),
            ),
            patch.object(market_filters, "log_event"),
        ):
            self.assertTrue(
                market_filters.is_market_open()
            )

    def test_exness_market_stays_closed_on_weekends(self):
        broker_runtime.set_active_broker(
            {
                "id": "exness",
                "label": "Exness",
            }
        )

        with (
            patch.object(
                market_filters,
                "datetime",
                types.SimpleNamespace(
                    now=lambda: datetime(2026, 5, 9, 12, 0)
                ),
            ),
            patch.object(market_filters, "log_event"),
        ):
            self.assertFalse(
                market_filters.is_market_open()
            )

    def test_deriv_bypasses_session_hours(self):
        broker_runtime.set_active_broker(
            {
                "id": "deriv",
                "label": "Deriv",
            }
        )

        with (
            patch.object(
                market_filters,
                "datetime",
                types.SimpleNamespace(
                    now=lambda: datetime(2026, 5, 9, 2, 0)
                ),
            ),
            patch.object(
                market_filters,
                "get_trading_settings",
                return_value=self._settings(),
            ),
            patch.object(market_filters, "log_event"),
        ):
            self.assertTrue(
                market_filters.is_within_sessions()
            )
            self.assertEqual(
                market_filters.get_active_session_label(),
                "ALL HOURS",
            )


if __name__ == "__main__":
    unittest.main()
