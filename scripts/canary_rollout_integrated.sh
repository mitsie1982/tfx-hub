#!/usr/bin/env bash
set -euo pipefail
# scripts/canary_rollout_integrated.sh
# Wrapper around canary rollout actions using provider adapter.
#
# Usage:
#   ./scripts/canary_rollout_integrated.sh ams 1 promote
#   ./scripts/canary_rollout_integrated.sh ams 1 rollback
#   ./scripts/canary_rollout_integrated.sh ams 25 status

APP="${1:-ams}"
COHORT="${2:-1}"
ACTION="${3:-status}"
FLAG_KEY="${APP}_canary_release"

echo "Integrated canary rollout: app=$APP cohort=${COHORT}% action=$ACTION"

case "$ACTION" in
  promote)
    ./scripts/canary_flag_adapter.sh set "$FLAG_KEY" "$COHORT"
    echo "Promote completed for $APP to ${COHORT}%"
    ;;
  rollback)
    ./scripts/canary_flag_adapter.sh set "$FLAG_KEY" 0
    echo "Rollback completed for $APP to 0%"
    ;;
  status)
    ./scripts/canary_flag_adapter.sh status "$FLAG_KEY" "$COHORT"
    ;;
  *)
    echo "ERROR: action must be promote|rollback|status"
    exit 2
    ;;
esac
