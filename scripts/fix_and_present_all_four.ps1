# scripts/fix_and_present_all_four.ps1
param(
  [string]$RepoRoot = (Get-Location).Path,
  [int]$WaitTimeoutSeconds = 45,
  [int]$PollIntervalSeconds = 1
)

$ErrorActionPreference = 'Stop'
Write-Host "Fix & present all demos starting in $RepoRoot"

# Paths
$scriptsDir = Join-Path $RepoRoot 'scripts'
$appsBaseCandidates = @('packages','apps')  # support both layouts
$artifacts = Join-Path $RepoRoot 'artifacts'
$logDir = Join-Path $artifacts 'demo-logs'
New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

# Demo definitions: name -> relative folder -> preferred port
$demos = @(
  @{ Name='Contractor'; Rel='contractor-app'; Port=3001 },
  @{ Name='Customer';   Rel='customer-app';   Port=3000 },
  @{ Name='AMS';        Rel='ams-app';        Port=3002 },
  @{ Name='Members';    Rel='members-app';    Port=3003 }
)

function Resolve-AppPath {
  param($rel)
  foreach ($base in $appsBaseCandidates) {
    $p = Join-Path $RepoRoot (Join-Path $base $rel)
    if (Test-Path $p) { return $p }
  }
  # fallback to first candidate
  return Join-Path $RepoRoot (Join-Path $appsBaseCandidates[0] $rel)
}

function Ensure-PlaceholderServer {
  param($appPath, $port)
  $pkg = Join-Path $appPath 'package.json'
  $server = Join-Path $appPath 'server.js'
  if (-not (Test-Path $pkg)) {
    $pkgObj = @{
      name = (Split-Path $appPath -Leaf)
      version = '0.0.1'
      private = $true
      scripts = @{ start = "node server.js" }
    } | ConvertTo-Json -Depth 4
    $pkgObj | Out-File -FilePath $pkg -Encoding UTF8 -Force
    Write-Host "WROTE package.json -> $pkg"
  }
  if (-not (Test-Path $server)) {
    $serverJs = @"
const http = require('http');
const port = process.env.PORT || $port;
console.log('Placeholder server starting on port', port);
const server = http.createServer((req, res) => {
  console.log(new Date().toISOString(), req.method, req.url);
  res.writeHead(200, {'Content-Type':'text/html'});
  res.end('<!doctype html><html><body style="font-family:Segoe UI,Arial;text-align:center;padding:40px"><h1>Demo: ' + process.env.DEMO_NAME + '</h1><p>Placeholder server running on port ' + port + '</p></body></html>');
});
server.listen(port, () => console.log('Listening on', port));
"@
    $serverJs | Out-File -FilePath $server -Encoding UTF8 -Force
    Write-Host "WROTE server.js -> $server"
  }
}

function NodeProcessRunningForApp {
  param($appPath)
  $leaf = Split-Path $appPath -Leaf
  $nodes = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue
  foreach ($n in $nodes) {
    if ($n.CommandLine -and $n.CommandLine -match [regex]::Escape($leaf)) { return $true }
  }
  return $false
}

function Start-NodeServer {
  param($appPath, $port)
  $nodeCmd = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $nodeCmd) {
    Write-Warning "Node not found on PATH. Please install Node LTS."
    return $null
  }
  $timestamp = (Get-Date).ToString('yyyyMMddTHHmmss')
  $logFile = Join-Path $logDir ("{0}_server_{1}.log" -f (Split-Path $appPath -Leaf), $timestamp)

  $wrapper = Join-Path $scriptsDir ("run_node_{0}_{1}.ps1" -f (Split-Path $appPath -Leaf), $timestamp)
  $wrapperContent = @"
`$env:DEMO_NAME = '{0}'
cd '{1}'
node server.js 2>&1 | Tee-Object -FilePath '{2}'
"@ -f (Split-Path $appPath -Leaf), $appPath, $logFile
  $wrapperContent | Out-File -FilePath $wrapper -Encoding UTF8 -Force
  Unblock-File -Path $wrapper -ErrorAction SilentlyContinue

  $psExe = (Get-Command powershell.exe).Source
  $args = "-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File",$wrapper
  $proc = Start-Process -FilePath $psExe -ArgumentList $args -WorkingDirectory $appPath -PassThru
  Start-Sleep -Milliseconds 700
  Write-Host "Started node wrapper for $appPath (pid $($proc.Id)). Log: $logFile"
  return $proc.Id
}

function Wait-ForUrl {
  param($url, $timeout, $interval)
  $deadline = (Get-Date).AddSeconds($timeout)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
      if ($r.StatusCode -ge 200) { return $true }
    } catch {}
    Start-Sleep -Seconds $interval
  }
  return $false
}

function Open-InAppBrowser {
  param($url)
  # Prefer Edge then Chrome app mode
  $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles (x86)\Microsoft\Edge\Application\msedge.exe" }
  $chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
  if (Test-Path $edge) {
    Start-Process -FilePath $edge -ArgumentList "--app=`"$url`""
  } elseif (Test-Path $chrome) {
    Start-Process -FilePath $chrome -ArgumentList "--app=`"$url`""
  } else {
    Start-Process $url
  }
}

function Create-LauncherAndShortcut {
  param($name, $appPath, $port)
  $launcher = Join-Path $scriptsDir ("launch_{0}_presentation.ps1" -f ($name.ToLower()))
  $launcherContent = @"
param([int]`$Port = $port)
`$AppPath = '$appPath'
`$Url = 'http://localhost:' + `$Port
Write-Host 'Launcher starting: ' `$AppPath
if (-not (Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | Where-Object { `$_.CommandLine -and `$_.CommandLine -match [regex]::Escape((Split-Path `$AppPath -Leaf)) })) {
  Write-Host 'Starting node server for' `$AppPath
  Start-Process -FilePath (Get-Command powershell.exe).Source -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-Command', "cd `"`$AppPath`"; node server.js" -WorkingDirectory `$AppPath
  Start-Sleep -Seconds 1
} else {
  Write-Host 'Node server already running for' `$AppPath
}

`$deadline=(Get-Date).AddSeconds(30)
`$ok=`$false
while((Get-Date)-lt `$deadline){
  try{
    `$r=Invoke-WebRequest -Uri `$Url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    if(`$r.StatusCode -ge 200){ `$ok=`$true; break }
  } catch{}
  Start-Sleep -Seconds 1
}

if (`$ok) {
  Write-Host 'Opening presentation at' `$Url
  `$edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  if (-not (Test-Path `$edge)) { `$edge = "$env:ProgramFiles (x86)\Microsoft\Edge\Application\msedge.exe" }
  `$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
  if (Test-Path `$edge) {
    Start-Process -FilePath `$edge -ArgumentList "--app=`"`$Url`""
  } elseif (Test-Path `$chrome) {
    Start-Process -FilePath `$chrome -ArgumentList "--app=`"`$Url`""
  } else {
    Start-Process `$Url
  }
} else {
  Write-Warning 'Server did not respond; opening local presentation page.'
  `$html = Join-Path `$AppPath 'demo_presentation.html'
  '<html><body style="font-family:Segoe UI,Arial;text-align:center;padding:40px"><h1>$name (no server)</h1></body></html>' | Out-File -FilePath `$html -Encoding UTF8 -Force
  Start-Process `$html
}
Write-Host 'Launcher finished. Press Enter to close.'
Read-Host
"@
  $launcherContent | Out-File -FilePath $launcher -Encoding UTF8 -Force
  Unblock-File -Path $launcher -ErrorAction SilentlyContinue

  # Create desktop shortcut
  $desktop = [Environment]::GetFolderPath('Desktop')
  $link = Join-Path $desktop ("Demo $name.lnk")
  $psExe = (Get-Command powershell.exe).Source
  $args = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`""
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($link)
  $shortcut.TargetPath = $psExe
  $shortcut.Arguments = $args
  $shortcut.WorkingDirectory = Split-Path $launcher -Parent
  $shortcut.IconLocation = "shell32.dll, 1"
  $shortcut.Description = "Launch $name demo (presentation)"
  $shortcut.Save()
  Write-Host "Created shortcut: $link"
  return $launcher
}

# Main loop: ensure placeholder, start server if missing, create launcher & shortcut, open presentation
foreach ($d in $demos) {
  $name = $d.Name
  $rel = $d.Rel
  $port = $d.Port
  $appPath = Resolve-AppPath -rel $rel
  New-Item -ItemType Directory -Path $appPath -Force | Out-Null
  Ensure-PlaceholderServer -appPath $appPath -port $port

  # Start node server if not running
  if (-not (NodeProcessRunningForApp -appPath $appPath)) {
    Start-NodeServer -appPath $appPath -port $port | Out-Null
  } else {
    Write-Host "Node already running for $name"
  }

  # Create launcher and shortcut
  $launcher = Create-LauncherAndShortcut -name $name -appPath $appPath -port $port

  # Wait for server and open presentation
  $url = "http://localhost:$port"
  if (Wait-ForUrl -url $url -timeout $WaitTimeoutSeconds -interval $PollIntervalSeconds) {
    Write-Host "Opening presentation for $name at $url"
    Open-InAppBrowser -url $url
  } else {
    Write-Warning "Server not reachable for $name; a local presentation page was created."
    $present = Join-Path $appPath 'demo_presentation.html'
    '<html><body style="font-family:Segoe UI,Arial;text-align:center;padding:40px"><h1>' + $name + ' (no server)</h1></body></html>' | Out-File -FilePath $present -Encoding UTF8 -Force
    Start-Process $present
  }
}

Write-Host "All demos processed. Shortcuts created on Desktop named 'Demo Contractor', 'Demo Customer', 'Demo AMS', 'Demo Members'."
Write-Host "Logs: $logDir"
