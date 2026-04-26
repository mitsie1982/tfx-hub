# Self‑Hosted Windows Runner Playbook

Generated: 20260401T100956Z

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
- Use `runs-on: self-hosted, windows` in workflows.
- Restrict which repos can use the runner via repo settings.
