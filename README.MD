# BurrFx

BurrFx is a MetaTrader 5 trading project with three connected parts:

- a terminal-first trading app in `app.py`
- a self-hosted FastAPI backend in `server/`
- an Expo React Native mobile app in `burrfx/`

The terminal trading workflow remains intact. The API and mobile app are being added beside it and reuse the same trading code instead of replacing it.

## Project Layout

- `app.py`: interactive terminal entrypoint for live trading, data downloads, backtesting, and strategy settings
- `trading/`: shared live-trading and MT5 integration logic
- `data_tools/`: historical data download tools
- `backtesting/`: strategy backtesting flow
- `server/`: self-hosted BurrFx MT5 API for local and Windows Server deployment
- `burrfx/`: Expo mobile app that connects to the API

## Requirements

- Windows for live MT5 work and Windows-first server hosting
- Python 3.x
- MetaTrader 5 desktop terminal installed on the machine that runs live trading or the API
- Bun for the Expo mobile app
- Android Studio emulator or iOS Simulator for mobile testing

## Terminal App

Use the original terminal workflow when you want to trade directly from the machine:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

The terminal menu includes:

- live trading
- history downloads
- backtesting
- strategy settings

## API Server

The backend lives in `server/` and is designed to run on the same Windows machine as MetaTrader 5.

Implemented endpoints:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- `GET /api/v1/account/overview`
- `GET /api/v1/trades/open`
- `GET /api/v1/bot/status`
- `POST /api/v1/bot/start`
- `POST /api/v1/bot/stop`
- `GET /api/v1/health`

Quick start:

```powershell
.venv\Scripts\Activate.ps1
pip install -r server\requirements.txt
Copy-Item server\.env.example server\.env
python server\run_local.py
```

Useful URLs:

- `http://localhost:8000/`
- `http://localhost:8000/docs`
- `http://localhost:8000/api/v1/health`

Quick verification:

```powershell
python server\smoke_test.py
```

See `server/README.md` for the full local-testing and hosting notes.

## Mobile App

The Expo app lives in `burrfx/` and uses Bun as the package manager.

Current app flow:

- auth screen
- dashboard tab
- trades tab

Current status:

- auth uses native Expo UI views on Android and iOS
- dashboard and trades are connected to the BurrFx API
- the app can sign in, read account data, list open trades, and start or stop the server bot

Quick start:

```powershell
cd burrfx
bun install
Copy-Item .env.example .env
bun run android
```

The mobile app expects the API to be reachable from the emulator or device. Examples:

- Android emulator on the same machine: `http://10.0.2.2:8000`
- phone on the same LAN: `http://<your-windows-ip>:8000`

See `burrfx/README.md` for the mobile workflow details.

## Current Direction

The repo is moving in this order:

1. Keep the terminal trading flow stable.
2. Make the API reliable for local testing and Windows self-hosting.
3. Finish the mobile experience on top of the API.

That means the API is the bridge between the MT5 terminal session and the mobile app, while the original terminal app stays available for direct use.
