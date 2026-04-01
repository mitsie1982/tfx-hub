#!/usr/bin/env bash
set -euo pipefail
# scripts/build-android.sh
# Usage: ./scripts/build-android.sh <app> <flavor?>
# Expects environment variables:
#  ANDROID_KEYSTORE_BASE64  (base64-encoded keystore)
#  ANDROID_KEYSTORE_PASSWORD
#  ANDROID_KEY_ALIAS
#  ANDROID_KEY_PASSWORD
APP="${1:-ams}"
FLAVOR="${2:-release}"

echo "Building Android for app=$APP flavor=$FLAVOR"

# Decode keystore if provided
if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ]; then
  echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > /tmp/keystore.jks
  export ANDROID_KEYSTORE_PATH="/tmp/keystore.jks"
  echo "Keystore written to \$ANDROID_KEYSTORE_PATH"
else
  echo "No ANDROID_KEYSTORE_BASE64 provided; ensure signing is configured in CI"
fi

# Placeholder build commands; replace with your Gradle invocation
echo "Running Gradle assemble (placeholder)"
# cd apps/${APP}-app/android && ./gradlew assemble${FLAVOR^} -Pandroid.injected.signing.store.file=\$ANDROID_KEYSTORE_PATH -Pandroid.injected.signing.store.password=\$ANDROID_KEYSTORE_PASSWORD -Pandroid.injected.signing.key.alias=\$ANDROID_KEY_ALIAS -Pandroid.injected.signing.key.password=\$ANDROID_KEY_PASSWORD

echo "Android build placeholder complete"
