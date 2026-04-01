# Alerting E2E Test Plan

## Preconditions
- Prometheus running and reachable at http://localhost:9090
- Alertmanager running and reachable at http://localhost:9093
- Slack webhook configured in environment variable SLACK_WEBHOOK_URL
- PagerDuty routing key configured in environment variable PAGERDUTY_ROUTING_KEY

## Test Procedure
1. Start monitoring stack.
2. Export required env vars.
3. Run scripts/test_alert_pipeline.sh.
4. Verify synthetic alert appears in Alertmanager UI/API.
5. Verify Slack notifications in configured channels.
6. Verify PagerDuty incident creation for critical severity.
7. Wait for resolve event and verify resolved notifications.

## Pass Criteria
- Synthetic alert accepted by Alertmanager API.
- Alert visible via /api/v2/alerts.
- Slack receives firing + resolved notifications.
- PagerDuty receives critical incident.

## Troubleshooting
- If no Slack message: validate SLACK_WEBHOOK_URL and channel permissions.
- If no PagerDuty incident: validate PAGERDUTY_ROUTING_KEY.
- If API errors: check Alertmanager logs and YAML syntax.
