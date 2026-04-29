#!/usr/bin/env bash
set -euo pipefail
# scripts/canary_flag_adapter.sh
# Provider-agnostic adapter for canary rollout percentage updates.
#
# Required env:
#   CANARY_PROVIDER=launchdarkly|unleash
# Optional env:
#   LD_API_TOKEN, LD_PROJECT_KEY, LD_ENV_KEY, LD_FLAG_KEY
#   UNLEASH_URL, UNLEASH_API_TOKEN, UNLEASH_PROJECT, UNLEASH_FLAG
#
# Usage:
#   CANARY_PROVIDER=launchdarkly ./scripts/canary_flag_adapter.sh set ams_canary_release 5
#   CANARY_PROVIDER=unleash ./scripts/canary_flag_adapter.sh set ams_canary_release 25

ACTION="${1:-status}"     # set|status
FLAG_KEY="${2:-ams_canary_release}"
PERCENT="${3:-1}"
PROVIDER="${CANARY_PROVIDER:-launchdarkly}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: missing required command '$1'"
    exit 2
  }
}

run_launchdarkly() {
  require_cmd curl
  local token="${LD_API_TOKEN:-}"
  local project="${LD_PROJECT_KEY:-default}"
  local env="${LD_ENV_KEY:-production}"
  local flag="${LD_FLAG_KEY:-$FLAG_KEY}"

  if [ -z "$token" ]; then
    echo "ERROR: LD_API_TOKEN not set"
    exit 2
  fi

  if [ "$ACTION" = "set" ]; then
    echo "LaunchDarkly: setting '$flag' rollout to ${PERCENT}% in ${project}/${env}"
    # Placeholder patch format. Tune JSON patch for your LD flag model.
    curl -fsS -X PATCH \
      -H "Authorization: $token" \
      -H "Content-Type: application/json" \
      -H "LD-API-Version: beta" \
      -d "[{\"op\":\"replace\",\"path\":\"/environments/${env}/fallthrough/rollout/variations/0/weight\",\"value\":$((PERCENT * 1000))}]" \
      "https://app.launchdarkly.com/api/v2/flags/${project}/${flag}" >/dev/null
    echo "LaunchDarkly update request sent"
  else
    curl -fsS \
      -H "Authorization: $token" \
      "https://app.launchdarkly.com/api/v2/flags/${project}/${flag}" | head -c 400
    echo
  fi
}

run_unleash() {
  require_cmd curl
  local url="${UNLEASH_URL:-}"
  local token="${UNLEASH_API_TOKEN:-}"
  local project="${UNLEASH_PROJECT:-default}"
  local flag="${UNLEASH_FLAG:-$FLAG_KEY}"

  if [ -z "$url" ] || [ -z "$token" ]; then
    echo "ERROR: UNLEASH_URL and UNLEASH_API_TOKEN must be set"
    exit 2
  fi

  if [ "$ACTION" = "set" ]; then
    echo "Unleash: setting '$flag' rollout to ${PERCENT}% in project ${project}"
    curl -fsS -X PUT \
      -H "Authorization: $token" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"gradualRolloutUserId\",\"parameters\":{\"groupId\":\"$flag\",\"rollout\":\"$PERCENT\"}}" \
      "${url}/api/admin/projects/${project}/features/${flag}/environments/production/strategies" >/dev/null || true
    echo "Unleash update request sent"
  else
    curl -fsS \
      -H "Authorization: $token" \
      "${url}/api/admin/projects/${project}/features/${flag}" | head -c 400
    echo
  fi
}

case "$PROVIDER" in
  launchdarkly)
    run_launchdarkly
    ;;
  unleash)
    run_unleash
    ;;
  *)
    echo "ERROR: unsupported CANARY_PROVIDER='$PROVIDER'"
    exit 2
    ;;
esac
