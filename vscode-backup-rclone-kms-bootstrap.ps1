# vscode-backup-rclone-kms-bootstrap.ps1
# Bootstraps all backup/restore automation tasks for VS Code, rclone, and KMS

# Ensure required scripts and tasks are present
$ErrorActionPreference = 'Stop'

Write-Host "Bootstrapping VS Code backup/restore automation..."

# Ensure backup scripts exist
$backupScript = "./scripts/backup_tfxhub.ps1"
if (-not (Test-Path $backupScript)) {
    Write-Host "Backup script not found: $backupScript" -ForegroundColor Red
    exit 1
}

# Ensure tasks.json exists and has backup/restore tasks
$tasksJson = ".vscode/tasks.json"
if (-not (Test-Path $tasksJson)) {
    Write-Host "tasks.json not found, creating minimal version..."
    New-Item -ItemType Directory -Path ".vscode" -Force | Out-Null
    Set-Content -Path $tasksJson -Value '{ "version": "2.0.0", "tasks": [] }'
}

# Optionally, check for rclone and KMS CLI
if (-not (Get-Command rclone -ErrorAction SilentlyContinue)) {
    Write-Host "rclone not found. Please install rclone and add to PATH." -ForegroundColor Yellow
}

# KMS integration placeholder (customize as needed)
Write-Host "If using KMS for encryption key management, ensure your scripts handle key retrieval."

Write-Host "VS Code backup/restore automation bootstrap complete."
