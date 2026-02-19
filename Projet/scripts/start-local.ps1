$ErrorActionPreference = 'Stop'

Write-Host "Starting ProxiSport services (Postgres, Backend, Frontend)..."
docker compose up -d --build postgres-service backend-service frontend-service

if ($LASTEXITCODE -ne 0) {
  throw "docker compose up failed."
}

Write-Host "Importing dataset into PostgreSQL..."
docker compose run --rm data-import-job

if ($LASTEXITCODE -ne 0) {
  throw "Data import failed."
}

Write-Host "Waiting for app health endpoint..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    $health = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -TimeoutSec 3
    if ($health.status -eq "OK") {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (-not $ready) {
  Write-Warning "Health check did not pass in time. Check: docker compose logs backend-service"
}

Write-Host ""
Write-Host "ProxiSport is ready:"
Write-Host "Frontend: http://localhost:8080"
Write-Host "Health: http://localhost:8080/api/health"
Write-Host ""
Write-Host "To stop: .\scripts\stop-local.ps1"
Write-Host "To reset DB volume: .\scripts\stop-local.ps1 -ResetData"
