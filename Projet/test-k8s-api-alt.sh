#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8081}"

if command -v lsof >/dev/null 2>&1; then
  if lsof -i ":${PORT}" >/dev/null 2>&1; then
    echo "Port ${PORT} already used. Choose another port, ex: ./test-k8s-api-alt.sh 8090"
    exit 1
  fi
fi

echo "Testing API through port-forward on port ${PORT}"

kubectl port-forward service/backend-service "${PORT}:3000" >/tmp/k8s-port-forward.log 2>&1 &
PF_PID=$!

cleanup() {
  kill "${PF_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

sleep 4

echo "GET /health"
curl -fsS "http://127.0.0.1:${PORT}/health"
echo

echo "GET /equipements/stats"
curl -fsS "http://127.0.0.1:${PORT}/equipements/stats"
echo

echo "API test completed."
