from fastapi import APIRouter, HTTPException, status

from server.app.schemas.account import AccountOverviewResponse
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
