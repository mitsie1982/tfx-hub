#!/usr/bin/env pwsh
# scripts/backup_tfxhub.ps1
param(
  [Parameter(Mandatory=$true)][ValidateSet('local','rclone','s3','azure')][string]$Target,
  [Parameter(Mandatory=$true)][string]$TargetPath,
  [switch]$Encrypt,
  [string]$EncryptPass = '',
  [string]$IncludeGit = 'true'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Log($m) { $ts = (Get-Date).ToString('s'); "$ts`t$m" | Out-File -FilePath out/backup.log -Append -Encoding utf8; Write-Host $m }

Log "Starting backup: Target=$Target TargetPath=$TargetPath Encrypt=$Encrypt IncludeGit=$IncludeGit"

$now = Get-Date -Format 'yyyyMMdd-HHmmss'
$repoRoot = Resolve-Path -Path '.'
$outDir = Join-Path $repoRoot 'out'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$tmp = Join-Path $env:TEMP "tfxhub_backup_$now"
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory -Path $tmp | Out-Null

# Copy working tree (including untracked)
Log 'Copying working tree to temp snapshot...'
$IsWindows = $false
if ($env:OS -eq "Windows_NT") { $IsWindows = $true }
if ($IsWindows) {
  # Use robocopy for Windows
  $src = $repoRoot.ProviderPath
  $dst = $tmp
  $excludes = @()
  if ($IncludeGit -ne 'true') { $excludes += '.git' }
  # robocopy pattern: source dest files [options]
  & robocopy $src $dst * /MIR /R:2 /W:1 | Out-Null
} else {
  if (Get-Command rsync -ErrorAction SilentlyContinue) {
    $excludes = @()
    if ($IncludeGit -ne 'true') { $excludes += '--exclude=.git' }
    & rsync -a --delete $excludes "$repoRoot/" "$tmp/" | Out-Null
  } else {
    & cp -a "$repoRoot/." "$tmp/" 
  }
}

# Create archive
$archiveName = "tfxhub-backup-$now.tar.gz"
$archivePath = Join-Path $outDir $archiveName
Log "Creating archive $archivePath"
if ($IsWindows) {
  if (Get-Command tar -ErrorAction SilentlyContinue) {
    & tar -C $tmp -czf $archivePath .
  } else {
    # fallback to zip
    $zipPath = [IO.Path]::ChangeExtension($archivePath, '.zip')
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tmp, $zipPath)
    $archivePath = $zipPath
  }
} else {
  & tar -C $tmp -czf $archivePath .
}

# Optional encryption
if ($Encrypt) {
  $pass = $EncryptPass
  if (-not $pass) { $pass = $env:BACKUP_PASSPHRASE }
  if (-not $pass) { throw 'Encryption requested but no passphrase provided.' }
  $encPath = "$archivePath.enc"
  if (Get-Command openssl -ErrorAction SilentlyContinue) {
    Log "Encrypting archive to $encPath"
    & openssl enc -aes-256-cbc -pbkdf2 -salt -in $archivePath -out $encPath -pass pass:$pass
    Remove-Item $archivePath -Force
    $archivePath = $encPath
  } else {
    throw 'OpenSSL not found for encryption.'
  }
}

# Compute checksum
$shaPath = "$archivePath.sha256"
Log 'Computing SHA256 checksum'
if ($IsWindows) {
  $hash = Get-FileHash -Algorithm SHA256 -Path $archivePath
  "$($hash.Hash)  $([IO.Path]::GetFileName($archivePath))" | Out-File -FilePath $shaPath -Encoding ascii
} else {
  & sha256sum $archivePath | Out-File -FilePath $shaPath -Encoding ascii
}

# Upload / copy to target
switch ($Target) {
  'local' {
    Log "Copying archive to local target path $TargetPath"
    if (-not (Test-Path $TargetPath)) { New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null }
    Copy-Item -Path $archivePath -Destination $TargetPath -Force
    Copy-Item -Path $shaPath -Destination $TargetPath -Force
  }
  'rclone' {
    Log "Uploading via rclone to $TargetPath"
    if (-not (Get-Command rclone -ErrorAction SilentlyContinue)) { throw 'rclone not found' }
    & rclone copyto $archivePath "$TargetPath/$(Split-Path $archivePath -Leaf)" --progress
    & rclone copyto $shaPath "$TargetPath/$(Split-Path $shaPath -Leaf)" --progress
  }
  's3' {
    Log "Uploading to S3 s3://$TargetPath/"
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) { throw 'aws CLI not found' }
    & aws s3 cp $archivePath "s3://$TargetPath/" --acl private
    & aws s3 cp $shaPath "s3://$TargetPath/" --acl private
  }
  'azure' {
    Log "Uploading to Azure Blob container/prefix $TargetPath"
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) { throw 'az CLI not found' }
    $parts = $TargetPath.Split('/',2)
    $container = $parts[0]; $prefix = if ($parts.Length -gt 1) { $parts[1] } else { '' }
    & az storage blob upload --container-name $container --file $archivePath --name "$prefix/$(Split-Path $archivePath -Leaf)" --only-show-errors
    & az storage blob upload --container-name $container --file $shaPath --name "$prefix/$(Split-Path $shaPath -Leaf)" --only-show-errors
  }
  default { throw "Unknown target: $Target" }
}

# Cleanup
Remove-Item -Recurse -Force $tmp
Log "Backup complete. Archive: $archivePath. Checksum: $shaPath"
exit 0
