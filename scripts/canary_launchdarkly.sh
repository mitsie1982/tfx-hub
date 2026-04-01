#!/usr/bin/env bash
set -euo pipefail
# scripts/canary_launchdarkly.sh
# Simple LaunchDarkly canary helper (PATCH semantics may vary by account).
# Usage:
#   LAUNCHDARKLY_API_TOKEN="..." ./scripts/canary_launchdarkly.sh status <envKey> <flagKey>
#   LAUNCHDARKLY_API_TOKEN="..." ./scripts/canary_launchdarkly.sh promote <envKey> <flagKey> <percent>
#   LAUNCHDARKLY_API_TOKEN="..." ./scripts/canary_launchdarkly.sh rollback <envKey> <flagKey>
ACTION="${1:-status}"
ENV_KEY="${2:-staging}"
FLAG_KEY="${3:-ams_canary_release}"
PCT="${4:-1}"
API_TOKEN="${LAUNCHDARKLY_API_TOKEN:-}"

if [ -z "$API_TOKEN" ]; then
  echo "ERROR: LAUNCHDARKLY_API_TOKEN not set. Export it and re-run."
  exit 2
fi

AUTH_HEADER="Authorization: Bearer $API_TOKEN"
CONTENT_TYPE="Content-Type: application/json"
BASE="https://app.launchdarkly.com/api/v2"

# Note: LaunchDarkly API payloads and endpoints vary by account and project.
# This script provides a starting point; adapt payloads to your account schema.

if [ "$ACTION" = "promote" ]; then
  echo "Promoting flag $FLAG_KEY in env $ENV_KEY to ${PCT}% (best-effort)"
  # Example: set a simple percentage rollout via flags endpoint (may require project key)
  PATCH_PAYLOAD=$(cat <<JSON
{
  "patch": [
    {
      "op": "replace",
      "path": "/environments/$ENV_KEY/rollout",
      "value": {
        "kind": "experiment",
        "variations": [
          { "variation": 0, "weight": $((100 - PCT)) },
          { "variation": 1, "weight": $((PCT)) }
        ]
      }
    }
  ]
}
JSON
)
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "$AUTH_HEADER" -H "$CONTENT_TYPE" -d "$PATCH_PAYLOAD" "$BASE/flags/default/$FLAG_KEY" || true)
  echo "LaunchDarkly API returned HTTP $HTTP"
  if [ "$HTTP" -ge 200 ] && [ "$HTTP" -lt 300 ]; then
    echo "Promote request accepted. Verify in LaunchDarkly console."
    exit 0
  else
    echo "Promote request failed. Check API token, flag and env keys."
    exit 3
  fi

elif [ "$ACTION" = "rollback" ]; then
  echo "Rolling back flag $FLAG_KEY in env $ENV_KEY to 0%"
  ROLLBACK_PAYLOAD=$(cat <<JSON
{
  "patch": [
    {
      "op": "replace",
      "path": "/environments/$ENV_KEY/rollout",
      "value": {
        "kind": "experiment",
        "variations": [
          { "variation": 0, "weight": 100 },
          { "variation": 1, "weight": 0 }
        ]
      }
    }
  ]
}
JSON
)
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "$AUTH_HEADER" -H "$CONTENT_TYPE" -d "$ROLLBACK_PAYLOAD" "$BASE/flags/default/$FLAG_KEY" || true)
  echo "LaunchDarkly API returned HTTP $HTTP"
  if [ "$HTTP" -ge 200 ] && [ "$HTTP" -lt 300 ]; then
    echo "Rollback request accepted."
    exit 0
  else
    echo "Rollback request failed."
    exit 3
  fi

else
  echo "Status: fetching flag details for $FLAG_KEY in $ENV_KEY (best-effort)"
  curl -s -H "$AUTH_HEADER" "$BASE/flags/default/$FLAG_KEY" | jq '.environments["'"$ENV_KEY"'"]' || true
fi
