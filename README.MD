# BurrFx

BurrFx is a MetaTrader 5 trading project with three connected parts:

- a terminal-first trading app in `app.py`
- a Tauri + React desktop controller in `desktop-app/`
- a self-hosted FastAPI backend in `server/`
- an Expo React Native mobile app in `burrfx/`

The original terminal workflow still exists. The desktop app, API, and mobile app sit beside it and reuse the same trading engine instead of replacing it.

## Project Layout

- `app.py`: interactive terminal entrypoint for live trading, downloads, backtesting, and settings
- `trading/`: shared MT5 session and live-trading logic
- `data_tools/`: historical data tools
- `backtesting/`: broker-aware strategy backtesting used by the terminal and desktop app
- `desktop-app/`: Tauri desktop controller for local trading, the mobile API server, settings, and logs
- `server/`: self-hosted BurrFx MT5 API for local and Windows Server deployment
- `burrfx/`: Expo mobile app that connects to the API

## Requirements

- Windows for live MT5 work and Windows-first server hosting
- Python 3.x
- MetaTrader 5 desktop terminal installed on the machine that runs live trading or the API
- Bun for the Expo mobile and desktop apps
- Rust toolchain for Tauri desktop builds
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
- broker settings, including per-broker daily target/loss limits

## Desktop App

The desktop app lives in `desktop-app/` and is the local control surface for Windows trading work.

Current desktop flow:

- start or stop local broker workers
- start or stop the mobile API server
- edit trading profile, strategy toggles, active brokers, broker strategy selection, and broker daily target/loss limits
- run broker-aware backtests for active brokers, all configured brokers, or one selected broker
- view the shared live trade journal from `logs/trade_journal.csv`
- view live process output from desktop-started runtimes
- view persisted log files from `logs/debug/*.log` and `logs/symbol_logs/*.log`

Quick start:

```powershell
cd desktop-app
bun install
bun run tauri dev
```

Packaged desktop build:

```powershell
cd desktop-app
bun run build:desktop
```

The packaged build creates a PyInstaller `burrfx-runtime.exe` sidecar and
bundles it with Tauri so installed users do not need Python or the repo checkout.
Mutable settings, journals, logs, data, and results are created in the user's app
data folder on first launch.

Useful checks:

```powershell
cd desktop-app
bun run build
cargo check --manifest-path src-tauri\Cargo.toml
cd ..
python -m trading.desktop_bridge logs
python -m trading.desktop_bridge journal
'{"bars":500,"include_disabled":false}' | python -m trading.desktop_bridge backtest
```

See `desktop-app/README.md` for the full desktop notes.

## API Server

The backend lives in `server/` and is designed to run on the same Windows machine as MetaTrader 5.

Implemented endpoints:

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

- auth screen with saved API URL and session re-check on launch
- dashboard tab
- trades tab
- logs tab
- journal tab
- broker daily target/loss editing from the dashboard
- Android floating trade window with draw-over-apps permission flow

Current status:

- light, dark, and system theme modes
- Android accent choice: `System Colors` or `BurrFx Blue`
- platform-specific auth screens, with iOS currently using Expo UI SwiftUI
- dashboard, trades, logs, and journal are connected to the BurrFx API and local state
- dashboard broker settings can edit per-broker daily target/loss limits through the API
- account progress journal is stored locally in SQLite while the app is trading or tracking open trades
- server logs are exposed to the mobile app through the API

Quick start:

```powershell
cd burrfx
bun install
Copy-Item .env.example .env
bun start
```

Then, in a second terminal from `burrfx/`:

```powershell
bun run android
```

The mobile app expects the API to be reachable from the emulator or device. Examples:

- Android emulator on the same machine: `http://10.0.2.2:8000`
- phone on the same LAN: `http://<your-windows-ip>:8000`

If you add or remove native Expo modules, rebuild the dev client before testing again.

See `burrfx/README.md` for the mobile workflow details.

## Current Direction

The repo is moving in this order:

1. Keep the terminal trading flow stable.
2. Keep the API reliable for local testing and Windows self-hosting.
3. Polish the mobile experience on top of the API.

That means the API is the bridge between the MT5 terminal session and the mobile app, while the original terminal app stays available for direct use.
