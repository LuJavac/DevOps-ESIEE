#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "--reset-data" ]; then
  echo "Stopping ProxiSport and deleting DB volume..."
  docker compose down -v
else
  echo "Stopping ProxiSport services..."
  docker compose down
fi

echo "Done."
