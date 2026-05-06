from fastapi import APIRouter, HTTPException

from server.app.schemas.settings import (
    BrokerDailyLimitsRequest,
    BrokerDailyLimitsResponse,
    BrokerSettingsResponse,
    BrokerSettingsSummary
)
from server.app.services.bot_service import bot_service
from trading import broker_settings


router = APIRouter(prefix="/settings", tags=["settings"])


@router.get(
    "/brokers",
    response_model=BrokerSettingsResponse,
)
def get_broker_settings() -> BrokerSettingsResponse:

    return BrokerSettingsResponse(
        brokers=[
            _build_broker_summary(broker)
            for broker in broker_settings.get_all_brokers()
        ]
    )


@router.patch(
    "/brokers/{broker_id}/daily-limits",
    response_model=BrokerDailyLimitsResponse,
)
def update_broker_daily_limits(
    broker_id: str,
    payload: BrokerDailyLimitsRequest
) -> BrokerDailyLimitsResponse:

    if bot_service.has_active_runtime():
        raise HTTPException(
            status_code=409,
            detail=(
                "Stop the trading bot before changing broker daily limits."
            )
        )

    payload_dict = (
        payload.model_dump()
        if hasattr(payload, "model_dump")
        else payload.dict()
    )

    try:
        daily_limits = broker_settings.set_broker_daily_limits(
            broker_id,
            payload_dict
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc

    return BrokerDailyLimitsResponse(
        broker_id=broker_id,
        daily_limits=daily_limits
    )


def _build_broker_summary(broker):

    return BrokerSettingsSummary(
        id=broker["id"],
        label=broker["label"],
        enabled=bool(
            broker.get("enabled", False)
        ),
        daily_limits=broker_settings.get_broker_daily_limits(
            broker
        )
    )
