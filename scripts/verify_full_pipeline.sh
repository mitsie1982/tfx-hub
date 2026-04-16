#!/usr/bin/env bash
set -euo pipefail

# scripts/verify_full_pipeline.sh
# Orchestrates end-to-end verification:
# 1) Alertmanager API test
# 2) Optional Pushgateway metric spike
# 3) Canary promote to 1% via LaunchDarkly
# 4) Run staged rollout harness (1%,5%,25%)
# 5) Dry-run release (staging artifacts)
#
# Required env vars:
#  ALERTMANAGER_URL
#  (optional) ALERTMANAGER_AUTH_HEADER
#  (optional) PUSHGATEWAY_URL
#  LAUNCHDARKLY_API_TOKEN
#  PROMETHEUS_URL
#
# Usage:
#   chmod +x scripts/verify_full_pipeline.sh
#   ALERTMANAGER_URL="https://..." LAUNCHDARKLY_API_TOKEN="..." PROMETHEUS_URL="http://prom:9090" ./scripts/verify_full_pipeline.sh
#

ROOT="$(pwd)"
LOG_DIR="$ROOT/artifacts/verification_$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$LOG_DIR"
echo "Verification run started at $(date -u +"%Y-%m-%dT%H:%M:%SZ")" | tee "$LOG_DIR/run.log"

# Helpers
run_and_log() {
  echo "---- $1 ----" | tee -a "$LOG_DIR/run.log"
  shift
  if "$@" 2>&1 | tee -a "$LOG_DIR/run.log"; then
    echo "OK: $1" | tee -a "$LOG_DIR/run.log"
  else
    echo "FAIL: $1" | tee -a "$LOG_DIR/run.log"
    return 1
  fi
}

# 1) Alertmanager API test
if [ -z "${ALERTMANAGER_URL:-}" ]; then
  echo "Skipping Alertmanager API test: ALERTMANAGER_URL not set" | tee -a "$LOG_DIR/run.log"
else
  echo "Triggering Alertmanager API test..." | tee -a "$LOG_DIR/run.log"
  run_and_log "Alertmanager API test" bash -c "ALERTMANAGER_URL=\"$ALERTMANAGER_URL\" ALERTMANAGER_AUTH_HEADER=\"${ALERTMANAGER_AUTH_HEADER:-}\" \"$ROOT/scripts/trigger_alert_test.sh\""
fi

# 2) Optional metric spike via Pushgateway
if [ -n "${PUSHGATEWAY_URL:-}" ]; then
  echo "Pushing metric spike to Pushgateway..." | tee -a "$LOG_DIR/run.log"
  run_and_log "Pushgateway metric spike" bash -c "PUSHGATEWAY_URL=\"$PUSHGATEWAY_URL\" \"$ROOT/scripts/simulate_metric_spike.sh\""
  echo "Waiting 90s for Prometheus scrape and rule evaluation..." | tee -a "$LOG_DIR/run.log"
  sleep 90
else
  echo "Skipping Pushgateway metric spike: PUSHGATEWAY_URL not set" | tee -a "$LOG_DIR/run.log"
fi

# 3) Canary promote to 1%
if [ -z "${LAUNCHDARKLY_API_TOKEN:-}" ]; then
  echo "ERROR: LAUNCHDARKLY_API_TOKEN not set; cannot perform canary promote" | tee -a "$LOG_DIR/run.log"
  exit 2
fi

ENV="${1:-staging}"
FLAG="${2:-ams_canary_release}"
echo "Promoting canary to 1% for $FLAG in $ENV" | tee -a "$LOG_DIR/run.log"
run_and_log "Canary promote 1%" bash -c "LAUNCHDARKLY_API_TOKEN=\"$LAUNCHDARKLY_API_TOKEN\" \"$ROOT/scripts/canary_launchdarkly.sh\" promote \"$ENV\" \"$FLAG\" 1"

# 4) Run staged rollout harness
echo "Running staged rollout harness (cohorts 1%,5%,25%)" | tee -a "$LOG_DIR/run.log"
export PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
export LAUNCHDARKLY_API_TOKEN
# Allow override of window via env WINDOW_MINUTES
run_and_log "Staged rollout harness" bash -c "PROMETHEUS_URL=\"$PROMETHEUS_URL\" LAUNCHDARKLY_API_TOKEN=\"$LAUNCHDARKLY_API_TOKEN\" \"$ROOT/scripts/run_staged_rollout_test.sh\" \"$ENV\" \"$FLAG\""

# 4.5) Contractor document verification queue
echo "Running contractor document verification queue automation..." | tee -a "$LOG_DIR/run.log"
run_and_log "Contractor verification queue" bash -c "\"$ROOT/scripts/verify_contractor_docs.sh\""

# 5) Dry-run release
echo "Starting dry-run release for app 'ams' to $ENV" | tee -a "$LOG_DIR/run.log"
run_and_log "Dry-run release" bash -c "LAUNCHDARKLY_API_TOKEN=\"$LAUNCHDARKLY_API_TOKEN\" PROMETHEUS_URL=\"$PROMETHEUS_URL\" \"$ROOT/scripts/dry_run_release.sh\" ams \"$ENV\""

echo "Verification run completed at $(date -u +"%Y-%m-%dT%H:%M:%SZ")" | tee -a "$LOG_DIR/run.log"
echo "Logs and artifacts are in $LOG_DIR" | tee -a "$LOG_DIR/run.log"
