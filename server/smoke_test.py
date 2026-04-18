from __future__ import annotations

import json
from pathlib import Path
import sys
from urllib.error import URLError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.app.core.settings import settings


def fetch_json(url: str) -> dict[str, object]:
    with urlopen(url, timeout=5) as response:
        payload = response.read().decode("utf-8")
        return json.loads(payload)


def main() -> int:
    base_url = f"http://127.0.0.1:{settings.api_port}"
    endpoints = [
        ("root", f"{base_url}/"),
        ("health", f"{base_url}{settings.api_prefix}/health"),
        ("plan", f"{base_url}{settings.api_prefix}/health/plan"),
    ]

    try:
        for label, url in endpoints:
            payload = fetch_json(url)
            print(f"[ok] {label}: {url}")
            print(json.dumps(payload, indent=2))
    except (URLError, OSError) as exc:
        print(
            "Smoke test failed. Start the API first, then run this file again."
        )
        print(f"Details: {exc}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
