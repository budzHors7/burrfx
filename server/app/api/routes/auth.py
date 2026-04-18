from fastapi import APIRouter, HTTPException

from server.app.schemas.auth import (
    AuthLoginRequest,
    AuthLoginResponse,
    AuthLogoutResponse,
    AuthSessionResponse,
)
from server.app.services.bot_service import bot_service
from server.app.services.mt5_service import MT5ApiError, mt5_service


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=AuthLoginResponse,
    response_model_exclude_none=True,
)
def login(payload: AuthLoginRequest) -> AuthLoginResponse:
    if bot_service.has_active_runtime():
        raise HTTPException(
            status_code=409,
            detail=(
                "Stop the trading bot before changing the MT5 session."
            ),
        )

    try:
        return mt5_service.login(payload)
    except MT5ApiError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc


@router.post(
    "/logout",
    response_model=AuthLogoutResponse,
)
def logout() -> AuthLogoutResponse:
    if bot_service.has_active_runtime():
        raise HTTPException(
            status_code=409,
            detail=(
                "Stop the trading bot before disconnecting the MT5 session."
            ),
        )

    return mt5_service.logout()


@router.get(
    "/session",
    response_model=AuthSessionResponse,
    response_model_exclude_none=True,
)
def session() -> AuthSessionResponse:
    return mt5_service.get_session_snapshot()
