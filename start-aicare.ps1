# AICare Startup Script
# Usage:  .\start-aicare.ps1
#         .\start-aicare.ps1 -Background   # run in background (no log window)

param(
    [switch]$Background
)

$ErrorActionPreference = "Stop"

function Test-Port($port) {
    try {
        $conn = New-Object System.Net.Sockets.TcpClient("127.0.0.1", $port)
        $conn.Close()
        return $true
    } catch { return $false }
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    AICare - AI Care Assistant" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# ============================================================
# 1. Start Docker services (backend + db + dashboard)
# ============================================================
Write-Host "`n[1/1] Starting Docker services..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker compose failed"
    exit 1
}
Write-Host "[OK] Docker services started" -ForegroundColor Green

# Wait for backend to be ready
Write-Host "Waiting for backend..." -ForegroundColor Gray -NoNewline
for ($i = 0; $i -lt 30; $i++) {
    if (Test-Port 3001) {
        try {
            $resp = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp.status -eq "ok") {
                Write-Host " [OK]" -ForegroundColor Green
                break
            }
        } catch {}
    }
    Start-Sleep -Milliseconds 500
    Write-Host "." -ForegroundColor Gray -NoNewline
}

# ============================================================
# Summary
# ============================================================
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  All services started!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Dashboard:  http://localhost:3005"
Write-Host "  Backend:    http://localhost:3001"
Write-Host "=========================================" -ForegroundColor Cyan

if ($Background) {
    Write-Host "`nServices running in background." -ForegroundColor Green
    Write-Host "To stop:  .\stop-aicare.ps1" -ForegroundColor Yellow
    Write-Host "To view logs: .\logs-aicare.ps1" -ForegroundColor Yellow
    return
}

# ============================================================
# Dev mode: stream Docker logs until Ctrl+C
# ============================================================
Write-Host "`nPress Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host "----------------------------------------------" -ForegroundColor Gray

try {
    docker compose logs -f
} finally {
    Write-Host "`nStopping services..." -ForegroundColor Yellow
    docker compose down
    Write-Host "All services stopped." -ForegroundColor Green
}
