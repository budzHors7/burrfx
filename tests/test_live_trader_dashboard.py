import io
import unittest
from unittest.mock import patch

from trading import live_trader


class LiveTraderDashboardTests(unittest.TestCase):
    def test_disabled_daily_limits_hide_target_and_loss_lines(self):
        output = self._render_dashboard(
            daily_limits={
                "enabled": False,
                "target": 150.0,
                "max_loss": -100.0,
            }
        )

        self.assertIn("Daily PnL: 12.34", output)
        self.assertNotIn("Target Remaining:", output)
        self.assertNotIn("Loss Buffer:", output)

    def test_enabled_daily_limits_show_target_and_loss_lines(self):
        output = self._render_dashboard(
            daily_limits={
                "enabled": True,
                "target": 150.0,
                "max_loss": -100.0,
            }
        )

        self.assertIn("Daily PnL: 12.34", output)
        self.assertIn("Target Remaining: 137.66", output)
        self.assertIn("Loss Buffer: 112.34", output)

    def test_global_daily_lock_off_hides_target_and_loss_lines(self):
        output = self._render_dashboard(
            daily_limits={
                "enabled": True,
                "target": 150.0,
                "max_loss": -100.0,
            },
            daily_lock_enabled=False,
        )

        self.assertIn("Daily PnL: 12.34", output)
        self.assertNotIn("Target Remaining:", output)
        self.assertNotIn("Loss Buffer:", output)

    def _render_dashboard(
        self,
        daily_limits,
        daily_lock_enabled=True,
    ):
        stdout = io.StringIO()

        patches = [
            patch.object(live_trader, "clear_screen"),
            patch.object(live_trader, "show_logo"),
            patch.object(
                live_trader,
                "get_daily_profit",
                return_value=12.34,
            ),
            patch.object(
                live_trader,
                "get_daily_limits",
                return_value=daily_limits,
            ),
            patch.object(
                live_trader,
                "ENABLE_DAILY_LOCK",
                daily_lock_enabled,
                create=True,
            ),
            patch.object(
                live_trader,
                "get_stats",
                return_value={
                    "profit": 50.0,
                    "loss": -10.0,
                },
            ),
            patch.object(
                live_trader,
                "get_trading_pause_reason",
                return_value=None,
            ),
            patch.object(
                live_trader,
                "get_active_session_label",
                return_value="Synthetic",
            ),
            patch.object(
                live_trader,
                "get_session_symbols",
                return_value=["Boom 1000 Index"],
            ),
            patch.object(
                live_trader,
                "get_strategy_overview_lines",
                return_value=[],
            ),
            patch.object(
                live_trader,
                "get_trading_profile_label",
                return_value="Regular Risk",
            ),
            patch.object(
                live_trader,
                "is_trading_locked",
                return_value=False,
            ),
            patch(
                "trading.broker_runtime.get_active_broker_label",
                return_value="Deriv",
            ),
            patch("sys.stdout", stdout),
        ]

        with patches[0], patches[1], patches[2], patches[3], patches[4], \
            patches[5], patches[6], patches[7], patches[8], patches[9], \
            patches[10], patches[11], patches[12], patches[13]:
            live_trader.display_dashboard(
                acc={
                    "balance": 1000.0,
                    "equity": 1010.0,
                    "profit": 10.0,
                    "margin": 20.0,
                    "free_margin": 990.0,
                    "login": 123,
                    "server": "Deriv-Demo",
                }
            )

        return stdout.getvalue()


if __name__ == "__main__":
    unittest.main()
