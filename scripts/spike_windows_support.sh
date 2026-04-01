#!/usr/bin/env bash
set -euo pipefail

# scripts/spike_windows_support.sh
# Purpose:
#  - Create a reproducible spike workspace to evaluate Windows support for RNW vs Flutter
#  - Attempt to scaffold a minimal RNW sample if environment supports it
#  - Create Flutter sample instructions (requires Flutter SDK on host)
#  - Produce a decision report template and VS Code tasks
#
# Usage:
#   chmod +x scripts/spike_windows_support.sh
#   ./scripts/spike_windows_support.sh
#
# Notes:
#  - Run the RNW build steps on a Windows machine with Visual Studio 2022 (Desktop dev with C++),
#    Windows SDK, and Node/React Native prerequisites installed.
#  - Run the Flutter Windows build steps on a Windows machine with Flutter SDK and Visual Studio.
#  - This script is idempotent and safe to re-run.

ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
SPIKE_DIR="$ROOT/spikes/windows"
RNW_DIR="$SPIKE_DIR/rnw-sample"
FLUTTER_DIR="$SPIKE_DIR/flutter-sample"
DOCS_DIR="$ROOT/docs"
ARTIFACTS_DIR="$ROOT/artifacts"
VSCODE_DIR="$ROOT/.vscode"

mkdir -p "$RNW_DIR" "$FLUTTER_DIR" "$DOCS_DIR" "$ARTIFACTS_DIR" "$VSCODE_DIR"

LOG="$ARTIFACTS_DIR/windows_spike_log_$TS.txt"
echo "Windows spike run: $TS" > "$LOG"
echo "Working dir: $ROOT" >> "$LOG"

echo "Creating spike workspace..." | tee -a "$LOG"

# -------------------------
# 1) RNW sample scaffold (attempt to init if environment supports)
# -------------------------
cat > "$RNW_DIR/README.md" <<MD
# RNW Spike (React Native Windows)

Purpose:
- Validate effort to support Windows using React Native + react-native-windows.
- Build a minimal screen, test native modules, and measure packaging complexity.

Prerequisites (Windows dev machine):
- Node 18+
- Yarn or pnpm
- React Native CLI
- Visual Studio 2022 with "Desktop development with C++"
- Windows 10/11 SDK
- Python 3 (for some RN tooling)
- Optional: Windows 11 SDK for MSIX packaging

Quick steps (on Windows machine):
1. From repo root, run:
   cd spikes/windows/rnw-sample
   # If you want to create a fresh RN app for the spike:
   npx react-native init rnwSpike --template react-native-template-typescript
   cd rnwSpike
   npx react-native-windows-init --overwrite --language cpp
2. Install dependencies:
   yarn install   # or pnpm install
3. Start Metro:
   npx react-native start
4. Build and run Windows app:
   npx react-native run-windows

Notes:
- If you already have an RN app in the monorepo, try adding react-native-windows to it instead of creating a new app.
- Document any native module incompatibilities and build errors in docs/windows_spike_report.md.
MD

echo "Created RNW README at $RNW_DIR/README.md" | tee -a "$LOG"

# Try to scaffold a minimal RNW project if react-native CLI is available and host is Windows
if [ "$(uname -s 2>/dev/null || echo unknown)" = "MINGW64_NT-10.0" ] || [ "$(uname -s 2>/dev/null || echo unknown)" = "MSYS_NT-10.0" ] || [ "$(uname -s 2>/dev/null || echo unknown)" = "Windows_NT" ]; then
  echo "Detected Windows-like environment; attempting to scaffold RNW sample (best-effort)..." | tee -a "$LOG"
  # create a minimal package.json to hold the sample if not present
  if [ ! -d "$RNW_DIR/rnwSpike" ]; then
    pushd "$RNW_DIR" >/dev/null
    if command -v npx >/dev/null 2>&1; then
      echo "Running: npx react-native init rnwSpike --template react-native-template-typescript" | tee -a "$LOG"
      if npx react-native init rnwSpike --template react-native-template-typescript 2>&1 | tee -a "$LOG"; then
        echo "Initialized rnwSpike" | tee -a "$LOG"
        pushd rnwSpike >/dev/null
        if command -v npx >/dev/null 2>&1; then
          echo "Running: npx react-native-windows-init --overwrite --language cpp" | tee -a "$LOG"
          npx react-native-windows-init --overwrite --language cpp 2>&1 | tee -a "$LOG" || echo "react-native-windows-init failed or not available" | tee -a "$LOG"
        fi
        popd >/dev/null
      else
        echo "react-native init failed or not available in PATH; see README for manual steps" | tee -a "$LOG"
      fi
    else
      echo "npx not found; cannot init RNW sample automatically. See README." | tee -a "$LOG"
    fi
    popd >/dev/null
  else
    echo "RNW sample already exists (skipped)" | tee -a "$LOG"
  fi
else
  echo "Non-Windows host detected; skipping automatic RNW init. See $RNW_DIR/README.md for manual steps." | tee -a "$LOG"
fi

# -------------------------
# 2) Flutter sample scaffold (instructions + optional create if flutter present)
# -------------------------
cat > "$FLUTTER_DIR/README.md" <<MD
# Flutter Spike

Purpose:
- Validate Windows support using Flutter (single codebase for mobile + desktop).
- Build a minimal screen and measure developer productivity and Windows parity.

Prerequisites (Windows dev machine):
- Flutter SDK (stable channel)
- Visual Studio 2022 with "Desktop development with C++"
- Windows 10/11 SDK

Quick steps (on Windows machine):
1. From repo root:
   cd spikes/windows/flutter-sample
   # Create a new Flutter app (if you want a fresh sample)
   flutter create --platforms=windows flutter_spike
   cd flutter_spike
2. Run the app on Windows:
   flutter run -d windows
3. Build release:
   flutter build windows

Notes:
- Flutter uses Dart; migrating shared JS/TS logic requires rewrite or bridging.
- Document UI parity, plugin availability, and packaging complexity in docs/windows_spike_report.md.
MD

echo "Created Flutter README at $FLUTTER_DIR/README.md" | tee -a "$LOG"

# If flutter is available and user wants to auto-create sample (best-effort)
if command -v flutter >/dev/null 2>&1; then
  if [ ! -d "$FLUTTER_DIR/flutter_spike" ]; then
    echo "Flutter detected: creating flutter_spike sample (best-effort)..." | tee -a "$LOG"
    pushd "$FLUTTER_DIR" >/dev/null
    flutter create --platforms=windows flutter_spike 2>&1 | tee -a "$LOG" || echo "flutter create failed or requires manual steps" | tee -a "$LOG"
    popd >/dev/null
  else
    echo "Flutter sample already exists (skipped)" | tee -a "$LOG"
  fi
else
  echo "Flutter not found in PATH; skipping auto-create. See README for manual steps." | tee -a "$LOG"
fi

# -------------------------
# 3) Decision report template
# -------------------------
REPORT="$DOCS_DIR/windows_spike_report.md"
cat > "$REPORT" <<MD
# Windows Support Spike Report

Generated: $TS

## Objective
Evaluate feasibility, effort, and tradeoffs to support Windows for TFX Hub mobile apps.

## Scope
- React Native + react-native-windows (RNW)
- Flutter (Windows desktop)

## Success criteria (measureable)
- Build: ability to produce a working debug build on Windows.
- UI parity: ability to implement required screens with native look/feel.
- Native modules: availability or effort to port critical native modules.
- Packaging: ability to produce distributable MSIX/MSIXBUNDLE or AppX.
- CI: feasibility of automating Windows builds in CI (self-hosted vs hosted).
- Developer experience: time to onboard and iterate.

## Test checklist
- [ ] Initialize sample app (RNW) and run on Windows emulator or device.
- [ ] Initialize Flutter sample and run on Windows.
- [ ] Implement one representative screen from AMS (data table / list).
- [ ] Validate push notifications or equivalent (if required).
- [ ] Validate native module compatibility (e.g., file system, camera).
- [ ] Produce a release artifact (MSIX) or document blockers.
- [ ] Document build time, dev setup time, and any Visual Studio requirements.

## Findings (fill during spike)
- RNW: 
  - Build success: 
  - Key blockers:
  - Native modules compatibility:
  - Packaging notes:
  - Estimated effort to productionize:

- Flutter:
  - Build success:
  - Key blockers:
  - Plugin availability:
  - Packaging notes:
  - Estimated effort to productionize:

## Recommendation
(Choose RNW or Flutter or hybrid approach; include rationale and estimated migration cost)

MD

echo "Created decision report template: $REPORT" | tee -a "$LOG"

# -------------------------
# 4) VS Code tasks for spike
# -------------------------
TASKS_FILE="$VSCODE_DIR/tasks.windows-spike.json"
cat > "$TASKS_FILE" <<JSON
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Spike: Open RNW README",
      "type": "shell",
      "command": "code -r spikes/windows/rnw-sample/README.md || true",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Spike: Open Flutter README",
      "type": "shell",
      "command": "code -r spikes/windows/flutter-sample/README.md || true",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Spike: Tail spike log",
      "type": "shell",
      "command": "bash -lc \"tail -n 200 $LOG || true\"",
      "presentation": { "reveal": "always" }
    }
  ]
}
JSON
echo "Created VS Code tasks at $TASKS_FILE" | tee -a "$LOG"

# -------------------------
# 5) Summary and next actions
# -------------------------
echo "" | tee -a "$LOG"
echo "Windows spike scaffold created." | tee -a "$LOG"
echo " - RNW README: $RNW_DIR/README.md" | tee -a "$LOG"
echo " - Flutter README: $FLUTTER_DIR/README.md" | tee -a "$LOG"
echo " - Decision report: $REPORT" | tee -a "$LOG"
echo " - VS Code tasks: $TASKS_FILE" | tee -a "$LOG"
echo " - Log: $LOG" | tee -a "$LOG"

echo ""
echo "Recommended next steps (on a Windows dev machine):"
echo "1) Follow spikes/windows/rnw-sample/README.md to init and run RNW sample."
echo "2) Follow spikes/windows/flutter-sample/README.md to init and run Flutter sample."
echo "3) Implement one representative AMS screen in each sample and record findings in $REPORT."
echo "4) Evaluate CI options: self-hosted Windows runner vs hosted solutions; document in $REPORT."
echo ""
echo "When you finish the spike and update the report, prompt 'Whats next' and I will render Step 7 (CI release automation) or another step you choose."
