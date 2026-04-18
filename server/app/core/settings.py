import os
from dataclasses import dataclass, field
from pathlib import Path


def _load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"

    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key and key not in os.environ:
            os.environ[key] = value


_load_env_file()


def _split_csv(value: str) -> list[str]:
    return [
        item.strip()
        for item in value.split(",")
        if item.strip()
    ]


@dataclass(frozen=True)
class Settings:
    api_name: str = os.getenv("BURRFX_API_NAME", "BurrFx MT5 API")
    api_version: str = os.getenv("BURRFX_API_VERSION", "0.1.0")
    api_prefix: str = os.getenv("BURRFX_API_PREFIX", "/api/v1")
    api_host: str = os.getenv("BURRFX_API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("BURRFX_API_PORT", "8000"))
    mt5_terminal_path: str = os.getenv(
        "BURRFX_MT5_TERMINAL_PATH",
        r"C:\Program Files\MetaTrader 5\terminal64.exe",
    )
    mt5_timeout_ms: int = int(
        os.getenv("BURRFX_MT5_TIMEOUT_MS", "15000")
    )
    allowed_origins: list[str] = field(
        default_factory=lambda: _split_csv(
            os.getenv(
                "BURRFX_ALLOWED_ORIGINS",
                (
                    "http://localhost:8081,"
                    "http://127.0.0.1:8081,"
                    "http://localhost:19006,"
                    "http://127.0.0.1:19006"
                ),
            )
        )
    )


settings = Settings()
