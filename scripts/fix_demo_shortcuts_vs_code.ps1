<#
  Full automated fix for demo shortcuts and wrappers for VS Code workflows.
  - Contractor -> 3001
  - Customer   -> 3004 (fallback to avoid Grafana on 3000)
  - AMS        -> 3002
  - Members    -> 3003

  Usage:
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    .\scripts\fix_demo_shortcuts_vs_code.ps1
#>

param(
  [string]$RepoRoot = (Get-Location).Path,
  [int]$ContractorPort = 3001,
  [int]$CustomerPort = 3004,
  [int]$AmsPort = 3002,
  [int]$MembersPort = 3003,
  [string]$CommitMessage = "chore(demo): fix wrappers, shortcuts, ports and server binding",
  [switch]$Push
)

$ErrorActionPreference = 'Stop'

# Prepare directories and helpers
$scriptsDir = Join-Path $RepoRoot 'scripts'
New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
$logDir = Join-Path $RepoRoot 'artifacts\demo-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$desktop = [Environment]::GetFolderPath('Desktop')
$psExe = (Get-Command powershell.exe -ErrorAction Stop).Source
$shell = New-Object -ComObject WScript.Shell

function Log { param($m) $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $m"; $line | Tee-Object -FilePath (Join-Path $logDir 'fix_demo_shortcuts.log') -Append; Write-Host $m }

Log "Starting fix_demo_shortcuts_vs_code.ps1"

# App definitions
$apps = @(
  @{ Key='contractor'; Name='Demo Contractor'; Wrapper='launch_contractor_wrapper.ps1'; AppRel='packages\contractor-app'; Port=$ContractorPort },
  @{ Key='customer';   Name='Demo Customer';   Wrapper='launch_customer_wrapper.ps1';   AppRel='packages\customer-app';   Port=$CustomerPort },
  @{ Key='ams';        Name='Demo AMS';        Wrapper='launch_ams_wrapper.ps1';        AppRel='packages\ams-app';        Port=$AmsPort },
  @{ Key='members';    Name='Demo Members';    Wrapper='launch_members_wrapper.ps1';    AppRel='packages\members-app';    Port=$MembersPort }
)

# 1) Kill stale node processes that reference this repo
Log "Detecting node processes referencing repo root"
$repoEscaped = [regex]::Escape($RepoRoot)
$nodeProcs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and ($_.CommandLine -match $repoEscaped) }

if ($nodeProcs) {
  foreach ($p in $nodeProcs) {
    try {
      Log "Stopping node PID $($p.ProcessId) CMD: $($p.CommandLine)"
      Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
      Log "Stopped PID $($p.ProcessId)"
    } catch {
      Log "Failed to stop PID $($p.ProcessId): $($_.Exception.Message)"
    }
  }
} else {
  Log "No repo-referencing node processes found"
}

Start-Sleep -Seconds 1

# 2) Ensure server.js binds to 127.0.0.1 and uses intended default port
function Ensure-ServerJs {
  param($appPath, $defaultPort)
  $serverJs = Join-Path $appPath 'server.js'
  if (-not (Test-Path $serverJs)) {
    Log "server.js missing in $appPath; creating minimal server.js with port $defaultPort"
    $content = @"
const http = require('http');
const url = require('url');
const port = process.env.PORT || $defaultPort;
const server = http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  if (u.pathname === '/api/status') {
    res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
    res.end(JSON.stringify({ status: 'ready', keys: ['auth','client'], overview: 'Placeholder demo', live: { timestamp: new Date().toISOString() } }));
    return;
  }
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
  res.end('<html><body><h1>Placeholder demo on port ' + port + '</h1></body></html>');
});
server.listen(port, '127.0.0.1', () => console.log('Demo server listening on', port));
"@
    $content | Out-File -FilePath $serverJs -Encoding UTF8 -Force
    return
  }

  $raw = Get-Content -Path $serverJs -Raw
  $modified = $false

  if ($raw -notmatch "process\.env\.PORT\s*\|\|\s*$defaultPort") {
    $raw = $raw -replace "process\.env\.PORT\s*\|\|\s*\d+", "process.env.PORT || $defaultPort"
    $modified = $true
  }

  if ($raw -match "server\.listen\(\s*port\s*\)") {
    $raw = $raw -replace "server\.listen\(\s*port\s*\)", "server.listen(port, '127.0.0.1')"
    $modified = $true
  } elseif ($raw -notmatch "server\.listen\(.+127\.0\.0\.1") {
    $raw = $raw -replace "server\.listen\(([^)]*)\)", "server.listen($1, '127.0.0.1')"
    $modified = $true
  }

  if ($modified) {
    $bak = "$serverJs.bak.$((Get-Date).ToString('yyyyMMddTHHmmss'))"
    Copy-Item -Path $serverJs -Destination $bak -Force
    $raw | Out-File -FilePath $serverJs -Encoding UTF8 -Force
    Log "Patched $serverJs and saved backup $bak"
  } else {
    Log "No changes required for $serverJs"
  }
}

foreach ($a in $apps) {
  $appPath = Join-Path $RepoRoot $a.AppRel
  Ensure-ServerJs -appPath $appPath -defaultPort $a.Port
}

# 3) Write robust wrapper scripts wrapped in try/catch and keep window open on error
function Write-Wrapper {
  param($wrapperPath, $appPath, $port, $displayName)
  $logFile = Join-Path $logDir ("$($displayName -replace ' ','_')_server_{0}.log" -f (Get-Date -Format yyyyMMddTHHmmss))
  $content = @"
try {
  `$env:PORT = '$port'
  Set-Location `"$appPath`"
  Write-Host 'Starting $displayName on port' `$env:PORT
  node server.js 2>&1 | Tee-Object -FilePath `"$logFile`"
} catch {
  Write-Host 'ERROR starting $displayName:' `$_.Exception.Message
  Write-Host `$_.Exception.StackTrace
  Read-Host 'Press Enter to close this window'
}
"@
  $content | Out-File -FilePath $wrapperPath -Encoding UTF8 -Force
  Unblock-File -Path $wrapperPath -ErrorAction SilentlyContinue
  Log "Wrote wrapper $wrapperPath"
}

foreach ($a in $apps) {
  $wrapperPath = Join-Path $scriptsDir $a.Wrapper
  $appPath = Join-Path $RepoRoot $a.AppRel
  Write-Wrapper -wrapperPath $wrapperPath -appPath $appPath -port $a.Port -displayName $a.Name
}

# 4) Recreate Desktop shortcuts pointing to wrappers with -NoExit so window remains open
function Create-Shortcut {
  param($name, $wrapperPath)
  $link = Join-Path $desktop ("$name.lnk")
  if (Test-Path $link) { Remove-Item -Path $link -Force }
  $sc = $shell.CreateShortcut($link)
  $sc.TargetPath = $psExe
  $sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -NoExit -File `"$wrapperPath`""
  $sc.WorkingDirectory = Split-Path $wrapperPath -Parent
  $sc.IconLocation = "shell32.dll, 1"
  $sc.Description = "Launch $name"
  $sc.Save()
  Log "Created shortcut $link -> $wrapperPath"
}

foreach ($a in $apps) {
  $wrapperPath = Join-Path $scriptsDir $a.Wrapper
  Create-Shortcut -name $a.Name -wrapperPath $wrapperPath
}

# 5) Start each wrapper in its own PowerShell window and wait for readiness
function Start-WrapperWindow {
  param($wrapperPath, $workingDir)
  $args = '-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-File',$wrapperPath
  $proc = Start-Process -FilePath $psExe -ArgumentList $args -WorkingDirectory $workingDir -PassThru
  return $proc
}

$started = @()
foreach ($a in $apps) {
  $appPath = Join-Path $RepoRoot $a.AppRel
  $wrapperPath = Join-Path $scriptsDir $a.Wrapper
  try {
    $p = Start-WrapperWindow -wrapperPath $wrapperPath -workingDir $appPath
    $started += @{ Name=$a.Name; Port=$a.Port; Pid=$p.Id }
    Log "Started wrapper for $($a.Name) PID $($p.Id)"
    Start-Sleep -Milliseconds 700
  } catch {
    Log "Failed to start wrapper for $($a.Name): $($_.Exception.Message)"
  }
}

function WaitForHttp {
  param($port, $timeoutSec)
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/status" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
      if ($r.StatusCode -ge 200) { return $true }
    } catch {}
    Start-Sleep -Seconds 1
  }
  return $false
}

foreach ($s in $started) {
  $ok = WaitForHttp -port $s.Port -timeoutSec 20
  if ($ok) {
    Log "$($s.Name) responded on port $($s.Port)"
  } else {
    Log "Timeout waiting for $($s.Name) on port $($s.Port). Check logs in artifacts\\demo-logs"
  }
}

# 6) Open each demo in app-mode browser
function Open-AppBrowser {
  param($url)
  $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  $chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
  if (Test-Path $edge) {
    Start-Process -FilePath $edge -ArgumentList "--app=`"$url`""
  } elseif (Test-Path $chrome) {
    Start-Process -FilePath $chrome -ArgumentList "--app=`"$url`""
  } else {
    Start-Process $url
  }
}

foreach ($a in $apps) {
  $url = "http://127.0.0.1:$($a.Port)"
  Open-AppBrowser -url $url
  Start-Sleep -Milliseconds 300
}

# 7) Git: stage and commit wrapper scripts and server.js backups
function Run-Git { param($args) $git = (Get-Command git -ErrorAction SilentlyContinue).Source; if (-not $git) { return $null } & $git @args }
if (Get-Command git -ErrorAction SilentlyContinue) {
  try {
    Run-Git add scripts/*.ps1 -A
    Run-Git add packages/*/server.js.bak.* -ErrorAction SilentlyContinue
    $status = Run-Git status --porcelain
    if ($status) {
      Run-Git commit -m $CommitMessage
      Log "Committed changes: $CommitMessage"
      if ($Push) { Run-Git push; Log "Pushed changes" }
    } else {
      Log "No git changes to commit"
    }
  } catch {
    Log "Git operations failed: $($_.Exception.Message)"
  }
} else {
  Log "Git not found; skipping commit"
}

Log "Finished. Check artifacts\\demo-logs for wrapper logs and fix_demo_shortcuts.log for script trace."
Write-Host "If a demo still shows the wrong content, close the browser window and re-open via the Desktop shortcut."
