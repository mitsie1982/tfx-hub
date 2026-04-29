param(
  [string]$RepoRoot = (Get-Location).Path,
  [int]$WaitTimeoutSeconds = 30,
  [int]$PollIntervalSeconds = 1
)

$ErrorActionPreference = 'Stop'
$apps = @(
  @{ Name='contractor-app'; Port=3001 },
  @{ Name='customer-app';   Port=3000 },
  @{ Name='ams-app';        Port=3002 },
  @{ Name='members-app';    Port=3003 }
)

$logDir = Join-Path $RepoRoot 'artifacts\demo-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Log { param($m) "$((Get-Date).ToString('s')) - $m" | Tee-Object -FilePath (Join-Path $logDir 'cleanup_and_restart.log') -Append }

Log "Starting cleanup_and_restart_all_servers in $RepoRoot"

# 1) Find node processes referencing this repo and server.js
$repoEscaped = [regex]::Escape($RepoRoot)
$nodeProcs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and ($_.CommandLine -match $repoEscaped) -and ($_.CommandLine -match 'server\.js') }

if ($nodeProcs) {
  Log "Found node processes referencing repo:"
  $nodeProcs | Select-Object ProcessId, CommandLine | ForEach-Object { Log "PID=$($_.ProcessId) CMD=$($_.CommandLine)" }
} else {
  Log "No repo-referencing node processes found."
}

# 2) Kill duplicate node processes that reference server.js in the repo
foreach ($p in $nodeProcs) {
  try {
    Log "Stopping PID $($p.ProcessId)"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
    Log "Stopped PID $($p.ProcessId)"
  } catch {
    Log ("Failed to stop PID {0}: {1}" -f $p.ProcessId, $_.Exception.Message)
  }
}

Start-Sleep -Seconds 1

# 3) Remove accidental timestamped wrappers under scripts (keep canonical ones)
$scriptDir = Join-Path $RepoRoot 'scripts'
$wrapperPattern = 'run_server_wrapper*.ps1'
$foundWrappers = Get-ChildItem -Path $scriptDir -Filter $wrapperPattern -Recurse -ErrorAction SilentlyContinue
if ($foundWrappers) {
  Log "Found wrapper scripts to evaluate:"
  $foundWrappers | ForEach-Object { Log "  $($_.FullName)" }
  # Remove wrappers that are inside nested package script folders (accidental)
  foreach ($w in $foundWrappers) {
    # keep wrappers that are exactly scripts\run_server_wrapper.ps1 (none expected)
    if ($w.FullName -match '\\scripts\\run_server_wrapper' -and $w.FullName -notmatch '\\scripts\\run_server_wrapper\.ps1$') {
      try {
        Remove-Item -Path $w.FullName -Force -ErrorAction Stop
        Log "Removed accidental wrapper: $($w.FullName)"
      } catch {
        Log ("Could not remove {0}: {1}" -f $w.FullName, $_.Exception.Message)
      }
    } elseif ($w.FullName -match '\\scripts\\packages\\') {
      try {
        Remove-Item -Path $w.FullName -Force -ErrorAction Stop
        Log "Removed nested wrapper: $($w.FullName)"
      } catch {
        Log ("Could not remove nested wrapper {0}: {1}" -f $w.FullName, $_.Exception.Message)
      }
    } else {
      Log "Leaving wrapper: $($w.FullName)"
    }
  }
} else {
  Log "No wrapper scripts found under scripts/ matching $wrapperPattern"
}

# 4) Create canonical wrapper per app and start servers
$nodeCmd = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodeCmd) {
  Log "node not found on PATH. Aborting server start. Install Node LTS."
  Write-Host "node not found on PATH. Install Node LTS and re-run this script."
  exit 1
}

foreach ($a in $apps) {
  $appName = $a.Name
  $appPort = $a.Port
  $appPath = Join-Path $RepoRoot ("packages\$appName")
  New-Item -ItemType Directory -Path $appPath -Force | Out-Null

  # Ensure package.json exists
  $pkg = Join-Path $appPath 'package.json'
  if (-not (Test-Path $pkg)) {
    @{ name = $appName; version = '0.0.1'; private = $true; scripts = @{ start = 'node server.js' } } |
      ConvertTo-Json -Depth 4 | Out-File -FilePath $pkg -Encoding UTF8
    Log "Wrote package.json for $appName"
  }

  # Ensure server.js exists (do not overwrite if present)
  $serverJs = Join-Path $appPath 'server.js'
  if (-not (Test-Path $serverJs)) {
    $placeholder = @"
const http = require('http');
const port = process.env.PORT || $appPort;
const server = http.createServer((req,res)=>{ res.writeHead(200,{'Content-Type':'text/plain'}); res.end('$appName placeholder on port ' + port); });
server.listen(port,()=>console.log('$appName listening on',port));
"@
    $placeholder | Out-File -FilePath $serverJs -Encoding UTF8 -Force
    Log "Wrote placeholder server.js for $appName"
  }

  # Create canonical wrapper script
  $wrapper = Join-Path $scriptDir ("run_server_$($appName).ps1")
  $logFile = Join-Path $logDir ("$($appName)_server_$(Get-Date -Format yyyyMMddTHHmmss).log")
  $wrapperContent = @"
Set-Location `"$appPath`"
`$env:PORT = '$appPort'
node server.js 2>&1 | Tee-Object -FilePath `"$logFile`"
"@
  $wrapperContent | Out-File -FilePath $wrapper -Encoding UTF8 -Force
  Unblock-File -Path $wrapper -ErrorAction SilentlyContinue
  Log "Wrote canonical wrapper: $wrapper -> log: $logFile"

  # Start wrapper in a new PowerShell window (keeps visible)
  try {
    $psExe = (Get-Command powershell.exe).Source
    $args = '-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-File',$wrapper
    $proc = Start-Process -FilePath $psExe -ArgumentList $args -WorkingDirectory $appPath -PassThru
    Log "Started wrapper for $appName (PID $($proc.Id))"
  } catch {
    Log ("Failed to start wrapper for {0}: {1}" -f $appName, $_.Exception.Message)
  }
}

# 5) Wait for each server to respond and open app-mode browser windows
function WaitForUrl { param($u,$t,$i) $deadline=(Get-Date).AddSeconds($t); while((Get-Date)-lt $deadline){ try{ $r=Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; if($r.StatusCode -ge 200){ return $true } } catch{} Start-Sleep -Seconds $i } return $false }

$opened = @()
foreach ($a in $apps) {
  $url = "http://localhost:$($a.Port)"
  Log "Waiting for $url"
  if (WaitForUrl $url $WaitTimeoutSeconds $PollIntervalSeconds) {
    Log "Detected $url"
    # open in app-mode if possible
    $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
    $chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
    try {
      if (Test-Path $edge) {
        $p = Start-Process -FilePath $edge -ArgumentList "--app=`"$url`"" -PassThru
        $opened += @{ Name=$a.Name; Pid=$p.Id; Url=$url }
      } elseif (Test-Path $chrome) {
        $p = Start-Process -FilePath $chrome -ArgumentList "--app=`"$url`"" -PassThru
        $opened += @{ Name=$a.Name; Pid=$p.Id; Url=$url }
      } else {
        Start-Process $url
        $opened += @{ Name=$a.Name; Pid=$null; Url=$url }
      }
      Log "Opened browser for $($a.Name) -> $url"
    } catch {
      Log ("Failed to open browser for {0}: {1}" -f $a.Name, $_.Exception.Message)
    }
  } else {
    Log "Server did not respond at $url within timeout"
  }
}

# 6) Summary and verification
Log "Summary of opened demos:"
foreach ($o in $opened) { Log "  $($o.Name) -> $($o.Url) PID=$($o.Pid)" }

Log "Cleanup and restart complete. Check logs in $logDir"
Write-Host ""
Write-Host "Cleanup and restart complete. Logs: $logDir"
Write-Host "If any server failed to start, inspect the latest log files in that folder."
