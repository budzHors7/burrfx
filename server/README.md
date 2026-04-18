# BurrFx Server

This folder contains the self-hosted API that connects the existing BurrFx trading engine to the mobile app.

Important design rule:

- `app.py` stays untouched as the terminal entrypoint
- the API reuses shared logic from `trading/`
- the MT5 terminal still runs on the same Windows machine as the API

## What The Server Does

The server opens and manages one MT5 session for the current process, then exposes account state and bot controls over HTTP.

Implemented routes:

- `GET /`
- `GET /api/v1/health`
- `GET /api/v1/health/plan`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- `GET /api/v1/account/overview`
- `GET /api/v1/trades/open`
- `GET /api/v1/bot/status`
- `POST /api/v1/bot/start`
- `POST /api/v1/bot/stop`

Current runtime guardrails:

- login and logout are blocked while the bot is running
- bot control uses a stop event instead of keyboard polling
- the terminal menu flow is preserved

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
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8000/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body $body
```

Then test the protected routes:

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/account/overview"
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/trades/open"
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/bot/status"
```

Start and stop the bot:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/bot/start"
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/bot/stop"
```

## Local Testing Notes

- Health and docs endpoints work even before MT5 login succeeds.
- `auth/login`, `account/overview`, `trades/open`, and bot control require MT5 on the same machine.
- The current server process is designed around one active MT5 account session at a time.
- For mobile testing from an emulator or phone, use a reachable IP instead of `localhost`.

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
