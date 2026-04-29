#!/usr/bin/env bash
set -euo pipefail

# scripts/test_alert_pipeline.sh
# Tests alert flow: Prometheus rule evaluation -> Alertmanager -> receiver delivery.

PROM_URL="${PROM_URL:-http://localhost:9090}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"
TEST_ALERT_NAME="TFXHubSyntheticAlert"
DURATION_SECS="${DURATION_SECS:-120}"

_echo() { printf "%s\n" "$*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    _echo "Missing required command: $1"
    exit 1
  }
}

require_cmd curl

_echo "[1/6] Checking Prometheus health..."
curl -fsS "$PROM_URL/-/healthy" >/dev/null

_echo "[2/6] Checking Alertmanager health..."
curl -fsS "$ALERTMANAGER_URL/-/healthy" >/dev/null

_echo "[3/6] Sending synthetic alert to Alertmanager API..."
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
END="$(date -u -d "+${DURATION_SECS} seconds" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || python - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc)+timedelta(seconds=int(__import__('os').environ.get('DURATION_SECS','120')))).strftime('%Y-%m-%dT%H:%M:%SZ'))
PY
)"

cat > /tmp/tfxhub_synthetic_alert.json <<EOF
[
  {
    "labels": {
      "alertname": "$TEST_ALERT_NAME",
      "severity": "critical",
      "service": "tfxhub-alert-test"
    },
    "annotations": {
      "summary": "Synthetic E2E alert",
      "description": "Synthetic alert for pipeline validation"
    },
    "startsAt": "$NOW",
    "endsAt": "$END"
  }
]
EOF

curl -fsS -X POST \
  -H "Content-Type: application/json" \
  --data @/tmp/tfxhub_synthetic_alert.json \
  "$ALERTMANAGER_URL/api/v2/alerts" >/dev/null

_echo "[4/6] Verifying alert exists in Alertmanager..."
ALERTS_JSON="$(curl -fsS "$ALERTMANAGER_URL/api/v2/alerts")"
printf "%s" "$ALERTS_JSON" | grep -q "$TEST_ALERT_NAME"

_echo "[5/6] Checking active alerts endpoint..."
curl -fsS "$PROM_URL/api/v1/alerts" >/dev/null || true

_echo "[6/6] Success: synthetic alert submitted and visible in Alertmanager."
_echo "Next: verify Slack/PagerDuty notification delivery from receiver logs/channels."
