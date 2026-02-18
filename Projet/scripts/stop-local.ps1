param(
  [switch]$ResetData
)

$ErrorActionPreference = 'Stop'

if ($ResetData) {
  Write-Host "Stopping ProxiSport and deleting DB volume..."
  docker compose down -v
} else {
  Write-Host "Stopping ProxiSport services..."
  docker compose down
}

if ($LASTEXITCODE -ne 0) {
  throw "docker compose down failed."
}

Write-Host "Done."
