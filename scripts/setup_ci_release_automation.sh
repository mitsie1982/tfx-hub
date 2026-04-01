#!/usr/bin/env bash
set -euo pipefail

# scripts/setup_ci_release_automation.sh
# Purpose:
#  - Scaffold Fastlane placeholders for Android and iOS for both apps
#  - Add Windows packaging script placeholder
#  - Create GitHub Actions release workflows for AMS and Contractor
#  - Add signing helper scripts that read secrets from env vars
#  - Create docs/release-readme.md describing secrets and CI variables
#  - Add VS Code tasks for release steps
#
# Usage:
#   chmod +x scripts/setup_ci_release_automation.sh
#   ./scripts/setup_ci_release_automation.sh
#
# Notes:
#  - This script does NOT store secrets in the repo.
#  - Replace placeholders with your real Fastlane lanes and store credentials.
#  - Run in repo root. Safe to re-run.

ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

FASTLANE_DIR="$ROOT/fastlane"
FASTLANE_AMS="$FASTLANE_DIR/ams-app"
FASTLANE_CONTRACTOR="$FASTLANE_DIR/contractor-app"
SCRIPTS_DIR="$ROOT/scripts"
CI_DIR="$ROOT/.github/workflows"
DOCS_DIR="$ROOT/docs"
VSCODE_DIR="$ROOT/.vscode"

mkdir -p "$FASTLANE_AMS" "$FASTLANE_CONTRACTOR" "$SCRIPTS_DIR" "$CI_DIR" "$DOCS_DIR" "$VSCODE_DIR"

echo "Scaffolding CI release automation and signing scripts ($TS)"

# -------------------------
# 1) Fastlane placeholders
# -------------------------
create_fastlane() {
  TARGET_DIR="$1"
  APP_ID="$2"
  if [ ! -f "$TARGET_DIR/Fastfile" ]; then
    cat > "$TARGET_DIR/Fastfile" <<FASTFILE
# Fastlane Fastfile placeholder for $APP_ID
default_platform(:ios)

platform :ios do
  desc "Build and upload iOS app for $APP_ID"
  lane :release do
    # Replace with your provisioning and signing setup
    # match(type: "appstore", app_identifier: "$APP_ID")
    # build_app(scheme: "$APP_ID")
    # upload_to_app_store
    sh "echo 'iOS release lane placeholder for $APP_ID'"
  end
end

platform :android do
  desc "Build and upload Android app for $APP_ID"
  lane :release do
    # Replace with your keystore and play store setup
    # gradle(task: 'assembleRelease')
    # supply(track: 'production', apk: 'app/build/outputs/apk/release/app-release.apk')
    sh "echo 'Android release lane placeholder for $APP_ID'"
  end
end
FASTFILE
    echo "Created Fastfile for $APP_ID at $TARGET_DIR/Fastfile"
  else
    echo "Fastfile exists at $TARGET_DIR (skipped)"
  fi

  if [ ! -f "$TARGET_DIR/Appfile" ]; then
    cat > "$TARGET_DIR/Appfile" <<APPFILE
# Appfile placeholder for $APP_ID
app_identifier("$APP_ID")
apple_id("your-apple-id@example.com")
APPFILE
    echo "Created Appfile for $APP_ID at $TARGET_DIR/Appfile"
  fi
}

create_fastlane "$FASTLANE_AMS" "com.tfxhub.ams"
create_fastlane "$FASTLANE_CONTRACTOR" "com.tfxhub.contractor"

# -------------------------
# 2) Signing helper scripts
# -------------------------
# Android signing wrapper
ANDROID_SIGN_SCRIPT="$SCRIPTS_DIR/build-android.sh"
cat > "$ANDROID_SIGN_SCRIPT" <<'SH'
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
SH
chmod +x "$ANDROID_SIGN_SCRIPT"
echo "Created Android build script: $ANDROID_SIGN_SCRIPT"

# iOS signing wrapper
IOS_SIGN_SCRIPT="$SCRIPTS_DIR/build-ios.sh"
cat > "$IOS_SIGN_SCRIPT" <<'SH'
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
SH
chmod +x "$IOS_SIGN_SCRIPT"
echo "Created iOS build script: $IOS_SIGN_SCRIPT"

# Windows packaging wrapper (PowerShell)
WINDOWS_SCRIPT="$SCRIPTS_DIR/build-windows.ps1"
cat > "$WINDOWS_SCRIPT" <<'PS1'
# scripts/build-windows.ps1
# Usage: .\scripts\build-windows.ps1 -App ams
param(
  [string]$App = "ams"
)
Write-Host "Windows packaging placeholder for app=$App"
Write-Host "Ensure Visual Studio and MSIX packaging tools are available on the runner"
# Placeholder: build solution and create MSIX
# msbuild /t:Restore,Build path\to\solution.sln /p:Configuration=Release
# Use MakeAppx or MSIX Packaging Tool for packaging
PS1
chmod +x "$WINDOWS_SCRIPT"
echo "Created Windows packaging script: $WINDOWS_SCRIPT"

# -------------------------
# 3) GitHub Actions release workflows
# -------------------------
create_release_workflow() {
  NAME="$1"
  APP="$2"
  FILE="$CI_DIR/release-$APP.yml"
  cat > "$FILE" <<YAML
name: Release $NAME

on:
  workflow_dispatch:
  push:
    tags:
      - 'release/*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install pnpm
        run: npm install -g pnpm
      - name: Install dependencies
        run: pnpm install
      - name: Build Android artifact
        run: |
          ./scripts/build-android.sh $APP release
      - name: Build iOS artifact (placeholder)
        run: |
          ./scripts/build-ios.sh $APP
      - name: Build Windows artifact (placeholder)
        run: |
          pwsh ./scripts/build-windows.ps1 -App $APP
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${APP}-artifacts
          path: |
            apps/${APP}-app/android/app/build/outputs/**/*.apk
            apps/${APP}-app/ios/build/**/*.ipa
            spikes/windows/${APP}-msix/**/*.msix
YAML
  echo "Created release workflow: $FILE"
}

create_release_workflow "TFX Hub AMS" "ams"
create_release_workflow "TFX Hub Contractor" "contractor"

# -------------------------
# 4) Docs for secrets and CI variables
# -------------------------
RELEASE_DOC="$DOCS_DIR/release-readme.md"
cat > "$RELEASE_DOC" <<MD
# Release Automation and Secrets

This document explains the CI release automation placeholders and required secrets.

## Required CI secrets (GitHub Actions repository secrets)
- ANDROID_KEYSTORE_BASE64  (base64-encoded keystore file)
- ANDROID_KEYSTORE_PASSWORD
- ANDROID_KEY_ALIAS
- ANDROID_KEY_PASSWORD
- FASTLANE_USER
- MATCH_PASSWORD
- FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD
- MSIX_SIGNING_CERT_BASE64 (optional for Windows packaging)
- MSIX_SIGNING_CERT_PASSWORD

## How to create ANDROID_KEYSTORE_BASE64
1. Encode your keystore:
   base64 my-release-key.jks | pbcopy
2. Add the base64 string to GitHub Secrets as ANDROID_KEYSTORE_BASE64.

## iOS signing
- Use Fastlane match or App Store Connect API to manage provisioning profiles and certificates.
- Store credentials in GitHub Secrets and configure Fastlane lanes to use them.

## Windows signing
- Use a code signing certificate and store it as MSIX_SIGNING_CERT_BASE64.
- Use a self-hosted Windows runner with Visual Studio for MSIX packaging if required.

## Notes
- Never commit keystore files or certificates to the repository.
- Replace placeholder Fastlane lanes with your real build and upload steps.
MD
echo "Wrote release docs: $RELEASE_DOC"

# -------------------------
# 5) VS Code tasks for release
# -------------------------
TASKS_FILE="$VSCODE_DIR/tasks.release.json"
cat > "$TASKS_FILE" <<JSON
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Release: Build AMS Artifacts (local placeholder)",
      "type": "shell",
      "command": "./scripts/build-android.sh ams release",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Release: Build Contractor Artifacts (local placeholder)",
      "type": "shell",
      "command": "./scripts/build-android.sh contractor release",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Open Release Docs",
      "type": "shell",
      "command": "code -r docs/release-readme.md || true",
      "presentation": { "reveal": "always" }
    }
  ]
}
JSON
echo "Created VS Code tasks at $TASKS_FILE"

# -------------------------
# 6) Add branch protection checklist note (append)
# -------------------------
BP_NOTE="$DOCS_DIR/branch_protection_checklist.md"
if [ -f "$BP_NOTE" ]; then
  if ! grep -q "Release workflows" "$BP_NOTE" 2>/dev/null; then
    cat >> "$BP_NOTE" <<MD

## Release Workflows
- Add release-ams and release-contractor workflows as required checks for release branches or tags if desired.
- Ensure secrets are configured in repository settings before enabling release workflows.
MD
  fi
fi

# -------------------------
# 7) Commit created artifacts if inside git repo
# -------------------------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add "$FASTLANE_DIR" "$SCRIPTS_DIR" "$CI_DIR" "$DOCS_DIR" "$VSCODE_DIR" || true
  git commit -m "chore(ci): scaffold release automation, fastlane placeholders, signing scripts and docs ($TS)" || true
fi

echo ""
echo "CI release automation scaffold complete."
echo " - Fastlane placeholders: $FASTLANE_AMS and $FASTLANE_CONTRACTOR"
echo " - Build scripts: $ANDROID_SIGN_SCRIPT, $IOS_SIGN_SCRIPT, $WINDOWS_SCRIPT"
echo " - Release workflows: $CI_DIR/release-ams.yml, $CI_DIR/release-contractor.yml"
echo " - Docs: $RELEASE_DOC"
echo " - VS Code tasks: $TASKS_FILE"
echo ""
echo "Next actions (manual):"
echo "1) Add signing secrets to GitHub repository secrets as documented in $RELEASE_DOC."
echo "2) Replace Fastfile placeholders with real lanes that call match, build_app, supply, and upload steps."
echo "3) Test release workflows on a non-production branch and with test store accounts."
echo "4) For Windows builds, provision a self-hosted Windows runner with Visual Studio if needed."
echo ""
echo "When ready, prompt 'Whats next' and I will render Step 8: E2E and device testing pipeline scaffold."
