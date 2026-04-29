#!/usr/bin/env bash
set -euo pipefail
# scripts/run_staged_rollout_test.sh
# Promote cohorts and validate metrics via Prometheus; rollback on threshold breach.
# Usage:
#   PROMETHEUS_URL="http://prometheus:9090" LAUNCHDARKLY_API_TOKEN="..." ./scripts/run_staged_rollout_test.sh staging ams_canary_release
ENV="${1:-staging}"
FLAG="${2:-ams_canary_release}"
PROM_URL="${PROMETHEUS_URL:-http://localhost:9090}"
LD_HELPER="$(dirname "$0")/canary_launchdarkly.sh"
WINDOW_MINUTES="${WINDOW_MINUTES:-5}"
CRASH_RATE_THRESHOLD="${CRASH_RATE_THRESHOLD:-0.005}"  # 0.5%
API_5XX_THRESHOLD="${API_5XX_THRESHOLD:-0.01}"        # 1%

if [ ! -x "$LD_HELPER" ]; then
  echo "Missing LaunchDarkly helper: $LD_HELPER"
  exit 2
fi

urlencode() { python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$1"; }

prom_query() {
  local q="$1"
  local enc
  enc=$(urlencode "$q")
  curl -s --fail "$PROM_URL/api/v1/query?query=$enc" | jq -r '.data.result[0].value[1] // "0"' || echo "0"
}

prom_check_crash_rate() {
  prom_query 'increase(mobile_crashes_total[10m]) / max(1, increase(mobile_active_users_total[10m]))'
}

prom_check_5xx_rate() {
  prom_query 'increase(api_responses_total{status=~"5.."}[5m]) / max(1, increase(api_responses_total[5m]))'
}

prom_wait_and_eval() {
  echo "Waiting ${WINDOW_MINUTES} minutes for metrics to stabilize..."
  sleep $((WINDOW_MINUTES * 60))
  local crash_rate api_5xx
  crash_rate=$(prom_check_crash_rate)
  api_5xx=$(prom_check_5xx_rate)
  echo "Observed crash_rate=${crash_rate} api_5xx=${api_5xx}"
  awk -v cr="$crash_rate" -v thr="$CRASH_RATE_THRESHOLD" 'BEGIN{ if (cr+0 > thr+0) exit 1; exit 0 }'
  local cr_ok=$?
  awk -v a5="$api_5xx" -v thr="$API_5XX_THRESHOLD" 'BEGIN{ if (a5+0 > thr+0) exit 1; exit 0 }'
  local api_ok=$?
  if [ $cr_ok -ne 0 ] || [ $api_ok -ne 0 ]; then
    return 1
  fi
  return 0
}

COHORTS=(1 5 25)
for pct in "${COHORTS[@]}"; do
  echo "Promoting to ${pct}%"
  LAUNCHDARKLY_API_TOKEN="${LAUNCHDARKLY_API_TOKEN:-}" "$LD_HELPER" promote "$ENV" "$FLAG" "$pct" || { echo "Promote failed"; exit 3; }
  if prom_wait_and_eval; then
    echo "Cohort ${pct}% passed checks; continuing."
  else
    echo "Cohort ${pct}% failed checks; rolling back."
    LAUNCHDARKLY_API_TOKEN="${LAUNCHDARKLY_API_TOKEN:-}" "$LD_HELPER" rollback "$ENV" "$FLAG" || true
    exit 4
  fi
done

echo "Staged rollout test completed successfully."
exit 0
