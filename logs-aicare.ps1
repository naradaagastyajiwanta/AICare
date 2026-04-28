# AICare Log Viewer
# Usage: .\logs-aicare.ps1 [backend|dashboard|db]

param(
    [string]$Service = "backend"
)

switch ($Service.ToLower()) {
    "backend"   { docker compose logs -f backend }
    "dashboard" { docker compose logs -f dashboard }
    "db"        { docker compose logs -f db }
    default     { docker compose logs -f }
}
