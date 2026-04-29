#!/usr/bin/env bash
# scripts/nightly-agent.sh
# Pulls latest repo and runs nightly CI tasks
set -euo pipefail
cd "$(dirname "$0")/.."
echo "[Nightly Agent] Pulling latest changes..."
git pull --rebase
echo "[Nightly Agent] Running nightly CI..."
# Replace with your actual nightly script or CI command
npm ci
npm run lint || true
npm test
npm run build
