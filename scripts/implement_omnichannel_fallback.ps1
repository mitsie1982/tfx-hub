<#
scripts/implement_omnichannel_fallback.ps1

Purpose:
  Scaffold and wire an Omnichannel Fallback path (SMS, Email, Web UI) for non-WhatsApp Members.
  - Adds backend endpoints, frontend routes, sample integrations (SMS/email placeholders), authentication stubs, file upload, payment webhook stub, and task acceptance flows.
  - Creates feature-flag gating, documentation, CI checks and safe backups of modified files.
  - All created files are scaffolds and placeholders; replace provider keys and implement production logic before deployment.

Usage:
  pwsh ./scripts/implement_omnichannel_fallback.ps1
  pwsh ./scripts/implement_omnichannel_fallback.ps1 -Force    # overwrite existing scaffold files
  pwsh ./scripts/implement_omnichannel_fallback.ps1 -Commit -Message "Add omnichannel fallback scaffolding" -Push

Notes:
  - Run from repository root in VS Code integrated terminal.
  - Script performs textual file writes and safe backups for existing files it modifies.
  - Review, secure secrets, run tests and perform security review before merging to main.
#>

param(
  [switch]$Force,
  [switch]$Commit,
  [string]$Message = "",
  [switch]$Push
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Log($text) { Write-Host $text }

function Write-File($path, $content, $force=$false) {
  $dir = Split-Path -Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -Path $dir -ItemType Directory -Force | Out-Null }
  if ((Test-Path $path) -and -not $force) {
    Write-Host "Skipped existing file: $path (use -Force to overwrite)" -ForegroundColor Yellow
    return
  }
  $content | Out-File -FilePath $path -Encoding UTF8 -Force
  Write-Host "Wrote $path"
}

function Backup-IfExists($path) {
  if (Test-Path $path) {
    $bak = "$path.bak.$((Get-Date).ToString('yyyyMMddHHmmss'))"
    Copy-Item -Path $path -Destination $bak -Force
    Write-Host "Backed up $path -> $bak"
  }
}

function Ensure-Git {
  try { git rev-parse --is-inside-work-tree > $null 2>&1; return $true } catch { return $false }
}

# ...full script content as provided in your earlier message...
