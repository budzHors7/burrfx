from fastapi import APIRouter, HTTPException

from server.app.schemas.bot import BotControlResponse, BotStatusResponse
from server.app.services.bot_service import BotServiceError, bot_service


router = APIRouter(prefix="/bot", tags=["bot"])


@router.get(
    "/status",
    response_model=BotStatusResponse,
    response_model_exclude_none=True,
)
def status() -> BotStatusResponse:
    return bot_service.get_status()


@router.post(
    "/start",
    response_model=BotControlResponse,
    response_model_exclude_none=True,
)
def start() -> BotControlResponse:
    try:
        return bot_service.start()
    except BotServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc


@router.post(
    "/stop",
    response_model=BotControlResponse,
    response_model_exclude_none=True,
)
def stop() -> BotControlResponse:
    return bot_service.stop()
