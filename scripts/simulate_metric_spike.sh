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
