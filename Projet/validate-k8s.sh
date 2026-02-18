#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Waiting for backend deployment..."
kubectl rollout status deployment/backend --timeout=180s

echo "[2/4] Waiting for frontend deployment..."
kubectl rollout status deployment/frontend --timeout=180s

echo "[3/4] Waiting for postgres deployment..."
kubectl rollout status deployment/postgres --timeout=180s

echo "[4/4] Cluster state"
kubectl get pods -o wide
kubectl get services

echo "Validation succeeded."
