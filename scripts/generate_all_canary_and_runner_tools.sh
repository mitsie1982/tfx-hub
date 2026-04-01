#!/usr/bin/env bash
set -euo pipefail

# scripts/generate_all_canary_and_runner_tools.sh
# Idempotent generator that creates:
#  - scripts/canary_launchdarkly.sh
#  - scripts/run_staged_rollout_test.sh
#  - scripts/dry_run_release.sh
#  - scripts/generate_windows_runner_playbook.sh (creates docs/)
#
# Usage:
#   chmod +x scripts/generate_all_canary_and_runner_tools.sh
#   ./scripts/generate_all_canary_and_runner_tools.sh

ROOT="$(pwd)"
SCRIPTS_DIR="$ROOT/scripts"
DOCS_DIR="$ROOT/docs"
ARTIFACTS_DIR="$ROOT/artifacts"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$SCRIPTS_DIR" "$DOCS_DIR" "$ARTIFACTS_DIR"

echo "Generator run: $TS"
echo "Writing helper scripts and docs..."

# -------------------------
# 1) LaunchDarkly canary helper
# -------------------------
LD_HELPER="$SCRIPTS_DIR/canary_launchdarkly.sh"
cat > "$LD_HELPER" <<'SH'
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
SH
chmod +x "$LD_HELPER"
echo "WROTE: $LD_HELPER"

# -------------------------
# 2) Staged rollout harness
# -------------------------
STAGED="$SCRIPTS_DIR/run_staged_rollout_test.sh"
cat > "$STAGED" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
# scripts/run_staged_rollout_test.sh
# Promote cohorts and validate metrics via Prometheus; rollback on threshold breach.
# Usage:
#   PROMETHEUS_URL="http://prometheus:9090" LAUNCHDARKLY_API_TOKEN="..." ./scripts/run_staged_rollout_test.sh staging ams_canary_release
ENV="${1:-staging}"
FLAG="${2:-ams_canary_release}"
PROM_URL="${PROMETHEUS_URL:-http://localhost:9090}"
LD_HELPER="$(dirname "$0")/canary_launchdarkly.sh"
WINDOW_MINUTES="${WINDOW_MINUTES:-5}"
CRASH_RATE_THRESHOLD="${CRASH_RATE_THRESHOLD:-0.005}"  # 0.5%
API_5XX_THRESHOLD="${API_5XX_THRESHOLD:-0.01}"        # 1%

if [ ! -x "$LD_HELPER" ]; then
  echo "Missing LaunchDarkly helper: $LD_HELPER"
  exit 2
fi

urlencode() { python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$1"; }

prom_query() {
  local q="$1"
  local enc
  enc=$(urlencode "$q")
  curl -s --fail "$PROM_URL/api/v1/query?query=$enc" | jq -r '.data.result[0].value[1] // "0"' || echo "0"
}

prom_check_crash_rate() {
  prom_query 'increase(mobile_crashes_total[10m]) / max(1, increase(mobile_active_users_total[10m]))'
}

prom_check_5xx_rate() {
  prom_query 'increase(api_responses_total{status=~"5.."}[5m]) / max(1, increase(api_responses_total[5m]))'
}

prom_wait_and_eval() {
  echo "Waiting ${WINDOW_MINUTES} minutes for metrics to stabilize..."
  sleep $((WINDOW_MINUTES * 60))
  local crash_rate api_5xx
  crash_rate=$(prom_check_crash_rate)
  api_5xx=$(prom_check_5xx_rate)
  echo "Observed crash_rate=${crash_rate} api_5xx=${api_5xx}"
  awk -v cr="$crash_rate" -v thr="$CRASH_RATE_THRESHOLD" 'BEGIN{ if (cr+0 > thr+0) exit 1; exit 0 }'
  local cr_ok=$?
  awk -v a5="$api_5xx" -v thr="$API_5XX_THRESHOLD" 'BEGIN{ if (a5+0 > thr+0) exit 1; exit 0 }'
  local api_ok=$?
  if [ $cr_ok -ne 0 ] || [ $api_ok -ne 0 ]; then
    return 1
  fi
  return 0
}

COHORTS=(1 5 25)
for pct in "${COHORTS[@]}"; do
  echo "Promoting to ${pct}%"
  LAUNCHDARKLY_API_TOKEN="${LAUNCHDARKLY_API_TOKEN:-}" "$LD_HELPER" promote "$ENV" "$FLAG" "$pct" || { echo "Promote failed"; exit 3; }
  if prom_wait_and_eval; then
    echo "Cohort ${pct}% passed checks; continuing."
  else
    echo "Cohort ${pct}% failed checks; rolling back."
    LAUNCHDARKLY_API_TOKEN="${LAUNCHDARKLY_API_TOKEN:-}" "$LD_HELPER" rollback "$ENV" "$FLAG" || true
    exit 4
  fi
done

echo "Staged rollout test completed successfully."
exit 0
SH
chmod +x "$STAGED"
echo "WROTE: $STAGED"

# -------------------------
# 3) Dry-run release pipeline
# -------------------------
DRY_RUN="$SCRIPTS_DIR/dry_run_release.sh"
cat > "$DRY_RUN" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
# scripts/dry_run_release.sh
# Dry-run release: build (simulated) -> stage artifacts -> optional device farm -> canary -> monitor -> rollback
# Usage:
#   LAUNCHDARKLY_API_TOKEN="..." PROMETHEUS_URL="http://prometheus:9090" ./scripts/dry_run_release.sh ams staging
APP="${1:-ams}"
ENV="${2:-staging}"
PROM_URL="${PROMETHEUS_URL:-http://localhost:9090}"
DEVICE_FARM="${DEVICE_FARM:-none}"  # 'firebase' or 'appcenter' or 'none'
LD_HELPER="$(dirname "$0")/canary_launchdarkly.sh"
STAGING_DIR="$(pwd)/artifacts/staging/${APP}"
mkdir -p "$STAGING_DIR"

echo "Dry-run release for $APP -> $ENV"

# Simulate builds
echo "Simulating Android APK"
echo "dummy-apk-content" > "$STAGING_DIR/${APP}-staging.apk"
echo "Simulating iOS IPA"
echo "dummy-ipa-content" > "$STAGING_DIR/${APP}-staging.ipa"
echo "Artifacts staged at $STAGING_DIR"

# Device farm placeholder
if [ "$DEVICE_FARM" = "firebase" ]; then
  echo "Device farm: Firebase (placeholder) - run scripts/upload_to_firebase_test_lab.sh manually"
elif [ "$DEVICE_FARM" = "appcenter" ]; then
  echo "Device farm: App Center (placeholder) - run scripts/upload_to_appcenter.sh manually"
else
  echo "Device farm not configured; skipping"
fi

# Trigger canary 1%
echo "Triggering canary 1%"
LAUNCHDARKLY_API_TOKEN="${LAUNCHDARKLY_API_TOKEN:-}" "$LD_HELPER" promote "$ENV" "${APP}_canary_release" 1 || true

# Run staged rollout harness with shorter window override
WINDOW_MINUTES="${WINDOW_MINUTES:-1}" CRASH_RATE_THRESHOLD="${CRASH_RATE_THRESHOLD:-0.01}" PROMETHEUS_URL="$PROM_URL" LAUNCHDARKLY_API_TOKEN="${LAUNCHDARKLY_API_TOKEN:-}" "$(dirname "$0")/run_staged_rollout_test.sh" "$ENV" "${APP}_canary_release" || {
  echo "Staged rollout test failed; rolling back and aborting dry-run"
  LAUNCHDARKLY_API_TOKEN="${LAUNCHDARKLY_API_TOKEN:-}" "$LD_HELPER" rollback "$ENV" "${APP}_canary_release" || true
  exit 5
}

echo "Dry-run release completed successfully for $APP. Artifacts in $STAGING_DIR"
exit 0
SH
chmod +x "$DRY_RUN"
echo "WROTE: $DRY_RUN"

# -------------------------
# 4) Windows runner playbook + laptop demo generator
# -------------------------
GEN_WIN="$SCRIPTS_DIR/generate_windows_runner_playbook.sh"
cat > "$GEN_WIN" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
# scripts/generate_windows_runner_playbook.sh
# Generates docs/windows_runner_playbook.md and docs/laptop_demo_windows.md
ROOT="$(pwd)"
DOCS_DIR="$ROOT/docs"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DOCS_DIR"

PLAYBOOK="$DOCS_DIR/windows_runner_playbook.md"
cat > "$PLAYBOOK" <<MD
# Self‑Hosted Windows Runner Playbook

Generated: $TS

## Overview
Provision, secure, and operate a self-hosted Windows runner for CI jobs requiring Visual Studio, MSIX packaging, or Windows-only tooling.

## Prerequisites
- Windows Server 2019/2022 or Windows 10/11 Pro
- Visual Studio 2022 with "Desktop development with C++"
- Windows 10/11 SDK
- Node 18+, pnpm, Python 3, Git
- Service account for runner service

## Provisioning
1. Create VM or machine and install prerequisites.
2. Create folder C:\actions-runner and download GitHub Actions runner.
3. Register runner from GitHub repo Settings > Actions > Runners using a registration token.
4. Configure runner as a Windows service.
5. Harden machine: firewall, updates, disk encryption, limited accounts.

## Maintenance
- Apply updates during maintenance windows.
- Monitor disk, CPU, memory; set alerts.
- Rotate registration tokens and service account credentials.

## CI usage
- Use \`runs-on: self-hosted, windows\` in workflows.
- Restrict which repos can use the runner via repo settings.

MD

DEMO="$DOCS_DIR/laptop_demo_windows.md"
cat > "$DEMO" <<MD
# Laptop Demo for RNW Sample

Generated: $TS

## Goal
Run a minimal React Native Windows sample on a developer laptop.

## Prerequisites
- Windows 10/11 Pro
- Visual Studio 2022 with "Desktop development with C++"
- Node 18+, pnpm, npx, React Native CLI
- Windows SDK

## Steps
1. Open PowerShell as Administrator.
2. Clone repo and navigate to spike folder:
   cd spikes/windows/rnw-sample/rnwSpike
3. Install dependencies:
   pnpm install
4. Initialize RNW if needed:
   npx react-native-windows-init --overwrite --language cpp
5. Start Metro:
   npx react-native start
6. In another terminal:
   npx react-native run-windows

## Troubleshooting
- If build fails, open the solution in Visual Studio and build to see errors.
- Ensure required workloads and SDKs are installed.

MD

echo "WROTE: $PLAYBOOK and $DEMO"
SH
chmod +x "$GEN_WIN"
echo "WROTE: $GEN_WIN (run to regenerate docs)"

# -------------------------
# 5) Summary artifact
# -------------------------
SUMMARY="$ARTIFACTS_DIR/generator_summary_$TS.txt"
cat > "$SUMMARY" <<EOF
Generator run: $TS
Created:
 - $LD_HELPER
 - $STAGED
 - $DRY_RUN
 - $GEN_WIN
Docs will be generated by running: $GEN_WIN
EOF

echo "WROTE: $SUMMARY"

# -------------------------
# 6) Git commit if inside repo
# -------------------------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add "$SCRIPTS_DIR" "$DOCS_DIR" "$ARTIFACTS_DIR" || true
  git commit -m "chore(canary): add LaunchDarkly helper, staged rollout harness, dry-run release and Windows runner playbook ($TS)" || true
  echo "Committed changes to git (if any)."
fi

echo "Generator finished. Next steps:"
echo " - Review scripts in scripts/ and adapt payloads and endpoints to your LaunchDarkly and Prometheus setup."
echo " - Run scripts/generate_windows_runner_playbook.sh to create docs."
echo " - Add LAUNCHDARKLY_API_TOKEN and PROMETHEUS_URL in CI secrets before running staged/dry-run scripts."
