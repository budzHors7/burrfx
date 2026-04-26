# BurrFx Desktop

Tauri + React desktop controller for the BurrFx local runtime.

The app supervises two local process groups from the repository root:

- **Local Trading** starts one `trading.broker_worker` process for each active broker in `broker_settings.json`.
- **Mobile API Server** starts `server/run_desktop.py`, which serves the FastAPI app without the development reloader.

Both paths reuse the existing Python trading and server modules. Broker readiness is read through `python -m trading.desktop_bridge status`.

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
python -m unittest tests.test_desktop_bridge
```

If Rust is not on `PATH`, use the installed user toolchain directly:

```powershell
& "$env:USERPROFILE\.cargo\bin\cargo.exe" test
```

## Runtime Notes

- The desktop app is a process supervisor. It can stop processes it started.
- Local trading uses active broker settings, including validation and MT5 terminal paths.
- The mobile API server uses `server/.env` through the existing server settings loader.
- The API URL shown in the app is the local desktop URL; phones on the LAN still need the machine IP address.
