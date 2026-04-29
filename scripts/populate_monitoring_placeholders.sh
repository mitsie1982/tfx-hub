#!/usr/bin/env bash
set -euo pipefail

# scripts/populate_monitoring_placeholders.sh
# Purpose:
#  - Populate monitoring placeholders with concrete Prometheus rules and Grafana dashboard JSON
#  - Update docs/telemetry_kpis.md with metric definitions and thresholds
#  - Add a VS Code task to open the Grafana dashboard JSON
#
# Usage:
#   chmod +x scripts/populate_monitoring_placeholders.sh
#   ./scripts/populate_monitoring_placeholders.sh
#
# Idempotent: will not overwrite files if they already contain non-placeholder content.

ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

MON_DIR="$ROOT/monitoring"
PROM_FILE="$MON_DIR/prometheus_alerts.yml"
GRAFANA_FILE="$MON_DIR/grafana_dashboard_tfxhub.json"
KPIS_DOC="$ROOT/docs/telemetry_kpis.md"
VSCODE_TASKS="$ROOT/.vscode/tasks.monitoring.json"
ARTIFACTS_DIR="$ROOT/artifacts"

mkdir -p "$MON_DIR" "$ARTIFACTS_DIR" "$ROOT/.vscode" "$ROOT/docs"

echo "Populating monitoring placeholders ($TS)"

# Helper: write file only if missing or contains placeholder marker
write_if_placeholder() {
  local path="$1"
  local marker="$2"
  local content="$3"
  if [ ! -f "$path" ]; then
    printf "%s\n" "$content" > "$path"
    echo "WROTE: $path"
  else
    if grep -q "$marker" "$path" 2>/dev/null || [ ! -s "$path" ]; then
      printf "%s\n" "$content" > "$path"
      echo "REPLACED placeholder: $path"
    else
      echo "SKIP (exists with content): $path"
    fi
  fi
}

# -------------------------
# 1) Prometheus alert rules (concrete metric names and queries)
# -------------------------
PROM_CONTENT=$(cat <<'YAML'
# monitoring/prometheus_alerts.yml
# Concrete alert rules for TFX Hub mobile + backend
# Replace metric names with your actual exporters/SDK metrics if different.

groups:
- name: tfxhub-mobile-alerts
  rules:
  - alert: MobileHighCrashRate
    expr: |
      increase(mobile_crashes_total[10m])
      /
      max(1, increase(mobile_active_users_total[10m])) > 0.005
    for: 10m
    labels:
      severity: page
    annotations:
      summary: "High mobile crash rate"
      description: "Crash rate > 0.5% over last 10m. Query: increase(mobile_crashes_total[10m]) / increase(mobile_active_users_total[10m])"

  - alert: MobileUnhandledExceptionsSpike
    expr: increase(mobile_unhandled_exceptions_total[5m]) > 50
    for: 5m
    labels:
      severity: ticket
    annotations:
      summary: "Spike in unhandled client exceptions"
      description: "Unhandled exceptions increased by more than 50 in 5m."

  - alert: BackendHigh5xxRate
    expr: |
      increase(api_responses_total{status=~"5.."}[5m])
      /
      max(1, increase(api_responses_total[5m])) > 0.01
    for: 5m
    labels:
      severity: page
    annotations:
      summary: "High backend 5xx rate"
      description: "5xx responses > 1% over last 5m."

  - alert: BackendHighP95Latency
    expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 2
    for: 10m
    labels:
      severity: ticket
    annotations:
      summary: "High backend P95 latency"
      description: "P95 latency > 2s over last 10m."

  - alert: PaymentFailureRateHigh
    expr: |
      increase(payment_failures_total[15m])
      /
      max(1, increase(payment_attempts_total[15m])) > 0.02
    for: 15m
    labels:
      severity: page
    annotations:
      summary: "High payment failure rate"
      description: "Payment failure rate > 2% over last 15m."

  - alert: KeyBusinessMetricDrop
    expr: |
      (1 - (sum(rate(job_bid_submissions_total[15m])) / max(1, sum(rate(job_bid_submissions_total[1h]))))) > 0.05
    for: 15m
    labels:
      severity: page
    annotations:
      summary: "Key business metric drop"
      description: "Job bid submissions dropped >5% vs 1h baseline."
YAML
)

write_if_placeholder "$PROM_FILE" "tfxhub-mobile-alerts" "$PROM_CONTENT"

# -------------------------
# 2) Grafana dashboard JSON with example queries
# -------------------------
GRAFANA_CONTENT=$(cat <<'JSON'
{
  "dashboard": {
    "id": null,
    "title": "TFX Hub Mobile Overview",
    "panels": [
      {
        "type": "graph",
        "title": "Mobile Crash Rate (per 1k users)",
        "targets": [
          {
            "expr": "1000 * increase(mobile_crashes_total[10m]) / max(1, increase(mobile_active_users_total[10m]))",
            "legendFormat": "crashes_per_1k"
          }
        ]
      },
      {
        "type": "graph",
        "title": "Unhandled Exceptions (5m)",
        "targets": [
          {
            "expr": "increase(mobile_unhandled_exceptions_total[5m])",
            "legendFormat": "exceptions_5m"
          }
        ]
      },
      {
        "type": "graph",
        "title": "Backend 5xx Rate (%)",
        "targets": [
          {
            "expr": "100 * increase(api_responses_total{status=~\"5..\"}[5m]) / max(1, increase(api_responses_total[5m]))",
            "legendFormat": "5xx_percent"
          }
        ]
      },
      {
        "type": "graph",
        "title": "Backend P95 Latency (s)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "p95_s"
          }
        ]
      },
      {
        "type": "stat",
        "title": "Crash Free Users (24h)",
        "targets": [
          {
            "expr": "100 * (1 - increase(mobile_crashes_total[24h]) / max(1, increase(mobile_active_users_total[24h])))",
            "legendFormat": "crash_free_pct"
          }
        ]
      },
      {
        "type": "graph",
        "title": "Payment Success Rate (%)",
        "targets": [
          {
            "expr": "100 * (1 - increase(payment_failures_total[15m]) / max(1, increase(payment_attempts_total[15m])))",
            "legendFormat": "payment_success_pct"
          }
        ]
      },
      {
        "type": "graph",
        "title": "Job Bid Submissions (rate)",
        "targets": [
          {
            "expr": "rate(job_bid_submissions_total[5m])",
            "legendFormat": "job_bid_rate"
          }
        ]
      },
      {
        "type": "table",
        "title": "Recent Error Groups (Sentry placeholder)",
        "targets": [
          {
            "expr": "topk(10, increase(mobile_unhandled_exceptions_total[1h]))",
            "legendFormat": "top_errors"
          }
        ]
      }
    ]
  }
}
JSON
)

write_if_placeholder "$GRAFANA_FILE" "TFX Hub Mobile Overview" "$GRAFANA_CONTENT"

# -------------------------
# 3) Update docs/telemetry_kpis.md with metric definitions and thresholds
# -------------------------
KPIS_CONTENT=$(cat <<'MD'
# Telemetry KPIs and Metric Definitions

This file lists the concrete metric names used in monitoring and recommended alert thresholds.

## Mobile client metrics
- **mobile_active_users_total**
  Cumulative count of active users (incremented per unique active session). Used as denominator for rates.

- **mobile_crashes_total**
  Total number of crashes reported by the mobile SDK (Crashlytics/Sentry).
  **Alert**: MobileHighCrashRate ? crash rate > 0.5% over 10 minutes.

- **mobile_unhandled_exceptions_total**
  Count of unhandled JS/native exceptions captured by the mobile SDK.
  **Alert**: MobileUnhandledExceptionsSpike ? increase > 50 in 5 minutes.

## Backend metrics
- **api_responses_total{status=...}**
  Counter of API responses labeled by HTTP status. Use to compute 5xx rate.
  **Alert**: BackendHigh5xxRate ? 5xx rate > 1% over 5 minutes.

- **http_request_duration_seconds_bucket**
  Histogram buckets for request latency. Use histogram_quantile to compute P95.
  **Alert**: BackendHighP95Latency ? P95 > 2s over 10 minutes.

- **payment_attempts_total**, **payment_failures_total**
  Counters for payment attempts and failures.
  **Alert**: PaymentFailureRateHigh ? failure rate > 2% over 15 minutes.

- **job_bid_submissions_total**
  Counter for job bid submissions (key business metric).
  **Alert**: KeyBusinessMetricDrop ? drop > 5% vs 1h baseline.

## Notes
- Replace metric names above with the exact names emitted by your mobile SDK and backend exporters if they differ.
- Ensure mobile SDKs (Sentry/Crashlytics) are configured to export counts to your metrics pipeline or that you instrument a bridge to convert events into Prometheus metrics.
MD
)

# Only write if file missing or contains placeholder header
write_if_placeholder "$KPIS_DOC" "Telemetry KPIs and Metric Definitions" "$KPIS_CONTENT"

# -------------------------
# 4) VS Code task to open Grafana JSON
# -------------------------
VSCODE_TASKS_CONTENT=$(cat <<JSON
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Open Grafana Dashboard",
      "type": "shell",
      "command": "code -r monitoring/grafana_dashboard_tfxhub.json || true",
      "presentation": { "reveal": "always" }
    }
  ]
}
JSON
)

write_if_placeholder "$VSCODE_TASKS" "Open Grafana Dashboard" "$VSCODE_TASKS_CONTENT"

# -------------------------
# 5) Record artifact and finish
# -------------------------
ART_FILE="$ARTIFACTS_DIR/monitoring_populate_$TS.txt"
cat > "$ART_FILE" <<EOF
Monitoring populate run: $TS
Wrote or validated:
 - $PROM_FILE
 - $GRAFANA_FILE
 - $KPIS_DOC
 - $VSCODE_TASKS
EOF

echo "Monitoring placeholders populated. Artifacts: $ART_FILE"
echo
echo "Next recommended actions:"
echo "1) Replace metric names if your exporters use different names."
echo "2) Load the Grafana JSON into your Grafana instance and wire Prometheus as the data source."
echo "3) Ensure mobile SDKs or backend exporters emit the metrics listed above (or add bridging)."
echo "4) After metrics are available, prompt 'Whats next' to generate the alert receiver configuration and an end-to-end alert test script."
