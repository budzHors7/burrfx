# BurrFx Desktop

Tauri + React desktop controller for the BurrFx local runtime.

The app supervises two local process groups from the repository root:

- **Local Trading** starts one `trading.broker_worker` process for each active broker in `broker_settings.json`.
- **Mobile API Server** starts `server/run_desktop.py`, which serves the FastAPI app without the development reloader.

Both paths reuse the existing Python trading and server modules. Broker readiness, settings, and persisted log files are read through `python -m trading.desktop_bridge`.

## What The Desktop App Does

- starts and stops local broker workers
- starts and stops the mobile API server
- edits the active trading profile
- edits global strategy toggles
- edits active brokers and broker-specific allowed strategies
- edits each broker's daily target/loss lock
- runs broker-aware strategy backtests through the same strategy selection used by local trading
- shows the MT5 trade journal from `logs/trade_journal.csv`
- shows live stdout/stderr from desktop-started runtimes
- shows persisted file logs from `logs/debug/*.log` and `logs/symbol_logs/*.log`

The logs viewer has two modes:

- **File Logs** reads durable debug, session, and symbol log files from the repository `logs/` folder.
- **Runtime Output** shows stdout/stderr captured from processes started by this desktop app.

## Development

From `desktop-app/`:

```powershell
Set-Location ..
python -m pip install -r server\requirements.txt
Set-Location desktop-app
bun install
bun run tauri dev
```

Useful checks:

```powershell
bun run build
.\src-tauri\target\debug\desktop-app.exe
Set-Location ..
python -m trading.desktop_bridge status
python -m trading.desktop_bridge settings
python -m trading.desktop_bridge logs
python -m trading.desktop_bridge journal
'{"bars":500,"include_disabled":false}' | python -m trading.desktop_bridge backtest
python -m unittest tests.test_desktop_bridge
```

If Rust is not on `PATH`, use the installed user toolchain directly:

```powershell
& "$env:USERPROFILE\.cargo\bin\cargo.exe" test
```

## Runtime Notes

- The desktop app is a process supervisor. It can stop processes it started.
- Local trading uses active broker settings, including validation and MT5 terminal paths.
- Desktop backtesting uses the active broker context before reading strategies, so Exness and Deriv follow the same broker rules as local trading.
- Backtesting is blocked while desktop-started local trading is running.
- The journal view reads the shared live-trade CSV written by the Python order manager.
- Broker daily target/loss settings are saved in `broker_settings.json`; stop local trading before changing them.
- The mobile API server uses `server/.env` through the existing server settings loader.
- The API URL shown in the app is the local desktop URL; phones on the LAN still need the machine IP address.
- File logs are capped by the bridge response so the UI stays responsive even when `debug.log` grows.
