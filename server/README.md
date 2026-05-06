# BurrFx Server

This folder contains the self-hosted API that connects the existing BurrFx trading engine to the mobile app.

Important design rules:

- `app.py` stays untouched as the terminal entrypoint
- the API reuses shared logic from `trading/`
- the MT5 terminal still runs on the same Windows machine as the API

## What The Server Does

The server opens and manages one MT5 session for the current process, then exposes account state, logs, and bot controls over HTTP.

The selected trading profile is shared with the original terminal app through `trading_settings.json`, so the API and CLI use the same trading behavior.

Broker daily target/loss limits are shared through `broker_settings.json`. The server exposes those broker settings so the mobile app can adjust daily limits without editing files manually.

Implemented routes:

- `GET /`
- `GET /api/v1/health`
- `GET /api/v1/health/plan`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- `GET /api/v1/account/overview`
- `GET /api/v1/account/logs`
- `GET /api/v1/trades/open`
- `GET /api/v1/bot/status`
- `POST /api/v1/bot/start`
- `POST /api/v1/bot/stop`
- `GET /api/v1/settings/brokers`
- `PATCH /api/v1/settings/brokers/{broker_id}/daily-limits`

Current runtime guardrails:

- login and logout are blocked while the bot is running
- bot control uses a stop event instead of keyboard polling
- the current process serves one active MT5 account session at a time
- account logs require an authenticated MT5 session
- broker daily limit changes are blocked while the bot runtime is active

## Prerequisites

- Windows machine
- Python 3.x
- MetaTrader 5 installed locally
- valid MT5 account credentials for real login tests

## Environment

Copy the example file before running:

```powershell
Copy-Item server\.env.example server\.env
```

Main settings:

- `BURRFX_API_HOST`
- `BURRFX_API_PORT`
- `BURRFX_MT5_TERMINAL_PATH`
- `BURRFX_MT5_TIMEOUT_MS`
- `BURRFX_ALLOWED_ORIGINS`

The server loads `server\.env` automatically on startup.

## Start Locally

Run these commands from the repository root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r server\requirements.txt
Copy-Item server\.env.example server\.env
python server\run_local.py
```

Windows shortcut:

```powershell
.\server\start-local.ps1
```

Local URLs:

- `http://localhost:8000/`
- `http://localhost:8000/docs`
- `http://localhost:8000/api/v1/health`

## Smoke Test

You can verify that the API process is alive before testing MT5 login:

```powershell
.venv\Scripts\Activate.ps1
python server\smoke_test.py
```

The smoke test checks:

- `/`
- `/api/v1/health`
- `/api/v1/health/plan`

## Test The MT5 Login Locally

After the server is running and `BURRFX_MT5_TERMINAL_PATH` points to the real `terminal64.exe`, use PowerShell to test login:

```powershell
$body = @{
  account_number = 12345678
  password = "your-password"
  server = "Broker-Demo"
  trading_profile = "regular_risk"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8000/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body $body
```

Supported profile ids:

- `smart_risk`
- `regular_risk`
- `highly_risky`

Then test the protected routes:

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/account/overview"
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/account/logs"
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/trades/open"
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/bot/status"
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/settings/brokers"
```

Start and stop the bot:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/bot/start"
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/bot/stop"
Invoke-RestMethod -Method Patch `
  -Uri "http://localhost:8000/api/v1/settings/brokers/deriv/daily-limits" `
  -ContentType "application/json" `
  -Body '{"enabled":true,"target":150,"max_loss":-100}'
```

## Local Testing Notes

- health and docs endpoints work even before MT5 login succeeds
- `auth/login`, `account/overview`, `account/logs`, `trades/open`, and bot control require MT5 on the same machine
- the active trading profile is returned in the session snapshot and is persisted into the same shared trading settings used by the terminal app
- the mobile app's Logs tab reads `/api/v1/account/logs`
- the mobile app's dashboard broker settings read `/api/v1/settings/brokers` and save daily target/loss values through `/api/v1/settings/brokers/{broker_id}/daily-limits`
- the mobile app's Journal tab is local SQLite storage on the device, not a server endpoint
- the desktop app's file logs viewer reads local `logs/` files through `python -m trading.desktop_bridge logs`, not through a public HTTP route
- for mobile testing from an emulator or phone, use a reachable IP instead of `localhost`

Recommended local values:

- Android emulator on the same machine: `http://10.0.2.2:8000`
- another device on the same LAN: `http://<windows-lan-ip>:8000`

## Hosting Direction

The first hosting target is self-hosted Windows Server.

Recommended shape:

1. Install MetaTrader 5 on the server.
2. Copy the BurrFx project to the server.
3. Create `server\.env` with the correct MT5 terminal path.
4. Run the API with `python server\run_local.py` or a production `uvicorn` command.
5. Put HTTPS and access control in front of the API before exposing it externally.

## Known Limits

- MT5 connectivity depends on the desktop terminal and local IPC working correctly.
- Session state is process-local, not multi-user auth.
- This is Windows-first because the MT5 terminal must be present where the API runs.
