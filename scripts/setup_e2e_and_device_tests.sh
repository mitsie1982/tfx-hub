#!/usr/bin/env bash
set -euo pipefail

# scripts/setup_e2e_and_device_tests.sh
# Purpose:
#  - Scaffold Detox and Appium E2E examples
#  - Add device farm upload scripts for Firebase Test Lab and App Center
#  - Add CI workflow to run smoke E2E tests
#  - Add VS Code tasks and runbook
#
# Usage:
#   chmod +x scripts/setup_e2e_and_device_tests.sh
#   ./scripts/setup_e2e_and_device_tests.sh

ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
E2E_DIR="$ROOT/e2e"
DETOX_DIR="$E2E_DIR/detox"
APPIUM_DIR="$E2E_DIR/appium"
CI_DIR="$ROOT/.github/workflows"
SCRIPTS_DIR="$ROOT/scripts"
VSCODE_DIR="$ROOT/.vscode"
DOCS_DIR="$ROOT/docs"
ARTIFACTS_DIR="$ROOT/artifacts"

mkdir -p "$DETOX_DIR" "$APPIUM_DIR" "$CI_DIR" "$SCRIPTS_DIR" "$VSCODE_DIR" "$DOCS_DIR" "$ARTIFACTS_DIR"

echo "Scaffolding E2E and device testing pipeline ($TS)"

# -------------------------
# 1) Detox scaffold for React Native
# -------------------------
mkdir -p "$DETOX_DIR/e2e"

if [ ! -f "$DETOX_DIR/package.json" ]; then
  cat > "$DETOX_DIR/package.json" <<JSON
{
  "name": "e2e-detox",
  "private": true,
  "scripts": {
    "build:ios": "detox build --configuration ios.sim.debug",
    "test:ios": "detox test --configuration ios.sim.debug",
    "build:android": "detox build --configuration android.emu.debug",
    "test:android": "detox test --configuration android.emu.debug"
  },
  "devDependencies": {
    "detox": "^23.0.0",
    "jest": "^29.0.0"
  }
}
JSON

  echo "Created $DETOX_DIR/package.json"
fi

if [ ! -f "$DETOX_DIR/.detoxrc.json" ]; then
  cat > "$DETOX_DIR/.detoxrc.json" <<JSON
{
  "testRunner": "jest",
  "configurations": {
    "ios.sim.debug": {
      "type": "ios.simulator",
      "binaryPath": "../../apps/ams-app/ios/build/Build/Products/Debug-iphonesimulator/ams-app.app",
      "build": "cd ../../apps/ams-app/ios && xcodebuild -workspace ams-app.xcworkspace -scheme ams-app -configuration Debug -sdk iphonesimulator -derivedDataPath build",
      "device": { "type": "iPhone 14" }
    },
    "android.emu.debug": {
      "type": "android.emulator",
      "binaryPath": "../../apps/ams-app/android/app/build/outputs/apk/debug/app-debug.apk",
      "build": "cd ../../apps/ams-app/android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug",
      "device": { "avdName": "Pixel_4_API_30" }
    }
  }
}
JSON

  echo "Created $DETOX_DIR/.detoxrc.json"
fi

if [ ! -f "$DETOX_DIR/e2e/first.e2e.js" ]; then
  cat > "$DETOX_DIR/e2e/first.e2e.js" <<'JS'
describe('Example', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('shows welcome screen', async () => {
    await expect(element(by.text('TFX Hub AMS (Example)'))).toBeVisible();
  });
});
JS

  echo "Created $DETOX_DIR/e2e/first.e2e.js"
fi

if [ ! -f "$DETOX_DIR/jest.config.js" ]; then
  cat > "$DETOX_DIR/jest.config.js" <<'JS'
module.exports = {
  testTimeout: 120000,
  testRunner: 'jest-circus/runner'
};
JS

  echo "Created $DETOX_DIR/jest.config.js"
fi

echo "Detox scaffold ready at $DETOX_DIR"

# -------------------------
# 2) Appium example scaffold
# -------------------------
if [ ! -f "$APPIUM_DIR/package.json" ]; then
  cat > "$APPIUM_DIR/package.json" <<JSON
{
  "name": "e2e-appium",
  "private": true,
  "scripts": {
    "test": "node run_appium_test.js"
  },
  "dependencies": {
    "appium": "^2.0.0",
    "webdriverio": "^8.0.0"
  }
}
JSON

  cat > "$APPIUM_DIR/run_appium_test.js" <<'JS'
/*
 e2e/appium/run_appium_test.js
 Simple Appium WebDriverIO test that connects to local Appium server.
*/
const { remote } = require('webdriverio');

async function run() {
  const opts = {
    path: '/wd/hub',
    port: 4723,
    capabilities: {
      platformName: 'Android',
      deviceName: 'emulator-5554',
      app: process.env.APP_APK || 'apps/ams-app/android/app/build/outputs/apk/debug/app-debug.apk',
      automationName: 'UiAutomator2'
    }
  };
  const client = await remote(opts);
  const activity = await client.getCurrentActivity();
  console.log('Current activity', activity);
  await client.deleteSession();
}

run().catch(e => { console.error(e); process.exit(1); });
JS

  echo "Created Appium scaffold at $APPIUM_DIR"
else
  echo "Appium scaffold exists (skipped)"
fi

# -------------------------
# 3) Device farm upload scripts
# -------------------------
FIREBASE_SCRIPT="$SCRIPTS_DIR/upload_to_firebase_test_lab.sh"
cat > "$FIREBASE_SCRIPT" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
# scripts/upload_to_firebase_test_lab.sh
# Usage: ./scripts/upload_to_firebase_test_lab.sh <apk-or-aab-path> <test-zip-or-robotium>
APK="$1"
TEST_TYPE="${2:-instrumentation}"
PROJECT_ID="${FIREBASE_PROJECT_ID:-your-firebase-project-id}"
echo "Uploading $APK to Firebase Test Lab for project $PROJECT_ID (placeholder)"
# gcloud firebase test android run --type $TEST_TYPE --app "$APK" --project "$PROJECT_ID"
echo "Placeholder complete. Replace with gcloud command and ensure gcloud auth is configured in CI."
SH
chmod +x "$FIREBASE_SCRIPT"
echo "Created Firebase Test Lab upload script: $FIREBASE_SCRIPT"

APPCENTER_SCRIPT="$SCRIPTS_DIR/upload_to_appcenter.sh"
cat > "$APPCENTER_SCRIPT" <<'SH'
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
SH
chmod +x "$APPCENTER_SCRIPT"
echo "Created App Center upload script: $APPCENTER_SCRIPT"

# -------------------------
# 4) CI workflow for E2E smoke tests
# -------------------------
CI_FILE="$CI_DIR/ci_e2e.yml"
cat > "$CI_FILE" <<YAML
name: CI E2E Smoke Tests

on:
  pull_request:
    paths:
      - 'apps/**'
      - 'packages/**'
      - 'e2e/**'

jobs:
  detox-android:
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
      - name: Build Android app for Detox
        run: |
          cd apps/ams-app && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug
      - name: Start emulator and run Detox
        run: |
          # Start emulator placeholder; requires Android SDK on runner or self-hosted runner
          echo "Start emulator and run Detox (placeholder)"
          cd e2e/detox && pnpm install && pnpm test:android

  appium-smoke:
    runs-on: ubuntu-latest
    needs: detox-android
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install pnpm
        run: npm install -g pnpm
      - name: Install dependencies
        run: pnpm install
      - name: Run Appium smoke test
        run: |
          cd e2e/appium && pnpm install && node run_appium_test.js
YAML
echo "Created CI workflow: $CI_FILE"

# -------------------------
# 5) VS Code tasks for E2E
# -------------------------
TASKS_FILE="$VSCODE_DIR/tasks.e2e.json"
cat > "$TASKS_FILE" <<JSON
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "E2E: Run Detox iOS",
      "type": "shell",
      "command": "cd e2e/detox && pnpm install && pnpm run build:ios && pnpm run test:ios",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "E2E: Run Detox Android",
      "type": "shell",
      "command": "cd e2e/detox && pnpm install && pnpm run build:android && pnpm run test:android",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "E2E: Run Appium smoke",
      "type": "shell",
      "command": "node e2e/appium/run_appium_test.js",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "E2E: Upload APK to Firebase Test Lab",
      "type": "shell",
      "command": "./scripts/upload_to_firebase_test_lab.sh apps/ams-app/android/app/build/outputs/apk/debug/app-debug.apk",
      "presentation": { "reveal": "always" }
    }
  ]
}
JSON
echo "Created VS Code tasks at $TASKS_FILE"

# -------------------------
# 6) E2E runbook
# -------------------------
RUNBOOK="$DOCS_DIR/e2e_runbook.md"
cat > "$RUNBOOK" <<MD
# E2E Runbook

## Prerequisites
- Android SDK and emulator images
- Xcode and iOS simulators for macOS
- Appium server for Appium tests
- Detox prerequisites documented at https://wix.github.io/Detox
- Firebase CLI and gcloud for Firebase Test Lab
- App Center CLI for App Center uploads

## Local workflow
1. Build app for test configuration:
   - Android: cd apps/ams-app && ./gradlew assembleDebug assembleAndroidTest
   - iOS: open Xcode and build test target or use xcodebuild
2. Run Detox:
   - cd e2e/detox && pnpm detox build --configuration android.emu.debug && pnpm detox test --configuration android.emu.debug
3. Run Appium:
   - Start Appium server: npx appium
   - node e2e/appium/run_appium_test.js

## CI notes
- CI runners often require self-hosted runners for reliable emulator/simulator execution
- Use device farms for broader coverage: Firebase Test Lab, App Center Test
- Store device farm credentials in CI secrets

## Troubleshooting
- If Detox cannot find binary, verify binaryPath in .detoxrc.json
- For emulator issues, ensure AVD exists and is started before running tests
MD
echo "Created E2E runbook at $RUNBOOK"

# -------------------------
# 7) Finalize and commit
# -------------------------
echo "E2E scaffolding complete. Artifacts written to $ARTIFACTS_DIR"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add "$E2E_DIR" "$SCRIPTS_DIR" "$CI_FILE" "$VSCODE_DIR" "$DOCS_DIR" || true
  git commit -m "chore(e2e): scaffold Detox and Appium examples, device farm scripts, CI and runbook ($TS)" || true
fi

echo "Done."
