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
