from fastapi import APIRouter

from server.app.core.settings import settings


router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health_check() -> dict[str, object]:
    return {
        "status": "ok",
        "service": settings.api_name,
        "version": settings.api_version,
        "phase": "bot-control",
        "terminal_app_preserved": True,
        "implemented_endpoints": [
            "POST /api/v1/auth/login",
            "POST /api/v1/auth/logout",
            "GET /api/v1/auth/session",
            "GET /api/v1/account/overview",
            "GET /api/v1/trades/open",
            "GET /api/v1/bot/status",
            "POST /api/v1/bot/start",
            "POST /api/v1/bot/stop",
        ],
        "runtime_guards": [
            "Terminal menu flow preserved",
            "API bot uses stop events instead of keyboard polling",
            "MT5 session changes are blocked while the bot is running",
        ],
        "shared_modules_target": [
            "trading.account",
            "trading.live_trader",
            "trading.trade_manager",
            "trading.debug_logger",
        ],
    }


@router.get("/plan")
def health_plan() -> dict[str, object]:
    return {
        "focus": "self-hosted Windows Server API first",
        "next_endpoints": [
            "JWT auth for the mobile app",
            "HTTPS reverse proxy for Windows hosting",
            "Expo app auth screen",
            "Expo app dashboard and trades tabs",
        ],
        "important_note": (
            "The existing terminal trading implementation stays in place. "
            "The API will be built beside it and will reuse shared trading code."
        ),
    }
