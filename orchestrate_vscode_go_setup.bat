@echo off
REM Orchestrator for VS Code Go environment setup and workspace storage cleanup

REM 1. Launch VS Code with the TFX-Hub-Prod profile
code --profile "TFX-Hub-Prod" "C:\Users\1hans\tfx-hub"

REM 2. (Manual) Open Extensions sidebar and confirm Go, Prettier, ESLint, Docker, etc. are installed
REM 3. (Manual) Open Settings and confirm Go settings are applied (see .vscode/settings.json)

REM 4. Run the PowerShell script to clean up workspace storage after confirming with the Workspace Storage Cleanup extension
powershell -ExecutionPolicy Bypass -File scripts\cleanup_workspace_storage.ps1

echo VS Code Go environment setup and workspace storage cleanup complete.
pause
