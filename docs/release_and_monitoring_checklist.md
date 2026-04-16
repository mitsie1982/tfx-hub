# Release and Monitoring Checklist

## Purpose

This document defines the release gating, rollout plan, monitoring KPIs, alerting thresholds, and runbooks to ensure safe production releases for TFX Hub AMS and Contractor apps.

## Release Preconditions

- All CI checks pass (unit, integration, lint, E2E).
- Security scan and secret checks pass.
- Observability initialization present in app entry points.
- Signing credentials configured in CI secrets.
- Feature flags configured for canary rollout.

## Release Steps

1. Create release branch and bump versions.
2. Run full test suite and E2E smoke tests.
3. Build artifacts for target platforms.
4. Upload artifacts to staging stores and distribute to internal testers.
5. Run device farm smoke tests.
6. Deploy backend changes (if any) with migration plan.
7. Start canary rollout for mobile app via staged rollout (Play Store) or phased release (App Store).
8. Monitor KPIs for the canary window (see KPIs below).
9. If stable, promote rollout to wider audience; otherwise rollback.

## Canary Rollout Strategy

- **Duration**: 1–24 hours depending on risk.
- **Cohorts**: 1% -> 5% -> 25% -> 100% (adjust per risk).
- **Gates**: No critical errors; error rate below threshold; crash-free users above threshold.
- **Automated rollback**: If any critical alert fires, trigger rollback lane and notify on-call.

## Rollback Criteria

## Production Observability & SLOs Checklist

### Metrics & Instrumentation

- [ ] Prometheus metrics endpoint exposed and tested (backend, API, jobs)
- [ ] Key business KPIs instrumented (job posted, job completed, onboarding, payment, etc.)
- [ ] Error and latency metrics for all critical endpoints
- [ ] Custom metrics for WhatsApp delivery, onboarding funnel, and credential verification

### Dashboards

- [ ] Grafana dashboards for:
  - API error rate, latency, throughput
  - WhatsApp message delivery and failures
  - Professional onboarding funnel
  - Credential verification and disputes
  - SLO compliance (see below)

### Alerting

- [ ] Alertmanager or equivalent configured for:
  - API 5xx error rate > 1% (5 min)
  - WhatsApp delivery failures > 2/min
  - Onboarding drop-off > 10%/stage
  - SLO violation (see below)
- [ ] Alerts routed to on-call (Slack, email, WhatsApp)
- [ ] Runbook links included in all alerts

### SLOs (Service Level Objectives)

- [ ] API availability ≥ 99.9% (monthly)
- [ ] WhatsApp delivery success ≥ 99.5%
- [ ] Onboarding completion ≥ 85%
- [ ] Credential verification SLA ≤ 48h
- [ ] Dispute mediation SLA ≤ 48h

### Runbooks & Incident Response

- [ ] Runbooks for all critical alerts (API, WhatsApp, onboarding, payments)
- [ ] Incident escalation and rollback procedures documented
- [ ] Post-incident review template and process

### Tracing & Error Reporting

- [ ] Distributed tracing enabled (OpenTelemetry or equivalent)
- [ ] Sentry/Firebase Crashlytics integrated for error reporting
- [ ] All critical errors auto-captured and triaged

---

**See also:** metrics_instrumentation_backend.md, telemetry_kpis.md, monitoring_integration_checklist.md, alerting_runbooks.md
