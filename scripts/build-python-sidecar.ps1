Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $ScriptDir "..")
$DesktopApp = Join-Path $Root "desktop-app"
$TauriDir = Join-Path $DesktopApp "src-tauri"
$BinariesDir = Join-Path $TauriDir "binaries"
$BuildDir = Join-Path $Root "build\pyinstaller"

$Python = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    $Python = "python"
}

$TargetTriple = (& rustc --print host-tuple).Trim()
if (-not $TargetTriple) {
    throw "Could not resolve the Rust target triple with 'rustc --print host-tuple'."
}

$RuntimeName = "burrfx-runtime-$TargetTriple"
$RuntimeExe = Join-Path $BinariesDir "$RuntimeName.exe"

New-Item -ItemType Directory -Force -Path $BinariesDir | Out-Null
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

& $Python -m pip install -r (Join-Path $Root "server\requirements.txt") -r (Join-Path $Root "requirements-build.txt")

$PyInstallerArgs = @(
    "-m", "PyInstaller",
    "--noconfirm",
    "--clean",
    "--onefile",
    "--name", $RuntimeName,
    "--distpath", $BinariesDir,
    "--workpath", $BuildDir,
    "--specpath", $BuildDir,
    "--paths", $Root,
    "--hidden-import", "backtesting.backtester",
    "--hidden-import", "server.app.main",
    "--hidden-import", "trading.broker_worker",
    "--hidden-import", "trading.desktop_bridge",
    "--collect-submodules", "backtesting",
    "--collect-submodules", "server",
    "--collect-submodules", "trading",
    "--add-data", "$Root\broker_settings.json;.",
    "--add-data", "$Root\strategy_settings.json;.",
    "--add-data", "$Root\trading_settings.json;.",
    "--add-data", "$Root\server\.env.example;server",
    (Join-Path $Root "burrfx_runtime.py")
)

& $Python @PyInstallerArgs

if (-not (Test-Path $RuntimeExe)) {
    throw "PyInstaller completed but did not create $RuntimeExe."
}

Write-Host "Built BurrFx runtime sidecar: $RuntimeExe"
