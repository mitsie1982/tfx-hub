# bootstrap-orchestrator-enterprise.ps1
# Bootstraps enterprise orchestrator setup: automation, governance, backup, CI/CD, and diagnostics

param()
$ErrorActionPreference = 'Stop'

Write-Host "[Enterprise Bootstrap] Starting orchestrator enterprise setup..." -ForegroundColor Cyan

# 1. Secure VS Code setup
if (Test-Path './bootstrap-secure-vscode.ps1') {
    Write-Host "[Step 1] Securing VS Code..."
    . ./bootstrap-secure-vscode.ps1
} else {
    Write-Host "[Step 1] Secure VS Code script not found, skipping." -ForegroundColor Yellow
}

# 2. Automation and governance bootstrap
$automationScripts = @(
    './bootstrap-orchestrator-automation.ps1',
    './bootstrap-orchestrator-demo-and-terraform.ps1',
    './bootstrap-orchestrator-enhance.ps1',
    './bootstrap-orchestrator-integration.ps1',
    './bootstrap-governance-vscode.ps1'
)
foreach ($script in $automationScripts) {
    if (Test-Path $script) {
        Write-Host "[Step 2] Running $script..."
        . $script
    } else {
        Write-Host "[Step 2] $script not found, skipping." -ForegroundColor Yellow
    }
}

# 3. Backup automation
if (Test-Path './vscode-backup-rclone-kms-bootstrap.ps1') {
    Write-Host "[Step 3] Bootstrapping backup/restore automation..."
    . ./vscode-backup-rclone-kms-bootstrap.ps1
} else {
    Write-Host "[Step 3] Backup/restore bootstrap script not found, skipping." -ForegroundColor Yellow
}

# 4. Diagnostics
if (Test-Path './vscode-network-diagnostics.ps1') {
    Write-Host "[Step 4] Running network diagnostics..."
    . ./vscode-network-diagnostics.ps1
} else {
    Write-Host "[Step 4] Network diagnostics script not found, skipping." -ForegroundColor Yellow
}

Write-Host "[Enterprise Bootstrap] Orchestrator enterprise setup complete." -ForegroundColor Green
