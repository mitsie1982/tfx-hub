#!/usr/bin/env bash
set -euo pipefail
# scripts/generate_windows_runner_playbook.sh
# Generates docs/windows_runner_playbook.md and docs/laptop_demo_windows.md
ROOT="$(pwd)"
DOCS_DIR="$ROOT/docs"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DOCS_DIR"

PLAYBOOK="$DOCS_DIR/windows_runner_playbook.md"
cat > "$PLAYBOOK" <<MD
# Self‑Hosted Windows Runner Playbook

Generated: $TS

## Overview
Provision, secure, and operate a self-hosted Windows runner for CI jobs requiring Visual Studio, MSIX packaging, or Windows-only tooling.

## Prerequisites
- Windows Server 2019/2022 or Windows 10/11 Pro
- Visual Studio 2022 with "Desktop development with C++"
- Windows 10/11 SDK
- Node 18+, pnpm, Python 3, Git
- Service account for runner service

## Provisioning
1. Create VM or machine and install prerequisites.
2. Create folder C:\actions-runner and download GitHub Actions runner.
3. Register runner from GitHub repo Settings > Actions > Runners using a registration token.
4. Configure runner as a Windows service.
5. Harden machine: firewall, updates, disk encryption, limited accounts.

## Maintenance
- Apply updates during maintenance windows.
- Monitor disk, CPU, memory; set alerts.
- Rotate registration tokens and service account credentials.

## CI usage
- Use \`runs-on: self-hosted, windows\` in workflows.
- Restrict which repos can use the runner via repo settings.

MD

DEMO="$DOCS_DIR/laptop_demo_windows.md"
cat > "$DEMO" <<MD
# Laptop Demo for RNW Sample

Generated: $TS

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

MD

echo "WROTE: $PLAYBOOK and $DEMO"
