#!/usr/bin/env bash
set -euo pipefail
# scripts/build-ios.sh
# Usage: ./scripts/build-ios.sh <app>
# Expects environment variables:
#  MATCH_PASSWORD
#  FASTLANE_USER
#  FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD
APP="${1:-ams}"
echo "Building iOS for app=$APP"

echo "This script is a placeholder. Use Fastlane match and build_app in CI."
echo "Example: fastlane ios release"
