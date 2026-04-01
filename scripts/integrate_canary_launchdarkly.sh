#!/usr/bin/env bash
set -euo pipefail

# scripts/integrate_canary_launchdarkly.sh
# Adds a LaunchDarkly-backed canary_rollout helper and example usage.
# Requires: LAUNCHDARKLY_API_TOKEN in environment for manual runs (CI should use secrets).
ROOT="$(pwd)"
SCRIPTS_DIR="$ROOT/scripts"
LD_HELPER="$SCRIPTS_DIR/canary_launchdarkly.sh"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$SCRIPTS_DIR"

cat > "$LD_HELPER" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
# scripts/canary_launchdarkly.sh
# Usage:
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

BASE_URL="https://app.launchdarkly.com/api/v2"
AUTH_HEADER="Authorization: Bearer $API_TOKEN"
CONTENT_TYPE="Content-Type: application/json"

# Helper: get environment ID
get_env_id() {
  local proj_key="${1:-default}"
  # This script assumes you know envKey; skip lookup for simplicity
  echo "$ENV_KEY"
}

if [ "$ACTION" = "promote" ]; then
  echo "Promoting flag $FLAG_KEY in env $ENV_KEY to ${PCT}%"
  # Create a patch to set percentage rollout for all users
  read -r -d '' PAYLOAD <<JSON
{
  "patch": [
    {
      "op": "replace",
      "path": "/environments/$ENV_KEY/targets",
      "value": []
    },
    {
      "op": "replace",
      "path": "/environments/$ENV_KEY/rolloutRules",
      "value": []
    },
    {
      "op": "replace",
      "path": "/environments/$ENV_KEY/variations",
      "value": []
    }
  ]
}
JSON
  # Simpler approach: use the flag patch endpoint to set a percentage rollout via defaultRollout
  read -r -d '' PD <<JSON
{
  "patch": [
    {
      "op": "replace",
      "path": "/environments/$ENV_KEY/rollout",
      "value": {
        "kind": "experiment",
        "variations": [
          { "variation": 0, "weight": $((100 - PCT * 1)) },
          { "variation": 1, "weight": $((PCT * 1)) }
        ]
      }
    }
  ]
}
JSON

  # Note: LaunchDarkly API shapes vary by account. Use the generic flags endpoint as a fallback:
  RESP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
    -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
    -d "$PD" "$BASE_URL/flags/default/$FLAG_KEY")
  echo "LaunchDarkly API returned HTTP $RESP"
  if [ "$RESP" -ge 200 ] && [ "$RESP" -lt 300 ]; then
    echo "Promote request accepted. Verify in LaunchDarkly console."
    exit 0
  else
    echo "Promote request failed. Check API token and flag/env keys."
    exit 3
  fi

elif [ "$ACTION" = "rollback" ]; then
  echo "Rolling back flag $FLAG_KEY in env $ENV_KEY to 0%"
  # Set rollout to 0% (all users see variation 0)
  read -r -d '' PD2 <<JSON
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
  RESP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
    -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
    -d "$PD2" "$BASE_URL/flags/default/$FLAG_KEY")
  echo "LaunchDarkly API returned HTTP $RESP"
  if [ "$RESP" -ge 200 ] && [ "$RESP" -lt 300 ]; then
    echo "Rollback request accepted."
    exit 0
  else
    echo "Rollback request failed."
    exit 3
  fi

else
  echo "Status action: fetch flag details for $FLAG_KEY in $ENV_KEY"
  curl -s -H "$AUTH_HEADER" "$BASE_URL/flags/default/$FLAG_KEY" | jq '.environments["'"$ENV_KEY"'"]'
fi
SH

chmod +x "$LD_HELPER"
echo "Created LaunchDarkly canary helper: $LD_HELPER"
echo "Note: This script uses LaunchDarkly API v2 patch semantics; adapt payloads to your account schema."
echo "Integration script created at $LD_HELPER"
