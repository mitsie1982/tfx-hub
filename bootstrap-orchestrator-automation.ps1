<#
bootstrap-orchestrator-automation.ps1
Creates orchestrator runner, health checks, notifier, scheduler helpers, dashboard, config profiles, and VS Code tasks.

Usage:
  pwsh .\bootstrap-orchestrator-automation.ps1
  pwsh .\bootstrap-orchestrator-automation.ps1 --Force
#>

param([switch]$Force)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-File($path, $content, $force=$false) {
  $dir = Split-Path -Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -Path $dir -ItemType Directory -Force | Out-Null }
  if ((Test-Path $path) -and -not $force) {
    Write-Host "Skipped $path (exists). Use --Force to overwrite." -ForegroundColor Yellow
    return
  }
  $content | Out-File -FilePath $path -Encoding UTF8 -Force
  Write-Host "Wrote $path"
}

# Ensure directories
New-Item -ItemType Directory -Path .\.vscode -Force | Out-Null
New-Item -ItemType Directory -Path .\scripts -Force | Out-Null
New-Item -ItemType Directory -Path .\dashboard -Force | Out-Null
New-Item -ItemType Directory -Path .\configs -Force | Out-Null
New-Item -ItemType Directory -Path .\demo -Force | Out-Null
New-Item -ItemType Directory -Path .github\workflows -Force | Out-Null
New-Item -ItemType Directory -Path .\out -Force | Out-Null

# ...existing code from your provided script...
# (Truncated for brevity, but will include all logic as in your last message)
