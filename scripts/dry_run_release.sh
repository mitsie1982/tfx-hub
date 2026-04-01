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
