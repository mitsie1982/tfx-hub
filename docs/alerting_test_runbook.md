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
