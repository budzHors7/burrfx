import sys
import types
import unittest


mt5_stub = types.SimpleNamespace(
    TIMEFRAME_M1=1,
    TIMEFRAME_M5=5,
    TIMEFRAME_M15=15,
    TIMEFRAME_M30=30,
    TIMEFRAME_H1=60,
    TIMEFRAME_H4=240,
    TIMEFRAME_D1=1440,
    last_error=lambda: (0, "OK")
)
sys.modules.setdefault("MetaTrader5", mt5_stub)

from trading import strategy_engine as engine


def make_event(
    name,
    actual,
    consensus,
    *,
    event_id="event-1",
    currency="USD",
    previous=None,
    unit=None,
    is_better_than_expected=None
):
    return {
        "id": event_id,
        "event_id": event_id,
        "name": name,
        "currency_code": currency,
        "date_utc": "2026-04-24T10:00:00+00:00",
        "actual": actual,
        "consensus": consensus,
        "previous": previous,
        "unit": unit,
        "is_better_than_expected": is_better_than_expected
    }


class NewsStrategyTests(unittest.TestCase):

    def setUp(self):
        engine.PROCESSED_NEWS_SIGNALS.clear()
        engine.log_event = lambda *args, **kwargs: None

    def test_parse_news_values_with_suffixes_and_percentages(self):
        self.assertEqual(engine._parse_news_value("256K"), 256000)
        self.assertEqual(engine._parse_news_value("1.2M"), 1200000)
        self.assertEqual(engine._parse_news_value("-0.1%"), -0.1)
        self.assertEqual(engine._parse_news_value("3,450"), 3450)
        self.assertIsNone(engine._parse_news_value("final"))

    def test_hot_cpi_bullish_usd_sells_eurusd_and_sells_ustec(self):
        event = make_event(
            "CPI YoY",
            "3.5%",
            "3.4%",
            event_id="cpi-eurusd",
            unit="%"
        )

        signal, _, context = engine.check_high_impact_news(
            "EURUSD",
            None,
            {"news_events": [event], "provider": "fxstreet"}
        )

        self.assertEqual(signal, "SELL")
        self.assertEqual(context["event_class"], "hawkish")
        self.assertEqual(context["decision_source"], "actual_vs_forecast")
        self.assertAlmostEqual(context["surprise"], 0.1)

        ustec_event = dict(event, id="cpi-ustec", event_id="cpi-ustec")
        signal, _, _ = engine.check_high_impact_news(
            "USTECm",
            None,
            {"news_events": [ustec_event], "provider": "fxstreet"}
        )

        self.assertEqual(signal, "SELL")

    def test_payrolls_better_than_forecast_buys_usdjpy_and_ustec(self):
        event = make_event(
            "Nonfarm Payrolls",
            "260K",
            "200K",
            event_id="nfp-usdjpy"
        )

        signal, _, context = engine.check_high_impact_news(
            "USDJPY",
            None,
            {"news_events": [event], "provider": "fxstreet"}
        )

        self.assertEqual(signal, "BUY")
        self.assertEqual(context["event_class"], "risk_on")

        ustec_event = dict(event, id="nfp-ustec", event_id="nfp-ustec")
        signal, _, _ = engine.check_high_impact_news(
            "USTECm",
            None,
            {"news_events": [ustec_event], "provider": "fxstreet"}
        )

        self.assertEqual(signal, "BUY")

    def test_higher_jobless_claims_is_bearish_for_usd_and_indices(self):
        event = make_event(
            "Initial Jobless Claims",
            "245K",
            "220K",
            event_id="claims-usdjpy"
        )

        signal, _, context = engine.check_high_impact_news(
            "USDJPY",
            None,
            {"news_events": [event], "provider": "fxstreet"}
        )

        self.assertEqual(signal, "SELL")
        self.assertEqual(context["event_class"], "inverse")
        self.assertFalse(context["currency_bullish"])

        us30_event = dict(event, id="claims-us30", event_id="claims-us30")
        signal, _, _ = engine.check_high_impact_news(
            "US30m",
            None,
            {"news_events": [us30_event], "provider": "fxstreet"}
        )

        self.assertEqual(signal, "SELL")

    def test_below_threshold_surprise_does_not_trade(self):
        event = make_event(
            "Nonfarm Payrolls",
            "203K",
            "200K",
            event_id="small-nfp"
        )

        signal, reason, context = engine.check_high_impact_news(
            "USDJPY",
            None,
            {"news_events": [event], "provider": "fxstreet"}
        )

        self.assertIsNone(signal)
        self.assertIsNone(reason)
        self.assertEqual(context, {})

    def test_provider_flag_is_fallback_when_values_cannot_be_parsed(self):
        event = make_event(
            "Unexpected Economic Event",
            "final",
            "preliminary",
            event_id="provider-fallback",
            is_better_than_expected=True
        )

        signal, _, context = engine.check_high_impact_news(
            "EURUSD",
            None,
            {"news_events": [event], "provider": "fxstreet"}
        )

        self.assertEqual(signal, "SELL")
        self.assertEqual(context["decision_source"], "provider_flag")
        self.assertEqual(context["event_class"], "provider_fallback")

    def test_processed_news_event_only_trades_once_per_symbol(self):
        event = make_event(
            "GDP QoQ",
            "1.2%",
            "1.0%",
            event_id="duplicate-gdp",
            unit="%"
        )
        cycle_context = {
            "news_events": [event],
            "provider": "fxstreet"
        }

        first_signal, _, _ = engine.check_high_impact_news(
            "USDJPY",
            None,
            cycle_context
        )
        second_signal, second_reason, second_context = (
            engine.check_high_impact_news(
                "USDJPY",
                None,
                cycle_context
            )
        )

        self.assertEqual(first_signal, "BUY")
        self.assertIsNone(second_signal)
        self.assertIsNone(second_reason)
        self.assertEqual(second_context, {})


if __name__ == "__main__":
    unittest.main()
