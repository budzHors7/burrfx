from pathlib import Path
import sys

import uvicorn


ROOT = Path(__file__).resolve().parents[1]

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.app.core.settings import settings


if __name__ == "__main__":
    uvicorn.run(
        "server.app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=False,
    )
