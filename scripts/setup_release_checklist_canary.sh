#!/usr/bin/env bash
set -euo pipefail

# scripts/setup_release_checklist_canary.sh (Phase 10)
# Purpose:
#  - Create release checklist, rollout plan, telemetry KPIs, alerting placeholders
#  - Scaffold canary rollout helper scripts and CI gating for monitoring readiness
#  - Create runbooks and incident playbooks
#  - Idempotent: safe to re-run; will not overwrite non-placeholder files
#
# Usage:
#   chmod +x scripts/setup_release_checklist_canary.sh
#   ./scripts/setup_release_checklist_canary.sh

ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

DOCS_DIR="$ROOT/docs"
SCRIPTS_DIR="$ROOT/scripts"
CI_DIR="$ROOT/.github/workflows"
MON_DIR="$ROOT/monitoring"
VSCODE_DIR="$ROOT/.vscode"
ARTIFACTS_DIR="$ROOT/artifacts"

mkdir -p "$DOCS_DIR" "$SCRIPTS_DIR" "$CI_DIR" "$MON_DIR" "$VSCODE_DIR" "$ARTIFACTS_DIR"

echo "📋 Phase 10: Bootstrapping release checklist, KPIs, and canary rollout ($TS)"

# -------------------------
# 1) Release checklist and rollout plan
# -------------------------
RELEASE_DOC="$DOCS_DIR/release_and_monitoring_checklist.md"
if [ ! -f "$RELEASE_DOC" ]; then
cat > "$RELEASE_DOC" << 'MDEOF'
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
- Crash rate increases by > 200% vs baseline.
- Error rate (5xx or client-side exceptions) increases by > 100% vs baseline.
- Key business metric drop (e.g., checkout conversion) > 5% sustained for 15 minutes.
- Manual decision by on-call + product owner.
MDEOF
  echo "✓ Created release and monitoring checklist: $RELEASE_DOC"
else
  echo "- Release doc exists (skipped): $RELEASE_DOC"
fi

# -------------------------
# 2) Telemetry KPIs and alert thresholds
# -------------------------
KPIS_DOC="$DOCS_DIR/telemetry_kpis.md"
if [ ! -f "$KPIS_DOC" ]; then
cat > "$KPIS_DOC" << 'MDEOF'
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
MDEOF
  echo "✓ Created telemetry KPIs doc: $KPIS_DOC"
else
  echo "- KPIs doc exists (skipped): $KPIS_DOC"
fi

# -------------------------
# 3) Monitoring placeholders: Prometheus alert rules and Grafana dashboard JSON
# -------------------------
PROM_RULES="$MON_DIR/prometheus_alerts_kpis.yml"
if [ ! -f "$PROM_RULES" ]; then
cat > "$PROM_RULES" << 'YAMLEOF'
# monitoring/prometheus_alerts_kpis.yml
# Placeholder Prometheus alert rules for TFX Hub KPIs
groups:
- name: tfxhub-mobile-alerts-kpis
  rules:
  - alert: HighCrashRate
    expr: increase(mobile_crashes_total[10m]) / increase(mobile_active_users_total[10m]) > 0.005
    for: 10m
    labels:
      severity: page
    annotations:
      summary: "High crash rate detected"
      description: "Crash rate > 0.5% over last 10m"

  - alert: HighAPIErrorRate
    expr: increase(api_responses_total{status=~"5.."}[5m]) / increase(api_responses_total[5m]) > 0.01
    for: 5m
    labels:
      severity: page
    annotations:
      summary: "High API 5xx rate"
      description: "API 5xx rate > 1% over last 5m"

  - alert: HighLatencyP95
    expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 2
    for: 10m
    labels:
      severity: ticket
    annotations:
      summary: "High P95 latency"
      description: "P95 latency > 2s over last 10m"
YAMLEOF
  echo "✓ Created Prometheus alert rules: $PROM_RULES"
else
  echo "- Prometheus rules exist (skipped): $PROM_RULES"
fi

# -------------------------
# 4) Canary rollout helper scripts
# -------------------------
CANARY_SCRIPT="$SCRIPTS_DIR/canary_rollout.sh"
if [ ! -f "$CANARY_SCRIPT" ]; then
cat > "$CANARY_SCRIPT" << 'SHEOF'
#!/usr/bin/env bash
set -euo pipefail
# scripts/canary_rollout.sh
# Usage: ./scripts/canary_rollout.sh <app> <cohort_percent> <action>
# action: promote | rollback | status
APP="${1:-ams}"
COHORT="${2:-1}"   # percent
ACTION="${3:-status}"

echo "Canary helper: app=$APP cohort=${COHORT}% action=$ACTION"

# Placeholder: integrate with feature flag service or store staged rollout APIs
if [ "$ACTION" = "promote" ]; then
  echo "Promoting cohort to ${COHORT}% for $APP (placeholder)"
  # Example: call LaunchDarkly or feature flag API to set cohort
elif [ "$ACTION" = "rollback" ]; then
  echo "Rolling back $APP to previous stable release (placeholder)"
  # Example: call Fastlane lane or Play Store API to rollback staged rollout
else
  echo "Status for $APP (placeholder): cohort ${COHORT}% active"
fi
SHEOF
  chmod +x "$CANARY_SCRIPT"
  echo "✓ Created canary rollout helper: $CANARY_SCRIPT"
else
  echo "- Canary script exists (skipped): $CANARY_SCRIPT"
fi

# Feature flag config placeholder
FF_CONFIG="$MON_DIR/feature_flags_example.json"
if [ ! -f "$FF_CONFIG" ]; then
cat > "$FF_CONFIG" << 'JSONEOF'
{
  "flags": {
    "ams_canary_release": { "type": "percentage", "value": 1 },
    "contractor_canary_release": { "type": "percentage", "value": 1 }
  }
}
JSONEOF
  echo "✓ Created feature flag example: $FF_CONFIG"
else
  echo "- Feature flag config exists (skipped): $FF_CONFIG"
fi

# -------------------------
# 5) CI gating workflow
# -------------------------
CI_FILE="$CI_DIR/ci_monitoring_gates.yml"
if [ ! -f "$CI_FILE" ]; then
cat > "$CI_FILE" << 'YAMLEOF'
name: CI Monitoring Gates

on:
  workflow_dispatch:
  pull_request:
    paths:
      - 'docs/**'
      - 'monitoring/**'
      - 'scripts/**'
      - '.github/**'

jobs:
  check-monitoring:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Ensure monitoring and KPI artifacts present
        run: |
          set -e
          if [ ! -f "monitoring/prometheus_alerts_kpis.yml" ]; then
            echo "Missing monitoring/prometheus_alerts_kpis.yml"
            exit 1
          fi
          if [ ! -f "monitoring/feature_flags_example.json" ]; then
            echo "Missing monitoring/feature_flags_example.json"
            exit 1
          fi
          if [ ! -f "docs/release_and_monitoring_checklist.md" ]; then
            echo "Missing docs/release_and_monitoring_checklist.md"
            exit 1
          fi
          echo "✓ Monitoring and KPI artifacts present"
YAMLEOF
  echo "✓ Created CI monitoring gates workflow: $CI_FILE"
else
  echo "- CI workflow exists (skipped): $CI_FILE"
fi

# -------------------------
# 6) Runbooks and incident playbooks
# -------------------------
RUNBOOK_FILE="$DOCS_DIR/release_monitoring_runbook.md"
if [ ! -f "$RUNBOOK_FILE" ]; then
cat > "$RUNBOOK_FILE" << 'MDEOF'
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
MDEOF
  echo "✓ Created release monitoring runbook: $RUNBOOK_FILE"
else
  echo "- Runbook exists (skipped): $RUNBOOK_FILE"
fi

# -------------------------
# 7) VS Code tasks
# -------------------------
TASKS_FILE="$VSCODE_DIR/tasks.release-monitoring.json"
cat > "$TASKS_FILE" << 'JSONEOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Open Release Checklist",
      "type": "shell",
      "command": "code -r docs/release_and_monitoring_checklist.md",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Open Telemetry KPIs",
      "type": "shell",
      "command": "code -r docs/telemetry_kpis.md",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Canary Promote 1%",
      "type": "shell",
      "command": "./scripts/canary_rollout.sh ams 1 promote",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Canary Rollback",
      "type": "shell",
      "command": "./scripts/canary_rollout.sh ams 1 rollback",
      "presentation": { "reveal": "always" }
    }
  ]
}
JSONEOF
echo "✓ Created VS Code tasks: $TASKS_FILE"

# -------------------------
# 8) Artifacts summary
# -------------------------
ARTIFACTS_LOG="$ARTIFACTS_DIR/phase10_release_checklist_${TS}.txt"
cat > "$ARTIFACTS_LOG" << 'EOF'
Phase 10: Release Checklist, KPIs, and Canary Infrastructure
============================================================
EOF
echo " - $RELEASE_DOC" >> "$ARTIFACTS_LOG"
echo " - $KPIS_DOC" >> "$ARTIFACTS_LOG"
echo " - $PROM_RULES" >> "$ARTIFACTS_LOG"
echo " - $CANARY_SCRIPT" >> "$ARTIFACTS_LOG"
echo " - $FF_CONFIG" >> "$ARTIFACTS_LOG"
echo " - $CI_FILE" >> "$ARTIFACTS_LOG"
echo " - $RUNBOOK_FILE" >> "$ARTIFACTS_LOG"
echo " - $TASKS_FILE" >> "$ARTIFACTS_LOG"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add "$DOCS_DIR" "$MON_DIR" "$SCRIPTS_DIR" "$CI_DIR" "$VSCODE_DIR" "$ARTIFACTS_DIR" 2>/dev/null || true
  git commit -m "chore(phase-10): release checklist, KPIs, canary helpers, and CI gates ($TS)" 2>/dev/null || true
fi

echo ""
echo "======================================================================"
echo "✅ PHASE 10 COMPLETE: Release Checklist & Canary Infrastructure"
echo "======================================================================"
echo ""
echo "📦 CREATED FILES:"
echo "   ✓ docs/release_and_monitoring_checklist.md (release process + rollout strategy)"
echo "   ✓ docs/telemetry_kpis.md (KPI definitions + alert thresholds)"
echo "   ✓ docs/release_monitoring_runbook.md (on-call guide + incident response)"
echo "   ✓ monitoring/prometheus_alerts_kpis.yml (Prometheus alert rules)"
echo "   ✓ monitoring/feature_flags_example.json (feature flag configuration)"
echo "   ✓ scripts/canary_rollout.sh (promote/rollback/status helper)"
echo "   ✓ .github/workflows/ci_monitoring_gates.yml (CI validation)"
echo "   ✓ .vscode/tasks.release-monitoring.json (VS Code tasks)"
echo ""
echo "📋 NEXT STEPS:"
echo "   1. Review docs/release_and_monitoring_checklist.md"
echo "   2. Review docs/telemetry_kpis.md and customize KPI thresholds"
echo "   3. Update monitoring/prometheus_alerts_kpis.yml with real metrics"
echo "   4. Integrate scripts/canary_rollout.sh with:"
echo "      - LaunchDarkly or your feature flag provider"
echo "      - Play Store Managed Publishing or App Store TestFlight APIs"
echo "   5. Configure alert receivers in .github/workflows (Slack/PagerDuty)"
echo ""
echo "🚀 RUN VS CODE TASKS:"
echo "   - Ctrl+Shift+P → Tasks: Run Task → Select 'Open Release Checklist'"
echo "   - Ctrl+Shift+P → Tasks: Run Task → Select 'Open Telemetry KPIs'"
echo ""
echo "Artifacts log: $ARTIFACTS_LOG"
echo ""
