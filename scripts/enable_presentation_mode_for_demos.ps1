# scripts/enable_presentation_mode_for_demos.ps1
# Purpose
#  - Ensure demo launchers open a visible presentation window (browser) when RNW is not present
#  - Poll for server readiness and open default browser to the server URL
#  - Recreate Desktop shortcuts that launch the improved launcher wrappers
#  - Update VS Code tasks to use the improved launchers
#
# Usage
#  Run elevated:
#    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#    .\scripts\enable_presentation_mode_for_demos.ps1
param(
  [string]$RepoRoot = (Get-Location).Path,
  [int]$ServerPollTimeoutSeconds = 60,
  [int]$ServerPollIntervalSeconds = 2
)

$ErrorActionPreference = 'Stop'
Write-Host "Presentation mode enablement starting in $RepoRoot"

# Paths
$scriptsDir   = Join-Path $RepoRoot 'scripts'
$appsDir      = Join-Path $RepoRoot 'apps'
$packagesDir  = Join-Path $RepoRoot 'packages'
$artifactsDir = Join-Path $RepoRoot 'artifacts'
$logDir       = Join-Path $artifactsDir 'demo-logs'
$vscodeDir    = Join-Path $RepoRoot '.vscode'
New-Item -ItemType Directory -Path $scriptsDir   -Force | Out-Null
New-Item -ItemType Directory -Path $appsDir       -Force | Out-Null
New-Item -ItemType Directory -Path $packagesDir   -Force | Out-Null
New-Item -ItemType Directory -Path $artifactsDir  -Force | Out-Null
New-Item -ItemType Directory -Path $logDir        -Force | Out-Null
New-Item -ItemType Directory -Path $vscodeDir     -Force | Out-Null

$demos = @(
  @{ Name = 'Demo Contractor'; StartScript = Join-Path $scriptsDir 'start_contractor_demo.ps1'; AppPaths = @((Join-Path $appsDir 'contractor-app'), (Join-Path $packagesDir 'contractor-app')) },
  @{ Name = 'Demo Customer';   StartScript = Join-Path $scriptsDir 'start_customer_demo.ps1';   AppPaths = @((Join-Path $appsDir 'customer-app'),   (Join-Path $packagesDir 'customer-app'))   },
  @{ Name = 'Demo AMS';        StartScript = Join-Path $scriptsDir 'start_ams_demo.ps1';        AppPaths = @((Join-Path $appsDir 'ams-app'),         (Join-Path $packagesDir 'ams-app'))         },
  @{ Name = 'Demo Members';    StartScript = Join-Path $scriptsDir 'start_members_demo.ps1';    AppPaths = @((Join-Path $appsDir 'members-app'),     (Join-Path $packagesDir 'members-app'))     }
)

function New-PresentationLauncher {
  param(
    [string]$TargetScript,
    [string]$LauncherPath,
    [int]$TimeoutSeconds,
    [int]$IntervalSeconds
  )
  $timestamp = (Get-Date).ToString('yyyyMMddTHHmmss')
  $baseName  = [IO.Path]::GetFileNameWithoutExtension($TargetScript)
  $logFile   = Join-Path $logDir ("${baseName}_launch_${timestamp}.log")
  $startedAt = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
  $scriptDir = Split-Path $TargetScript -Parent

  $content = @"
# Presentation launcher for $baseName
param([string]`$Mode = 'dev', [int]`$PollTimeout = $TimeoutSeconds, [int]`$PollInterval = $IntervalSeconds)
`$ErrorActionPreference = 'Continue'
Write-Host "Launcher starting: $TargetScript (Mode=`$Mode)"
Write-Host "Log file: $logFile"
Write-Host "Working directory: $scriptDir"

try {
  Start-Process -FilePath powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command', "& { & ``"$TargetScript``" -Mode `$Mode }" -NoNewWindow -PassThru | Out-Null
} catch {
  Write-Error "Failed to start target script: `$(`$_.Exception.Message)"
}

function Test-Http {
  param([string]`$url)
  try {
    `$null = Invoke-WebRequest -Uri `$url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    return `$true
  } catch { return `$false }
}

`$candidates = @('http://localhost:3000','http://localhost:8080','http://localhost:19006','http://localhost:8081','http://localhost:19000')
`$deadline   = (Get-Date).AddSeconds(`$PollTimeout)
`$opened     = `$false
while ((Get-Date) -lt `$deadline) {
  foreach (`$u in `$candidates) {
    if (Test-Http -url `$u) {
      Write-Host "Detected server at `$u. Opening default browser for presentation..."
      Start-Process `$u
      `$opened = `$true
      break
    }
  }
  if (`$opened) { break }
  Start-Sleep -Seconds `$PollInterval
}

if (-not `$opened) {
  Write-Warning "No local HTTP server detected within `$PollTimeout seconds. Falling back to local presentation page."
  `$presentHtml = Join-Path '$scriptDir' 'demo_presentation.html'
  `$html = @'
<!doctype html>
<html>
<head>
  <meta charset='utf-8'/>
  <title>Demo Presentation</title>
  <style>body{font-family:Segoe UI,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f7f9fc}.card{padding:28px;border-radius:8px;background:white;box-shadow:0 6px 18px rgba(0,0,0,0.08);max-width:900px;text-align:center}h1{margin:0 0 8px}p{margin:0;color:#444}</style>
</head>
<body>
  <div class='card'>
    <h1>Demo Presentation</h1>
    <p>Application: $baseName</p>
    <p>Status: Placeholder or no RNW detected</p>
    <p>Started at: $startedAt</p>
  </div>
</body>
</html>
'@
  `$html | Out-File -FilePath `$presentHtml -Encoding UTF8 -Force
  Start-Process `$presentHtml
}

Write-Host "Launcher will keep this console open for logs. Press Enter to close."
Read-Host
"@

  $content | Out-File -FilePath $LauncherPath -Encoding UTF8 -Force
  Unblock-File -Path $LauncherPath -ErrorAction SilentlyContinue
  return $logFile
}

function Create-DesktopShortcut {
  param($ShortcutName, $LauncherScriptPath)
  $desktop   = [Environment]::GetFolderPath('Desktop')
  $linkPath  = Join-Path $desktop "$ShortcutName.lnk"
  $psExe     = (Get-Command powershell.exe).Source
  $arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$LauncherScriptPath`""
  $shell     = New-Object -ComObject WScript.Shell
  $shortcut  = $shell.CreateShortcut($linkPath)
  $shortcut.TargetPath       = $psExe
  $shortcut.Arguments        = $arguments
  $shortcut.WorkingDirectory = Split-Path $LauncherScriptPath -Parent
  $shortcut.WindowStyle      = 1
  $shortcut.IconLocation     = "shell32.dll, 1"
  $shortcut.Description      = "Launch $ShortcutName demo (presentation mode)"
  $shortcut.Save()
  Write-Host "Created shortcut: $linkPath"
}

function Ensure-StartScript {
  param($StartScriptPath, $AppPath)
  if (-not (Test-Path $StartScriptPath)) {
    $appLeaf = Split-Path $AppPath -Leaf
    $content = @"
# Auto-generated start script for presentation
param([string]`$Mode = 'dev')
`$AppDir = '$AppPath'
if (-not (Test-Path `$AppDir)) { Write-Host 'App directory missing:' `$AppDir; exit 1 }
Set-Location `$AppDir
Write-Host 'Starting demo for' '$appLeaf' 'from' `$AppDir '(Mode=' `$Mode ')'
if (Test-Path (Join-Path `$AppDir 'package.json')) {
  if (Get-Command pnpm -ErrorAction SilentlyContinue)     { pnpm start }
  elseif (Get-Command npm -ErrorAction SilentlyContinue)  { npm run start }
  else { Write-Host 'No pnpm/npm found. Trying node server.js'; node server.js }
} elseif (Test-Path (Join-Path `$AppDir 'server.js')) {
  node server.js
} else {
  Write-Warning 'No package.json or server.js found. Create a placeholder or add RNW support.'
}
"@
    $content | Out-File -FilePath $StartScriptPath -Encoding UTF8 -Force
    Unblock-File -Path $StartScriptPath -ErrorAction SilentlyContinue
    Write-Host "Created start script: $StartScriptPath"
  } else {
    Write-Host "Start script exists: $StartScriptPath"
  }
}

function Update-VSCodeTasks {
  param($Entries)
  $tasksPath = Join-Path $vscodeDir 'tasks.windows-demo.json'
  $existing  = @{ version = "2.0.0"; tasks = @() }
  if (Test-Path $tasksPath) { try { $existing = Get-Content $tasksPath -Raw | ConvertFrom-Json } catch {} }
  $demoLabels = $Entries | ForEach-Object { $_.Label }
  $kept       = @($existing.tasks | Where-Object { $_.label -notin $demoLabels })
  $newTasks   = $Entries | ForEach-Object {
    [PSCustomObject]@{
      label        = $_.Label
      type         = "shell"
      command      = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$($_.Launcher)`""
      presentation = @{ reveal = "always"; panel = "new"; clear = $true; echo = $true }
      group        = @{ kind = "test"; isDefault = $false }
    }
  }
  @{ version = "2.0.0"; tasks = @($kept + $newTasks) } | ConvertTo-Json -Depth 6 | Out-File -FilePath $tasksPath -Encoding UTF8 -Force
  Write-Host "Updated VS Code tasks at $tasksPath"
}

# Main
$launcherEntries = @()
foreach ($d in $demos) {
  $name        = $d.Name
  $startScript = $d.StartScript
  $appPath     = $null
  foreach ($p in $d.AppPaths) { if (Test-Path $p) { $appPath = $p; break } }
  if (-not $appPath) {
    $appPath = $d.AppPaths[0]
    New-Item -ItemType Directory -Path $appPath -Force | Out-Null
    Write-Host "Created app folder placeholder: $appPath"
  }

  Ensure-StartScript -StartScriptPath $startScript -AppPath $appPath

  $baseName     = [IO.Path]::GetFileNameWithoutExtension($startScript)
  $launcherPath = Join-Path $scriptsDir "${baseName}_presentation_launcher.ps1"
  $logFile      = New-PresentationLauncher -TargetScript $startScript -LauncherPath $launcherPath -TimeoutSeconds $ServerPollTimeoutSeconds -IntervalSeconds $ServerPollIntervalSeconds

  Create-DesktopShortcut -ShortcutName $name -LauncherScriptPath $launcherPath

  $launcherEntries += @{ Label = $name; Launcher = $launcherPath; Log = $logFile }
}

Update-VSCodeTasks -Entries $launcherEntries

Write-Host ""
Write-Host "Presentation mode enabled for demos. Logs are in $logDir"
Write-Host "Double-click a Desktop shortcut to launch a demo. The launcher will open a browser presentation window if a server is detected or show a local presentation page."
