from fastapi import APIRouter, HTTPException, status

from server.app.schemas.trades import OpenTradesResponse
from server.app.services.mt5_service import MT5SessionError, mt5_service


router = APIRouter(prefix="/trades", tags=["trades"])


@router.get(
    "/open",
    response_model=OpenTradesResponse,
    response_model_exclude_none=True,
)
def get_open_trades() -> OpenTradesResponse:
    try:
        return mt5_service.get_open_trades()
    except MT5SessionError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
