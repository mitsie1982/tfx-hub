#!/usr/bin/env bash
set -euo pipefail
# scripts/upload_to_appcenter.sh
# Usage: ./scripts/upload_to_appcenter.sh <app-path> <owner-name> <app-name>
APP_PATH="$1"
OWNER="${2:-your-org}"
APP_NAME="${3:-your-app}"
API_TOKEN="${APPCENTER_API_TOKEN:-}"
if [ -z "$API_TOKEN" ]; then
  echo "APPCENTER_API_TOKEN not set; aborting"
  exit 1
fi
echo "Uploading $APP_PATH to App Center $OWNER/$APP_NAME (placeholder)"
# appcenter distribute release --file "$APP_PATH" --app "$OWNER/$APP_NAME" --token "$API_TOKEN"
echo "Placeholder complete. Replace with appcenter CLI invocation."
