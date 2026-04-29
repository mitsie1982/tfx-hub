#!/usr/bin/env bash
set -euo pipefail
# scripts/trigger_alert_test.sh
# Posts a synthetic alert to Alertmanager API v2.
#
# Required env:
#   ALERTMANAGER_URL (e.g., https://alertmanager.example.com/api/v2/alerts)
# Optional env:
#   ALERTMANAGER_AUTH_HEADER (e.g., "Authorization: Bearer <token>")
# Usage:
#   ALERTMANAGER_URL="https://..." ./scripts/trigger_alert_test.sh

ALERTMANAGER_URL="${ALERTMANAGER_URL:-}"
AUTH_HEADER="${ALERTMANAGER_AUTH_HEADER:-}"

if [ -z "$ALERTMANAGER_URL" ]; then
  echo "ERROR: ALERTMANAGER_URL not set. Export ALERTMANAGER_URL and re-run."
  exit 2
fi

# Build a simple test alert payload (Alertmanager v2 API)
read -r -d '' PAYLOAD <<'JSON'
[
  {
    "labels": {
      "alertname": "E2ETestAlert",
      "severity": "page",
      "service": "tfx-hub-mobile",
      "test_run": "true"
    },
    "annotations": {
      "summary": "E2E alert test from repo",
      "description": "This is a synthetic test alert to validate routing to Slack/PagerDuty."
    },
    "startsAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "endsAt": "$(date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%SZ)"
  }
]
JSON

# Replace the date placeholders (POSIX compatibility)
PAYLOAD=$(echo "$PAYLOAD" | sed "s|\$(date -u +%Y-%m-%dT%H:%M:%SZ)|$(date -u +%Y-%m-%dT%H:%M:%SZ)|g")
PAYLOAD=$(echo "$PAYLOAD" | sed "s|\$(date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%SZ)|$(date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%SZ)|g")

echo "Posting synthetic alert to $ALERTMANAGER_URL"
if [ -n "$AUTH_HEADER" ]; then
  HTTP_STATUS=$(curl -s -o /dev/stderr -w "%{http_code}" -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" -d "$PAYLOAD" "$ALERTMANAGER_URL" 2>&1) || true
else
  HTTP_STATUS=$(curl -s -o /dev/stderr -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$ALERTMANAGER_URL" 2>&1) || true
fi

echo "Alertmanager response HTTP status: $HTTP_STATUS"
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "202" ]; then
  echo "Alert posted successfully. Verify Slack/PagerDuty for the test notification."
  exit 0
else
  echo "Alertmanager returned non-success status: $HTTP_STATUS"
  exit 3
fi
