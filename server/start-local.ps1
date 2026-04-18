$repoRoot = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"

if (Test-Path $venvPython) {
    & $venvPython "$PSScriptRoot\run_local.py"
    exit $LASTEXITCODE
}

python "$PSScriptRoot\run_local.py"
exit $LASTEXITCODE
