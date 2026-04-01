# Telemetry KPIs and Alert Thresholds

## Core KPIs
- **Crash Free Users**: percentage of users without crashes in the last 24h.
  - Alert: crash-free users drop below 98% for 15 minutes.
- **Crash Rate**: crashes per 1,000 active users.
  - Alert: crash rate > 5 per 1,000 users sustained for 10 minutes.
- **Unhandled Exceptions**: client-side exceptions count.
  - Alert: exceptions increase > 100% vs 1-hour rolling baseline.
- **API Error Rate**: 5xx responses / total requests.
  - Alert: 5xx rate > 1% sustained for 5 minutes.
- **Latency P95**: backend API 95th percentile latency.
  - Alert: P95 latency > 2x baseline for 10 minutes.
- **Key Business Metric**: e.g., Checkout Conversion or Job Bid Submission Rate.
  - Alert: drop > 5% sustained for 15 minutes.

## Observability Signals
- **Logs**: structured logs with requestId, userId, associationId, traceId.
- **Traces**: distributed tracing for critical flows (login, payment, job submission).
- **Metrics**: Prometheus-style metrics for backend; mobile SDK metrics for client.
- **Events**: release events, feature flag toggles, canary cohort identifiers.

## Alerting Policy
- **Severity P0**: crash loop affecting > 5% users or data loss. Immediate pager.
- **Severity P1**: critical errors impacting core flows. Pager during business hours.
- **Severity P2**: degraded performance or non-critical errors. Slack notification.
- **Escalation**: follow incident_runbook.md for on-call and escalation steps.
