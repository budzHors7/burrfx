import copy
import unittest
from unittest.mock import patch

from server.app.api.routes import settings as settings_route
from server.app.schemas.settings import BrokerDailyLimitsRequest
from trading import broker_settings


class ServerBrokerSettingsTests(unittest.TestCase):
    def test_get_broker_settings_returns_daily_limits(self):
        settings = copy.deepcopy(broker_settings.DEFAULT_SETTINGS)
        settings["brokers"]["deriv"]["daily_limits"] = {
            "enabled": True,
            "target": 325.0,
            "max_loss": -85.0,
        }

        with patch.object(
            broker_settings,
            "load_broker_settings",
            return_value=settings,
        ):
            response = settings_route.get_broker_settings()

        payload = response.model_dump()
        deriv = next(
            broker
            for broker in payload["brokers"]
            if broker["id"] == "deriv"
        )
        self.assertEqual(
            deriv["daily_limits"],
            {
                "enabled": True,
                "target": 325.0,
                "max_loss": -85.0,
            },
        )

    def test_patch_broker_daily_limits_persists_values(self):
        saved = []

        with (
            patch(
                "server.app.services.bot_service.bot_service.has_active_runtime",
                return_value=False,
            ),
            patch.object(
                broker_settings,
                "set_broker_daily_limits",
                side_effect=lambda broker_id, limits: saved.append(
                    (broker_id, limits)
                )
                or {
                    "enabled": True,
                    "target": 400.0,
                    "max_loss": -95.0,
                },
            ),
        ):
            response = settings_route.update_broker_daily_limits(
                "deriv",
                BrokerDailyLimitsRequest(
                    enabled=True,
                    target=400,
                    max_loss=95,
                ),
            )

        self.assertEqual(
            saved,
            [
                (
                    "deriv",
                    {
                        "enabled": True,
                        "target": 400.0,
                        "max_loss": 95.0,
                    },
                )
            ],
        )
        self.assertEqual(
            response.model_dump()["daily_limits"],
            {
                "enabled": True,
                "target": 400.0,
                "max_loss": -95.0,
            },
        )


if __name__ == "__main__":
    unittest.main()
