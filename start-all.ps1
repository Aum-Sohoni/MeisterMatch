# Start all MeisterMatch services from one command.
# Usage: powershell -ExecutionPolicy Bypass -File start-all.ps1

$ErrorActionPreference = "Stop"

$platformDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$webDir = Join-Path $platformDir "web"

# Start ML rank service (Python) in background
Write-Host "Starting ML rank service on :8001..." -ForegroundColor Cyan
$ml = Start-Process -FilePath ".\.venv\Scripts\python.exe" `
    -ArgumentList "-m", "uvicorn", "main:app", "--app-dir", "ml", "--port", "8001" `
    -WorkingDirectory $platformDir `
    -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 3

# Start web dev server (which also starts the API via concurrently)
Write-Host "Starting web + API on :5173..." -ForegroundColor Cyan
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://127.0.0.1:5173"

Push-Location $webDir
try {
    npm run dev
} finally {
    Pop-Location
}

# Cleanup on exit
Write-Host "Stopping ML service..." -ForegroundColor Yellow
Stop-Process -Id $ml.Id -Force
Write-Host "Done." -ForegroundColor Green
