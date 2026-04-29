#!/usr/bin/env pwsh
# scripts/backup_prompt_and_run.ps1
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-Secret([string]$prompt) {
  Write-Host -NoNewline "$prompt: "
  $secure = Read-Host -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  return $plain
}

Write-Host 'TFX Hub Backup — Interactive'
Write-Host 'Select target:'
Write-Host '  1) local (external drive or mount path)'
Write-Host '  2) rclone (configured remote)'
Write-Host '  3) s3 (AWS S3 bucket)'
Write-Host '  4) azure (Azure Blob container)'
$choice = Read-Host 'Enter choice number (default 1)'
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = '1' }

switch ($choice) {
  '1' { $target='local'; $targetPath = Read-Host 'Local path (e.g., /mnt/backup or E:\backups)' }
  '2' { $target='rclone'; $targetPath = Read-Host 'rclone remote (e.g., myremote:backups/tfxhub)' }
  '3' { $target='s3'; $targetPath = Read-Host 'S3 bucket path (e.g., my-bucket/backups/tfxhub)' }
  '4' { $target='azure'; $targetPath = Read-Host 'Azure container/prefix (e.g., container/prefix)' }
  default { Write-Host 'Invalid choice'; exit 2 }
}

$encryptChoice = Read-Host 'Encrypt archive with AES-256? (y/N)'
$encrypt = $false
if ($encryptChoice -match '^[Yy]') { $encrypt = $true }

$pass = ''
if ($encrypt) {
  $pass = Read-Secret 'Enter encryption passphrase (will not be echoed)'
  if ([string]::IsNullOrWhiteSpace($pass)) { Write-Host 'Passphrase required for encryption'; exit 2 }
}

# Confirm and run
Write-Host ''
Write-Host 'Summary:'
Write-Host "  Target: $target"
Write-Host "  TargetPath: $targetPath"
Write-Host "  Encrypt: $encrypt"
if ($encrypt) { Write-Host '  Passphrase: (hidden)' }
Write-Host ''
$ok = Read-Host 'Proceed with backup? (y/N)'
if (-not ($ok -match '^[Yy]')) { Write-Host 'Aborted by user'; exit 0 }

# Call backup script
$script = Join-Path $PSScriptRoot 'backup_tfxhub.ps1'
if (-not (Test-Path $script)) { Write-Host 'Backup script not found:' $script; exit 2 }

# Build args
$args = @("-Target", $target, "-TargetPath", $targetPath, "-IncludeGit", "true")
if ($encrypt) { $args += "-Encrypt"; $args += "-EncryptPass"; $args += $pass }

# Execute
Write-Host 'Running backup...'
& pwsh -NoProfile -ExecutionPolicy Bypass -File $script @args
$rc = $LASTEXITCODE
if ($rc -eq 0) { Write-Host 'Backup completed successfully.' } else { Write-Host 'Backup failed with exit code' $rc; exit $rc }
