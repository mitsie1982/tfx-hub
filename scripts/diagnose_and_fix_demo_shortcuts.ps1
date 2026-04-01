# scripts/diagnose_and_fix_demo_shortcuts.ps1
# Idempotent diagnostic and repair for demo desktop shortcuts.
# - Verifies scripts parse (no execution)
# - Unblocks scripts
# - Creates launcher wrappers that log output
# - Recreates Desktop shortcuts pointing to the launcher wrappers
# - Updates VS Code tasks to use the launcher wrappers
# Usage:
#   Run from repo root in an elevated PowerShell session:
#     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#     .\scripts\diagnose_and_fix_demo_shortcuts.ps1

param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
Write-Host "Diagnose and fix demo shortcuts starting in $RepoRoot"

# Paths and mapping (adjust if your app folders differ)
$scriptsDir   = Join-Path $RepoRoot 'scripts'
$artifactsDir = Join-Path $RepoRoot 'artifacts'
$logDir       = Join-Path $artifactsDir 'demo-logs'
$vscodeDir    = Join-Path $RepoRoot '.vscode'
New-Item -ItemType Directory -Path $scriptsDir   -Force | Out-Null
New-Item -ItemType Directory -Path $logDir        -Force | Out-Null
New-Item -ItemType Directory -Path $vscodeDir     -Force | Out-Null

# Demo mapping: name -> start script path
$demos = @(
  @{ Name = 'Demo Contractor'; Script = Join-Path $scriptsDir 'start_contractor_demo.ps1' },
  @{ Name = 'Demo Customer';   Script = Join-Path $scriptsDir 'start_customer_demo.ps1'   },
  @{ Name = 'Demo AMS';        Script = Join-Path $scriptsDir 'start_ams_demo.ps1'        },
  @{ Name = 'Demo Members';    Script = Join-Path $scriptsDir 'start_members_demo.ps1'    }
)

# Helper: safe parse check (compiles script text without executing)
function Test-ScriptSyntax {
  param([string]$Path)
  try {
    $content = Get-Content -Raw -ErrorAction Stop -Path $Path
    [ScriptBlock]::Create($content) | Out-Null
    return $true
  } catch {
    Write-Warning "Syntax error parsing ${Path}: $($_.Exception.Message)"
    return $false
  }
}

# Helper: create launcher wrapper that logs output and keeps window open
function New-Launcher {
  param(
    [string]$TargetScript,
    [string]$LauncherPath,
    [string]$LogDir
  )
  $leafBase = [IO.Path]::GetFileNameWithoutExtension($TargetScript)
  $logFile  = Join-Path $LogDir ("${leafBase}_launch.log")
  $content = @"
# Launcher wrapper for $([IO.Path]::GetFileName($TargetScript))
# Runs the target script, tees output to a log, and waits for user input.
param([string]`$Mode = 'dev')

`$ErrorActionPreference = 'Continue'
Write-Host "Launcher starting: $TargetScript (Mode=`$Mode)"
Write-Host "Log file: $logFile"
try {
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$TargetScript" -Mode `$Mode 2>&1 |
    Tee-Object -FilePath "$logFile"
} catch {
  Write-Error "Launcher failed: `$(`$_.Exception.Message)"
}
Write-Host "Launcher finished. Press Enter to close."
Read-Host
"@
  $content | Out-File -FilePath $LauncherPath -Encoding UTF8 -Force
  Unblock-File -Path $LauncherPath -ErrorAction SilentlyContinue
  return $logFile
}

# Create or overwrite Desktop shortcut pointing to a launcher script
function Create-Shortcut {
  param(
    [string]$ShortcutName,
    [string]$LauncherScriptPath,
    [string]$WorkingDirectory
  )
  $desktop   = [Environment]::GetFolderPath('Desktop')
  $linkPath  = Join-Path $desktop "${ShortcutName}.lnk"
  $psExe     = (Get-Command powershell.exe).Source
  $arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$LauncherScriptPath`""
  $shell     = New-Object -ComObject WScript.Shell
  $shortcut  = $shell.CreateShortcut($linkPath)
  $shortcut.TargetPath       = $psExe
  $shortcut.Arguments        = $arguments
  $shortcut.WorkingDirectory = $WorkingDirectory
  $shortcut.WindowStyle      = 1
  $shortcut.IconLocation     = "shell32.dll, 1"
  $shortcut.Description      = "Launch $ShortcutName demo"
  $shortcut.Save()
  Write-Host "Created shortcut: $linkPath"
  Write-Host "  -> $psExe $arguments"
}

# Rebuild tasks.windows-demo.json using launcher wrappers
function Update-VSCodeTasks {
  param([array]$LauncherMap, [string]$TasksPath)

  # Read existing tasks and keep non-demo entries
  $existing = @{ version = "2.0.0"; tasks = @() }
  if (Test-Path $TasksPath) {
    try { $existing = Get-Content $TasksPath -Raw | ConvertFrom-Json } catch {}
  }

  # Build replacement demo tasks
  $demoLabels = $LauncherMap | ForEach-Object { $_.Label }
  $kept = @($existing.tasks | Where-Object { $_.label -notin $demoLabels })

  $newTasks = $LauncherMap | ForEach-Object {
    [PSCustomObject]@{
      label        = $_.Label
      type         = "shell"
      command      = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$($_.Launcher)`""
      presentation = @{ reveal = "always"; panel = "new"; clear = $true; echo = $true }
      group        = @{ kind = "test"; isDefault = $false }
    }
  }

  $merged = @{ version = "2.0.0"; tasks = @($kept + $newTasks) }
  $merged | ConvertTo-Json -Depth 6 | Out-File -FilePath $TasksPath -Encoding UTF8 -Force
  Write-Host "Updated VS Code tasks: $TasksPath"
}

# ?? Main flow ?????????????????????????????????????????????????????????????????
$launcherMap = @()

foreach ($d in $demos) {
  $name       = $d.Name
  $scriptPath = $d.Script

  if (-not (Test-Path $scriptPath)) {
    Write-Warning "Missing start script for ${name}: $scriptPath  -- skipping"
    continue
  }

  # Unblock
  try { Unblock-File -Path $scriptPath -ErrorAction SilentlyContinue } catch {}

  # Syntax check
  if (-not (Test-ScriptSyntax -Path $scriptPath)) {
    Write-Warning "Syntax check failed for $scriptPath -- skipping"
    continue
  }
  Write-Host "Syntax OK: $scriptPath"

  # Create launcher wrapper
  $leafBase    = [IO.Path]::GetFileNameWithoutExtension($scriptPath)
  $launcherPath = Join-Path $scriptsDir "${leafBase}_launcher.ps1"
  $logFile     = New-Launcher -TargetScript $scriptPath -LauncherPath $launcherPath -LogDir $logDir

  # Create Desktop shortcut -> launcher
  Create-Shortcut -ShortcutName $name -LauncherScriptPath $launcherPath -WorkingDirectory $scriptsDir

  $launcherMap += @{ Label = $name; Launcher = $launcherPath; Log = $logFile }
}

# Rebuild VS Code tasks
$tasksPath = Join-Path $vscodeDir 'tasks.windows-demo.json'
Update-VSCodeTasks -LauncherMap $launcherMap -TasksPath $tasksPath

Write-Host ""
Write-Host "Diagnosis and repair complete."
Write-Host "Logs will be written to: $logDir"
Write-Host "Double-click a Desktop shortcut (Demo Contractor / Demo Customer / Demo AMS / Demo Members) to launch."
Write-Host "If a window closes immediately, open the log in $logDir to inspect errors."
Write-Host "To debug a launcher manually:"
Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File `"<launcher-path>`""