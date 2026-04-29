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
