param(
    [string]$BackupRoot = "D:\TFXHubBackups"
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $BackupRoot "backup_$timestamp"
$zipPath = "$backupDir\tfxhub_snapshot_$timestamp.zip"

Write-Host "📦 Creating TFX Hub snapshot backup..."

# Create backup directory if it doesn't exist
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

# Zip the folders
Compress-Archive -Path "src", "pipelines", "models" -DestinationPath $zipPath -Force

Write-Host "✅ Backup complete: $zipPath"

# (Optional) Add logic to copy $zipPath to an external drive or cloud folder
