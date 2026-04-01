#!/usr/bin/env bash
set -euo pipefail
# scripts/test_canary_lanes.sh
# Simulates staged canary lanes and validates command flow.
#
# Usage:
#   CANARY_PROVIDER=launchdarkly ./scripts/test_canary_lanes.sh ams

APP="${1:-ams}"

run_lane() {
  local pct="$1"
  echo "--- Lane: promote to ${pct}% ---"
  ./scripts/canary_rollout_integrated.sh "$APP" "$pct" promote
  echo "Sleeping briefly to simulate observation window"
  sleep 1
}

echo "Running staged lanes for app=$APP"
run_lane 1
run_lane 5
run_lane 25
run_lane 100

echo "Staged rollout lanes complete"
