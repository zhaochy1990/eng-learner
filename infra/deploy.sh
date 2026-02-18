#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# One-time infrastructure deployment (CI/CD handles app updates)
# ============================================================
LOCATION="${LOCATION:-southeastasia}"
PARAMS_FILE="${PARAMS_FILE:-main.parameters.json}"

cd "$(dirname "$0")"

echo "=== Deploying infrastructure (subscription-level) ==="
az deployment sub create \
  -l "$LOCATION" \
  -f main.bicep \
  -p "$PARAMS_FILE" \
  --name english-learning-infra \
  --query properties.outputs -o json
