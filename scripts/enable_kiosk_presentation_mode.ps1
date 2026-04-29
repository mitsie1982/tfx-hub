# scripts/enable_kiosk_presentation_mode.ps1
# Replace presentation launchers so detected server URLs open in Edge/Chrome app mode.
# Run elevated:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\scripts\enable_kiosk_presentation_mode.ps1

param(
  [string]$RepoRoot = (Get-Location).Path,
  [int]$ServerPollTimeoutSeconds = 60,
  [int]$ServerPollIntervalSeconds = 2
)

$ErrorActionPreference = 'Stop'
Write-Host "Enable kiosk presentation mode starting in $RepoRoot"

# Paths
$scriptsDir = Join-Path $RepoRoot 'scripts'
$logDir = Join-Path $RepoRoot 'artifacts\demo-logs'
$vscodeDir = Join-Path $RepoRoot '.vscode'
New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null

# Demo launchers to update
$launchers = @(
  @{ Friendly = 'Demo Contractor'; StartScript = Join-Path $scriptsDir 'start_contractor_demo.ps1'; Launcher = Join-Path $scriptsDir 'start_contractor_demo_presentation_launcher.ps1' },
  @{ Friendly = 'Demo Customer';   StartScript = Join-Path $scriptsDir 'start_customer_demo.ps1';   Launcher = Join-Path $scriptsDir 'start_customer_demo_presentation_launcher.ps1' },
  @{ Friendly = 'Demo AMS';        StartScript = Join-Path $scriptsDir 'start_ams_demo.ps1';        Launcher = Join-Path $scriptsDir 'start_ams_demo_presentation_launcher.ps1' },
  @{ Friendly = 'Demo Members';    StartScript = Join-Path $scriptsDir 'start_members_demo.ps1';    Launcher = Join-Path $scriptsDir 'start_members_demo_presentation_launcher.ps1' }
)

# Detect browser executables
function Get-BrowserPath {
  # Prefer Edge, then Chrome
  $edgePaths = @(
    "$env:ProgramFiles (x86)\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($p in $edgePaths) { if (Test-Path $p) { return @{ Name='edge'; Path=$p } } }

  $chromePaths = @(
    "$env:ProgramFiles (x86)\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
  )
  foreach ($p in $chromePaths) { if (Test-Path $p) { return @{ Name='chrome'; Path=$p } } }

  return $null
}

$browser = Get-BrowserPath
if ($null -eq $browser) {
  Write-Warning "Edge/Chrome not found in common locations. Launchers will open default browser instead."
  $browserPathLiteral = ''
} else {
  Write-Host "Using browser $($browser.Name) at $($browser.Path)"
  $browserPathLiteral = $browser.Path
}

# Helper to write launcher content
function Write-PresentationLauncher {
  param($StartScript, $LauncherPath, $Timeout, $Interval, $BrowserPathLiteral, $LogDir)

  $timestamp = (Get-Date).ToString('yyyyMMddTHHmmss')
  $base = [IO.Path]::GetFileNameWithoutExtension($StartScript)
  $logFile = Join-Path $LogDir ("${base}_launch_${timestamp}.log")
  $startScriptDir = Split-Path $StartScript -Parent

  $content = @"
# Presentation launcher updated for kiosk app window
param([string]`$Mode = 'dev', [int]`$PollTimeout = $Timeout, [int]`$PollInterval = $Interval)
`$ErrorActionPreference = 'Continue'
Write-Host "Launcher starting: $StartScript (Mode=`$Mode)"
Write-Host "Log file: $logFile"
Write-Host "Working directory: $startScriptDir"

# Start the target start script in a new PowerShell window so it runs independently
try {
  Start-Process -FilePath powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Normal','-Command', "& { & ``"$StartScript``" -Mode `$Mode }" -WorkingDirectory '$startScriptDir' -WindowStyle Normal -PassThru | Out-Null
} catch {
  Write-Error "Failed to start target script: `$(`$_.Exception.Message)"
}

# Poll for server on common ports
function Test-HttpUrl {
  param([string]`$u)
  try {
    `$null = Invoke-WebRequest -Uri `$u -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    return `$true
  } catch {
    return `$false
  }
}

`$candidates = @('http://localhost:3000','http://localhost:8080','http://localhost:19006','http://localhost:8081','http://localhost:19000')
`$deadline = (Get-Date).AddSeconds(`$PollTimeout)
`$detectedUrl = `$null
while ((Get-Date) -lt `$deadline) {
  foreach (`$u in `$candidates) {
    if (Test-HttpUrl -u `$u) {
      `$detectedUrl = `$u
      break
    }
  }
  if (`$detectedUrl) { break }
  Start-Sleep -Seconds `$PollInterval
}

if (`$detectedUrl) {
  Write-Host "Detected server at `$detectedUrl. Opening presentation window..."
  `$url = `$detectedUrl

  # Browser app mode if available
  `$browserInfo = '$BrowserPathLiteral'
  if (-not `$browserInfo) {
    try { `$browserInfo = (Get-Command msedge.exe -ErrorAction SilentlyContinue).Source } catch {}
  }
  if (-not `$browserInfo) {
    try { `$browserInfo = (Get-Command chrome.exe -ErrorAction SilentlyContinue).Source } catch {}
  }

  if (`$browserInfo) {
    Start-Process -FilePath `$browserInfo -ArgumentList "--app=``"`$url``"" -WindowStyle Normal
  } else {
    Start-Process `$url
  }
} else {
  Write-Warning "No local HTTP server detected within `$PollTimeout seconds. Opening local presentation page."
  `$presentHtml = Join-Path '$startScriptDir' 'demo_presentation.html'
  `$html = @'
<!doctype html>
<html>
<head><meta charset='utf-8'/><title>Demo Presentation</title></head>
<body style='font-family:Segoe UI,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f7f9fc'>
  <div style='padding:28px;border-radius:8px;background:white;box-shadow:0 6px 18px rgba(0,0,0,0.08);max-width:900px;text-align:center'>
    <h1>Demo Presentation</h1>
    <p>Application: $base</p>
    <p>Status: Placeholder or no server detected</p>
    <p>Started at: __STARTED_AT__</p>
  </div>
</body>
</html>
'@
  `$html = `$html -replace '__STARTED_AT__', (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
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

# Replace or create presentation launchers and recreate desktop shortcuts
$desktop = [Environment]::GetFolderPath('Desktop')
$launcherEntries = @()
foreach ($entry in $launchers) {
  $friendly = $entry.Friendly
  $startScript = $entry.StartScript
  $launcherPath = $entry.Launcher

  if (-not (Test-Path $startScript)) {
    Write-Warning "Start script missing: $startScript. Skipping."
    continue
  }

  # Write improved launcher
  $logFile = Write-PresentationLauncher -StartScript $startScript -LauncherPath $launcherPath -Timeout $ServerPollTimeoutSeconds -Interval $ServerPollIntervalSeconds -BrowserPathLiteral $browserPathLiteral -LogDir $logDir
  Write-Host "WROTE launcher: $launcherPath"

  # Create desktop shortcut
  $linkPath = Join-Path $desktop ("$friendly.lnk")
  $psExe = (Get-Command powershell.exe).Source
  $arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$launcherPath`""
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($linkPath)
  $shortcut.TargetPath = $psExe
  $shortcut.Arguments = $arguments
  $shortcut.WorkingDirectory = Split-Path $launcherPath -Parent
  $shortcut.WindowStyle = 1
  $shortcut.IconLocation = "shell32.dll, 1"
  $shortcut.Description = "Launch $friendly demo (presentation mode)"
  $shortcut.Save()
  Write-Host "Created shortcut: $linkPath"

  $launcherEntries += @{ Label = $friendly; Launcher = $launcherPath; Log = $logFile }
}

# Update VS Code tasks to call the new launchers
$tasks = @{
  version = "2.0.0"
  tasks = @()
}
foreach ($e in $launcherEntries) {
  $tasks.tasks += @{
    label = $e.Label
    type = "shell"
    command = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$($e.Launcher)`""
    presentation = @{ reveal = "always" }
  }
}
$tasksJson = $tasks | ConvertTo-Json -Depth 6
$tasksPath = Join-Path $vscodeDir 'tasks.windows-demo.json'
$tasksJson | Out-File -FilePath $tasksPath -Encoding UTF8 -Force
Write-Host "Updated VS Code tasks at $tasksPath"

Write-Host ""
Write-Host "Kiosk presentation mode enabled. Logs are in $logDir"
Write-Host "Double-click a Desktop shortcut to launch a demo. The launcher will open a focused app window if Edge/Chrome is available."
