#!/usr/bin/env bash
set -euo pipefail

echo "Starting ProxiSport services (Postgres, Backend, Frontend)..."
docker compose up -d --build postgres-service backend-service frontend-service

echo "Importing dataset into PostgreSQL..."
docker compose run --rm data-import-job

echo "Waiting for app health endpoint..."
READY=0
for _ in $(seq 1 30); do
  if curl -fsS http://localhost:8080/api/health >/dev/null; then
    READY=1
    break
  fi
  sleep 2
done

if [ "$READY" -ne 1 ]; then
  echo "Warning: health check did not pass in time." >&2
  echo "Check: docker compose logs backend-service" >&2
fi

echo
echo "ProxiSport is ready:"
echo "Frontend: http://localhost:8080"
echo "Health: http://localhost:8080/api/health"
echo
echo "To stop: ./scripts/stop-local.sh"
echo "To reset DB volume: ./scripts/stop-local.sh --reset-data"
