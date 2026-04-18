from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.app.api.routes.account import router as account_router
from server.app.api.routes.auth import router as auth_router
from server.app.api.routes.bot import router as bot_router
from server.app.api.routes.health import router as health_router
from server.app.api.routes.trades import router as trades_router
from server.app.core.settings import settings


app = FastAPI(
    title=settings.api_name,
    version=settings.api_version,
    summary=(
        "Self-hosted API scaffold for connecting the existing BurrFx "
        "MetaTrader 5 trading engine to a future Expo mobile app."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(account_router, prefix=settings.api_prefix)
app.include_router(bot_router, prefix=settings.api_prefix)
app.include_router(trades_router, prefix=settings.api_prefix)
app.include_router(health_router, prefix=settings.api_prefix)


@app.get("/", tags=["meta"])
def root() -> dict[str, object]:
    return {
        "name": settings.api_name,
        "version": settings.api_version,
        "status": "ok",
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
        "plan": f"{settings.api_prefix}/health/plan",
    }
