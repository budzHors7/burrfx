# BurrFx Server

This folder is the server-first workspace for exposing the existing BurrFx trading engine to a future Expo mobile app.

The current terminal app stays in place:

- `app.py` remains the interactive terminal entrypoint.
- Existing shared trading logic remains in `trading/`, `config.py`, and related modules.
- The new API will reuse that logic instead of replacing it.

## Why This Is Feasible

The MetaTrader 5 Python integration supports:

- initializing a local MT5 terminal with `login`, `password`, and `server`
- reading current account data
- reading open positions

That matches the first mobile app scope:

1. Auth screen
2. Dashboard screen
3. Trades screen

## Recommended V1 Shape

Start with a self-hosted Windows Server deployment:

- Windows Server host
- Installed MetaTrader 5 terminal on the same machine
- Python API process
- Later: Expo mobile app consuming this API

For the first version, design around one active MT5 account session per API worker. The MT5 Python package operates against the connected terminal session, so multi-account support should come after the single-account workflow is stable.

## Planned Endpoints

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- `GET /api/v1/account/overview`
- `GET /api/v1/trades/open`
- `GET /api/v1/bot/status`
- `POST /api/v1/bot/start`
- `POST /api/v1/bot/stop`
- `GET /api/v1/health`

Implemented now:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- `GET /api/v1/account/overview`
- `GET /api/v1/trades/open`
- `GET /api/v1/bot/status`
- `POST /api/v1/bot/start`
- `POST /api/v1/bot/stop`

## Shared Code Strategy

We will keep the terminal workflow and add the API beside it.

Phase 1:

- add the hosted API scaffold
- keep terminal trading unchanged
- avoid breaking `app.py`

Phase 2:

- extract reusable runtime pieces from `trading/live_trader.py`
- let both the terminal app and API call the same shared runner
- replace keyboard-only stop behavior with a stop event that works for both CLI and server control

Current guardrails:

- terminal menu usage still calls `start_live_trading()` with the default behavior
- API bot runs with `interactive=False`, `initialize_mt5=False`, and `shutdown_mt5=False`
- API login/logout is blocked while the bot thread is active so the MT5 session is not interrupted mid-run

## Local Run

Run commands from the repository root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r server\requirements.txt
Copy-Item server\.env.example server\.env
python server\run_local.py
```

Open:

- `http://localhost:8000/`
- `http://localhost:8000/docs`

Quick verification:

```powershell
python server\smoke_test.py
```

Windows shortcut:

```powershell
.\server\start-local.ps1
```

Local testing notes:

- `server\.env` is now loaded automatically on startup.
- Health, docs, and session routes can be tested locally even before MT5 login succeeds.
- To test `auth/login`, `account/overview`, `trades/open`, and bot start/stop locally, MetaTrader 5 must be installed on the same Windows machine and `BURRFX_MT5_TERMINAL_PATH` must point to the real `terminal64.exe`.

## Windows Hosting Direction

Recommended first hosting path:

1. Install MetaTrader 5 terminal on the Windows Server machine.
2. Run the API with `uvicorn`.
3. Use a Windows service wrapper such as NSSM later for persistence.
4. Put HTTPS in front of the API before exposing it outside the local network.

## MT5 Timeout

The server uses `BURRFX_MT5_TIMEOUT_MS` to stop login requests from hanging too long.

- default: `15000`
- applies to MT5 initialize and login calls

## Next Build Order

1. Confirm local API scaffold runs.
2. Add MT5 login endpoint using account number, password, and server.
3. Add account overview and open-trades endpoints.
4. Add bot start, stop, and status endpoints.
5. Test the API manually before starting the Expo app.

Current status:

- steps 1 through 5 are complete for the backend API
- next focus is mobile auth and the two Expo tabs
