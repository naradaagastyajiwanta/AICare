# AICare Stop Script
# Usage: .\stop-aicare.ps1

Write-Host "Stopping AICare services..." -ForegroundColor Yellow
docker compose down
Write-Host "[OK] All services stopped." -ForegroundColor Green
