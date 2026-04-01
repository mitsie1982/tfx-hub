# scripts/fix_and_present_contractor.ps1
# Idempotent: create placeholder app, start server if needed, open presentation window, create desktop shortcut.
param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AppRelPath = 'packages\contractor-app',
  [string]$PreferredUrl = 'http://localhost:3001',
  [int]$WaitTimeoutSeconds = 30,
  [int]$PollIntervalSeconds = 1
)

$ErrorActionPreference = 'Stop'
$ScriptsDir = Join-Path $RepoRoot 'scripts'
$AppDir = Join-Path $RepoRoot $AppRelPath
$Artifacts = Join-Path $RepoRoot 'artifacts'
$LogDir = Join-Path $Artifacts 'demo-logs'
New-Item -ItemType Directory -Path $ScriptsDir -Force | Out-Null
New-Item -ItemType Directory -Path $AppDir -Force | Out-Null
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Ensure-PlaceholderApp {
  param($AppPath)
  $pkg = Join-Path $AppPath 'package.json'
  $server = Join-Path $AppPath 'server.js'
  if (-not (Test-Path $pkg)) {
    $pkgObj = @{
      name = 'contractor-app'
      version = '0.0.1'
      private = $true
      scripts = @{ start = 'node server.js' }
    } | ConvertTo-Json -Depth 4
    $pkgObj | Out-File -FilePath $pkg -Encoding UTF8 -Force
    Write-Host "WROTE: $pkg"
  } else { Write-Host "package.json exists: $pkg" }

  if (-not (Test-Path $server)) {
    $serverJs = @"
const http = require('http');
const port = process.env.PORT || 3001;
console.log('Contractor placeholder server starting on port', port);
const server = http.createServer((req, res) => {
  console.log(new Date().toISOString(), req.method, req.url);
  res.writeHead(200, {'Content-Type':'text/html'});
  res.end('<!doctype html><html><body style="font-family:Segoe UI,Arial;text-align:center;padding:40px"><h1>Contractor Demo</h1><p>Placeholder server running</p></body></html>');
});
server.listen(port, () => console.log('Listening on', port));
"@
    $serverJs | Out-File -FilePath $server -Encoding UTF8 -Force
    Write-Host "WROTE: $server"
  } else { Write-Host "server.js exists: $server" }
  return $AppPath
}

function Start-ServerIfMissing {
  param($AppPath, $Url, $LogDir)
  # Check if any node process is serving from this folder by scanning powershell processes that launched node with server.js
  $existing = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match [regex]::Escape((Split-Path $AppPath -Leaf)) }
  if ($existing) {
    Write-Host "Server process already running (pid $($existing.ProcessId))."
    return $existing.ProcessId
  }

  # Start server in a new PowerShell window and log output
  $timestamp = (Get-Date).ToString('yyyyMMddTHHmmss')
  $logFile = Join-Path $LogDir ("contractor_server_$timestamp.log")
  $startCmd = "cd `"$AppPath`"; if (Test-Path pnpm-lock.yaml) { pnpm install --silent } elseif (Test-Path package-lock.json) { npm install --silent } ; node server.js 2>&1 | Tee-Object -FilePath `"$logFile`""
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = (Get-Command powershell.exe).Source
  $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -NoExit -Command `"$startCmd`""
  $psi.WorkingDirectory = $AppPath
  $psi.UseShellExecute = $true
  $proc = [System.Diagnostics.Process]::Start($psi)
  Start-Sleep -Milliseconds 600
  Write-Host "Started server (pid $($proc.Id)). Log: $logFile"
  return $proc.Id
}

function Wait-ForUrl {
  param($Url, $Timeout, $Interval)
  $deadline = (Get-Date).AddSeconds($Timeout)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
      if ($r.StatusCode -ge 200) { return $true }
    } catch {}
    Start-Sleep -Seconds $Interval
  }
  return $false
}

function Create-DesktopShortcut {
  param($Name, $LauncherPath)
  $desktop = [Environment]::GetFolderPath('Desktop')
  $link = Join-Path $desktop ("$Name.lnk")
  $psExe = (Get-Command powershell.exe).Source
  $args = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$LauncherPath`""
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($link)
  $shortcut.TargetPath = $psExe
  $shortcut.Arguments = $args
  $shortcut.WorkingDirectory = Split-Path $LauncherPath -Parent
  $shortcut.IconLocation = "shell32.dll, 1"
  $shortcut.Description = "Launch $Name demo (starts server and opens presentation)"
  $shortcut.Save()
  Write-Host "Created shortcut: $link"
}

# Ensure placeholder app files exist
Ensure-PlaceholderApp -AppPath $AppDir

# Ensure a small launcher wrapper exists that starts server then opens browser
$launcher = Join-Path $ScriptsDir 'launch_contractor_presentation.ps1'
$launcherContent = @"
param([string]`$Mode='dev')
`$RepoRoot = '$RepoRoot'
`$AppDir = '$AppDir'
`$Url = '$PreferredUrl'
Write-Host 'Launcher starting: ' `$AppDir
# Start server if missing
# (This script expects fix_and_present_contractor.ps1 to have created server.js)
if (-not (Test-Path (Join-Path `$AppDir 'server.js'))) {
  Write-Warning 'server.js missing in ' `$AppDir
  exit 1
}
# Start server in background if not running
`$existingNode = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | Where-Object { `$_.CommandLine -and `$_.CommandLine -match [regex]::Escape((Split-Path `$AppDir -Leaf)) }
if (-not `$existingNode) {
  Start-Process -FilePath powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Normal','-Command', "cd `"$AppDir`"; node server.js" -WorkingDirectory `$AppDir
  Start-Sleep -Seconds 1
  Write-Host 'Started node server for contractor.'
} else {
  Write-Host 'Node server already running.'
}
# Wait for server and open in app-mode browser
`$detected = `$false
for (`$i=0; `$i -lt 30; `$i++) {
  try {
    `$r = Invoke-WebRequest -Uri `$Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if (`$r.StatusCode -ge 200) { `$detected = `$true; break }
  } catch {}
  Start-Sleep -Seconds 1
}
if (`$detected) {
  Write-Host 'Opening presentation at' `$Url
  if (Get-Command msedge -ErrorAction SilentlyContinue) {
    Start-Process msedge -ArgumentList "--app=`"`$Url`"" 
  } elseif (Get-Command chrome -ErrorAction SilentlyContinue) {
    Start-Process chrome -ArgumentList "--app=`"`$Url`"" 
  } else {
    Start-Process `$Url
  }
} else {
  Write-Warning 'Server did not respond; opening local presentation page instead.'
  `$html = Join-Path `$AppDir 'demo_presentation.html'
  '<html><body><h1>Contractor (no server)</h1></body></html>' | Out-File -FilePath `$html -Encoding UTF8 -Force
  Start-Process `$html
}
Write-Host 'Launcher finished. Press Enter to close.'
Read-Host
"@
$launcherContent | Out-File -FilePath $launcher -Encoding UTF8 -Force
Unblock-File -Path $launcher -ErrorAction SilentlyContinue
Write-Host "WROTE launcher: $launcher"

# Create desktop shortcut to the launcher
Create-DesktopShortcut -Name 'Demo Contractor' -LauncherPath $launcher

# Start the orchestrator now so the user sees immediate result
$serverPid = Start-ServerIfMissing -AppPath $AppDir -Url $PreferredUrl -LogDir $LogDir
$ready = Wait-ForUrl -Url $PreferredUrl -Timeout $WaitTimeoutSeconds -Interval $PollIntervalSeconds
if ($ready) {
  Write-Host "Server reachable at $PreferredUrl - opening presentation..."
  if (Get-Command msedge -ErrorAction SilentlyContinue) {
    Start-Process msedge -ArgumentList "--app=`"$PreferredUrl`""
  } elseif (Get-Command chrome -ErrorAction SilentlyContinue) {
    Start-Process chrome -ArgumentList "--app=`"$PreferredUrl`""
  } else {
    Start-Process $PreferredUrl
  }
} else {
  Write-Warning "Server not reachable after $WaitTimeoutSeconds seconds. A local presentation page was created."
  $present = Join-Path $AppDir 'demo_presentation.html'
  if (-not (Test-Path $present)) {
    '<html><body><h1>Contractor (no server)</h1></body></html>' | Out-File -FilePath $present -Encoding UTF8 -Force
  }
  Start-Process $present
}

Write-Host "Logs are in: $LogDir"
