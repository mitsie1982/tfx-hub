#!/usr/bin/env bash
set -euo pipefail

# scripts/configure_alert_receivers_and_test.sh
# Purpose:
#  - Create Alertmanager receiver template (Slack + PagerDuty placeholders)
#  - Create scripts to trigger an end-to-end alert test via Alertmanager API
#  - Create optional Pushgateway metric spike simulator
#  - Add CI workflow to run the alert test
#  - Add VS Code tasks and a short runbook
#
# Usage:
#   chmod +x scripts/configure_alert_receivers_and_test.sh
#   ./scripts/configure_alert_receivers_and_test.sh
#
# Notes:
#  - This script writes templates and test helpers only. It does not change live Alertmanager config.
#  - To enable real alert routing, merge the generated alertmanager_receivers.yml into your Alertmanager config
#    and reload Alertmanager (or update via your config management).
#
ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

MON_DIR="$ROOT/monitoring"
SCRIPTS_DIR="$ROOT/scripts"
CI_DIR="$ROOT/.github/workflows"
DOCS_DIR="$ROOT/docs"
VSCODE_DIR="$ROOT/.vscode"
ARTIFACTS_DIR="$ROOT/artifacts"

mkdir -p "$MON_DIR" "$SCRIPTS_DIR" "$CI_DIR" "$DOCS_DIR" "$VSCODE_DIR" "$ARTIFACTS_DIR"

echo "Configuring alert receivers and test helpers ($TS)"

# -------------------------
# 1) Alertmanager receiver template (placeholder)
# -------------------------
ALERTMGR_FILE="$MON_DIR/alertmanager_receivers.yml"
if [ ! -f "$ALERTMGR_FILE" ] || grep -q "ALERTMANAGER RECEIVERS TEMPLATE" "$ALERTMGR_FILE" 2>/dev/null; then
  cat > "$ALERTMGR_FILE" <<'YAML'
# ALERTMANAGER RECEIVERS TEMPLATE
# Replace placeholders with your real Slack webhook and PagerDuty integration key.
# Merge these receivers into your Alertmanager config and configure routes as needed.

receivers:
  - name: 'slack-mobile-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/REPLACE_WITH_SLACK_WEBHOOK'
        channel: '#mobile-alerts'
        title: '{{ .CommonLabels.alertname }}'
        text: '{{ range .Alerts }}*{{ .Labels.severity }}* - {{ .Annotations.summary }}\n{{ .Annotations.description }}\n{{ end }}'

  - name: 'pagerduty-mobile'
    pagerduty_configs:
      - routing_key: 'REPLACE_WITH_PAGERDUTY_INTEGRATION_KEY'
        severity: '{{ .CommonLabels.severity | default "critical" }}'
        summary: '{{ .CommonAnnotations.summary }}'
        source: 'tfx-hub-mobile'
        class: '{{ .CommonLabels.alertname }}'

# Example route snippet (merge into your existing route tree)
# route:
#   receiver: 'slack-mobile-alerts'
#   routes:
#     - match:
#         severity: 'page'
#       receiver: 'pagerduty-mobile'
YAML
  echo "WROTE: $ALERTMGR_FILE"
else
  echo "SKIP (exists): $ALERTMGR_FILE"
fi

# -------------------------
# 2) Script to trigger a test alert via Alertmanager API
# -------------------------
TRIGGER_SCRIPT="$SCRIPTS_DIR/trigger_alert_test.sh"
cat > "$TRIGGER_SCRIPT" <<'SH'
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
SH
chmod +x "$TRIGGER_SCRIPT"
echo "WROTE: $TRIGGER_SCRIPT"

# -------------------------
# 3) Optional: Pushgateway metric spike simulator (for metric-driven alerts)
# -------------------------
PUSH_SIM="$SCRIPTS_DIR/simulate_metric_spike.sh"
cat > "$PUSH_SIM" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
# scripts/simulate_metric_spike.sh
# Pushes a synthetic metric to a Prometheus Pushgateway to simulate a spike.
# Requires:
#   PUSHGATEWAY_URL (e.g., http://pushgateway.example.com:9091)
# Usage:
#   PUSHGATEWAY_URL="http://..." ./scripts/simulate_metric_spike.sh

PUSHGATEWAY_URL="${PUSHGATEWAY_URL:-}"
JOB="${1:-e2e-test-job}"
METRIC_NAME="${2:-mobile_unhandled_exceptions_total}"
VALUE="${3:-100}"

if [ -z "$PUSHGATEWAY_URL" ]; then
  echo "ERROR: PUSHGATEWAY_URL not set. Export PUSHGATEWAY_URL and re-run."
  exit 2
fi

echo "Pushing metric $METRIC_NAME=$VALUE to $PUSHGATEWAY_URL/job/$JOB"
cat > /tmp/push_metric.txt <<EOF
# TYPE ${METRIC_NAME} counter
${METRIC_NAME} ${VALUE}
EOF

curl -s -X POST --data-binary @/tmp/push_metric.txt "${PUSHGATEWAY_URL}/metrics/job/${JOB}" -o /dev/null
echo "Metric pushed. Prometheus should scrape Pushgateway and alert rules may fire."
SH
chmod +x "$PUSH_SIM"
echo "WROTE: $PUSH_SIM"

# -------------------------
# 4) CI workflow to run the alert test (safe, requires secrets)
# -------------------------
CI_FILE="$CI_DIR/ci_alert_test.yml"
if [ ! -f "$CI_FILE" ]; then
  cat > "$CI_FILE" <<YAML
name: CI Alerting End-to-End Test

on:
  workflow_dispatch:

jobs:
  alert-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run alertmanager test
        env:
          ALERTMANAGER_URL: \${{ secrets.ALERTMANAGER_URL }}
          ALERTMANAGER_AUTH_HEADER: \${{ secrets.ALERTMANAGER_AUTH_HEADER }}
        run: |
          chmod +x scripts/trigger_alert_test.sh
          ./scripts/trigger_alert_test.sh
YAML
  echo "WROTE: $CI_FILE"
else
  echo "SKIP (exists): $CI_FILE"
fi

# -------------------------
# 5) VS Code tasks to run tests locally and open docs
# -------------------------
VSCODE_TASKS="$VSCODE_DIR/tasks.alerting.json"
cat > "$VSCODE_TASKS" <<JSON
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Alerting: Trigger Alertmanager Test",
      "type": "shell",
      "command": "ALERTMANAGER_URL=\"\$ALERTMANAGER_URL\" ./scripts/trigger_alert_test.sh",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Alerting: Simulate Metric Spike (Pushgateway)",
      "type": "shell",
      "command": "PUSHGATEWAY_URL=\"\$PUSHGATEWAY_URL\" ./scripts/simulate_metric_spike.sh",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Alerting: Open Runbook",
      "type": "shell",
      "command": "code -r docs/alerting_test_runbook.md || true",
      "presentation": { "reveal": "always" }
    }
  ]
}
JSON
echo "WROTE: $VSCODE_TASKS"

# -------------------------
# 6) Runbook: docs/alerting_test_runbook.md
# -------------------------
RUNBOOK="$DOCS_DIR/alerting_test_runbook.md"
if [ ! -f "$RUNBOOK" ]; then
  cat > "$RUNBOOK" <<MD
# Alerting End-to-End Test Runbook

Purpose
- Validate Alertmanager routing to Slack and PagerDuty.
- Validate metric-driven alerts by simulating a metric spike.

Prerequisites
- Alertmanager endpoint reachable (ALERTMANAGER_URL)
- Slack webhook and PagerDuty integration configured in Alertmanager (merge monitoring/alertmanager_receivers.yml into your config)
- (Optional) Pushgateway reachable for metric simulation (PUSHGATEWAY_URL)
- CI secrets: ALERTMANAGER_URL, ALERTMANAGER_AUTH_HEADER (if required)

Steps: Alertmanager API test
1. Ensure Alertmanager is configured with the receivers and routes.
2. Run locally:
   ALERTMANAGER_URL="https://alertmanager.example.com/api/v2/alerts" ./scripts/trigger_alert_test.sh
3. Verify:
   - Slack channel receives a message from the configured receiver.
   - PagerDuty receives an incident (if severity=page).
   - Alertmanager UI shows the E2ETestAlert.

Steps: Metric-driven test (Pushgateway)
1. Push a synthetic metric:
   PUSHGATEWAY_URL="http://pushgateway.example.com:9091" ./scripts/simulate_metric_spike.sh
2. Wait for Prometheus scrape and rule evaluation window (depends on scrape interval and rule 'for' duration).
3. Verify the same receivers receive notifications.

CI test
- Trigger the GitHub Actions workflow "CI Alerting End-to-End Test" (workflow_dispatch).
- Ensure secrets are configured in repository settings.

Troubleshooting
- If Alertmanager returns non-200/202, check URL and auth header.
- If Slack/PagerDuty do not receive notifications, inspect Alertmanager logs and routing tree.
- For metric tests, ensure Prometheus scrapes Pushgateway and that alert rules reference the pushed metric.

Acceptance criteria
- Slack message appears with summary and description.
- PagerDuty incident is created (if configured).
- Alertmanager shows the synthetic alert in the UI.
MD
  echo "WROTE: $RUNBOOK"
else
  echo "SKIP (exists): $RUNBOOK"
fi

# -------------------------
# 7) Record artifact and commit (if in git)
# -------------------------
ART_FILE="$ARTIFACTS_DIR/alerting_test_artifacts_$TS.txt"
cat > "$ART_FILE" <<EOF
Alerting test artifacts: $TS
 - $ALERTMGR_FILE
 - $TRIGGER_SCRIPT
 - $PUSH_SIM
 - $CI_FILE
 - $VSCODE_TASKS
 - $RUNBOOK
EOF

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add "$MON_DIR" "$SCRIPTS_DIR" "$CI_FILE" "$VSCODE_DIR" "$DOCS_DIR" || true
  git commit -m "chore(alerting): add Alertmanager receiver template and E2E alert test helpers ($TS)" || true
fi

echo "Alerting configuration and test helpers created."
echo "Artifacts: $ART_FILE"
echo ""
echo "Next recommended actions:"
echo "1) Merge monitoring/alertmanager_receivers.yml into your live Alertmanager config and reload Alertmanager."
echo "2) Configure Slack webhook and PagerDuty integration keys in Alertmanager or secrets manager."
echo "3) Run the test locally: export ALERTMANAGER_URL and optionally ALERTMANAGER_AUTH_HEADER, then ./scripts/trigger_alert_test.sh"
echo "4) Trigger the CI workflow to validate the test in your CI environment."
echo ""
echo "When you finish these steps, reply 'Whats next' and I will generate the next consolidated script: integrate canary_rollout.sh with LaunchDarkly (or Unleash) and provide test lanes for staged rollouts."
