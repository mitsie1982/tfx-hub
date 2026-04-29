# Release Monitoring Runbook

## On-call checklist during rollout
- Monitor Crash Free Users and Crash Rate dashboards.
- Watch API Error Rate and P95 latency panels.
- Confirm device farm smoke tests passed for release artifacts.
- Check Sentry for new error groups and increase in frequency.
- Verify feature flag cohorts and canary cohort health.

## Immediate actions on alert
1. Acknowledge alert and create incident issue.
2. Triage: check logs, traces, and recent deploys.
3. If critical, run: `./scripts/canary_rollout.sh <app> <cohort> rollback`
4. Notify stakeholders and follow incident_runbook.md.

## Post-incident
- Capture timeline, root cause, and remediation.
- Update KPIs and thresholds if needed.
- Add regression tests to prevent recurrence.
