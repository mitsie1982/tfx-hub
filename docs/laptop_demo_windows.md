# Laptop Demo for RNW Sample

Generated: 20260401T100956Z

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

