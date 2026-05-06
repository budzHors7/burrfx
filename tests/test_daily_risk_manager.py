import unittest
from types import SimpleNamespace
from unittest.mock import patch

from trading import daily_risk_manager


class DailyRiskManagerTests(unittest.TestCase):
    def tearDown(self):
        daily_risk_manager.daily_profit = 0
        daily_risk_manager.last_logged_daily_profit = None
        daily_risk_manager.trading_locked = False

    def test_daily_profit_ignores_balance_deposits(self):
        deals = [
            SimpleNamespace(
                type=daily_risk_manager.mt5.DEAL_TYPE_BALANCE,
                profit=10000.0,
                commission=0.0,
                swap=0.0,
                fee=0.0,
            ),
            SimpleNamespace(
                type=daily_risk_manager.mt5.DEAL_TYPE_BUY,
                profit=25.5,
                commission=-1.2,
                swap=-0.3,
                fee=-0.1,
            ),
            SimpleNamespace(
                type=daily_risk_manager.mt5.DEAL_TYPE_SELL,
                profit=-10.0,
                commission=0.0,
                swap=0.0,
                fee=0.0,
            ),
        ]

        with patch.object(
            daily_risk_manager.mt5,
            "history_deals_get",
            return_value=deals,
        ):
            daily_risk_manager.update_daily_profit()

        self.assertAlmostEqual(
            daily_risk_manager.get_daily_profit(),
            13.9,
        )

    def test_daily_limits_use_active_broker_target(self):
        daily_risk_manager.daily_profit = 76.0

        with patch.object(
            daily_risk_manager,
            "get_active_broker",
            return_value={
                "id": "deriv",
                "label": "Deriv",
                "daily_limits": {
                    "enabled": True,
                    "target": 75.0,
                    "max_loss": -30.0,
                },
            },
        ):
            locked = daily_risk_manager.check_daily_limits()

        self.assertTrue(locked)
        self.assertTrue(daily_risk_manager.is_trading_locked())

    def test_daily_limits_use_active_broker_loss(self):
        daily_risk_manager.daily_profit = -31.0

        with patch.object(
            daily_risk_manager,
            "get_active_broker",
            return_value={
                "id": "deriv",
                "label": "Deriv",
                "daily_limits": {
                    "enabled": True,
                    "target": 75.0,
                    "max_loss": -30.0,
                },
            },
        ):
            locked = daily_risk_manager.check_daily_limits()

        self.assertTrue(locked)
        self.assertTrue(daily_risk_manager.is_trading_locked())


if __name__ == "__main__":
    unittest.main()
