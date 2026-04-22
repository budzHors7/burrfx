from fastapi import APIRouter, HTTPException, Query, status

from server.app.schemas.account import AccountOverviewResponse
from server.app.schemas.logs import AccountLogsResponse
from server.app.services.log_service import log_service
from server.app.services.mt5_service import MT5SessionError, mt5_service


router = APIRouter(prefix="/account", tags=["account"])


@router.get(
    "/overview",
    response_model=AccountOverviewResponse,
    response_model_exclude_none=True,
)
def get_account_overview() -> AccountOverviewResponse:
    try:
        return mt5_service.get_account_overview()
    except MT5SessionError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc


@router.get(
    "/logs",
    response_model=AccountLogsResponse,
    response_model_exclude_none=True,
)
def get_account_logs(
    limit: int = Query(default=120, ge=1, le=500),
) -> AccountLogsResponse:
    session = mt5_service.get_session_snapshot()

    if not session.authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active MT5 session. Login first from the mobile app or API client.",
        )

    return log_service.get_account_logs(limit=limit)
