# scripts/launch_members_presentation.ps1
param(
  [int]$Port = 3003,
  [int]$WaitTimeoutSeconds = 30,
  [int]$PollIntervalSeconds = 1
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Get-Location)
$AppPathCandidates = @('packages\members-app','apps\members-app')
$AppPath = $AppPathCandidates | ForEach-Object { Join-Path $RepoRoot $_ } | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $AppPath) { $AppPath = Join-Path $RepoRoot 'packages\members-app'; New-Item -ItemType Directory -Path $AppPath -Force | Out-Null }

$LogDir = Join-Path $RepoRoot 'artifacts\demo-logs'
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Ensure-Placeholder {
  param($p,$port)
  $pkg = Join-Path $p 'package.json'
  $srv = Join-Path $p 'server.js'
  if (-not (Test-Path $pkg)) {
    @{ name='members-app'; version='0.0.1'; private=$true; scripts=@{ start='node server.js' } } | ConvertTo-Json -Depth 4 | Out-File -FilePath $pkg -Encoding UTF8
  }
  if (-not (Test-Path $srv)) {
    @"
const http = require('http');
const port = process.env.PORT || $port;
console.log('Members placeholder server starting on port', port);
const server = http.createServer((req,res)=>{ res.writeHead(200,{'Content-Type':'text/html'}); res.end('<h1>Members Demo</h1>'); });
server.listen(port,()=>console.log('Listening on',port));
"@ | Out-File -FilePath $srv -Encoding UTF8
  }
}

function Start-NodeIfMissing {
  param($p)
  $leaf = Split-Path $p -Leaf
  $nodes = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue
  foreach ($n in $nodes) { if ($n.CommandLine -and $n.CommandLine -match [regex]::Escape($leaf)) { return $n.ProcessId } }
  $nodeCmd = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $nodeCmd) { Write-Warning 'Node not found on PATH. Install Node LTS.'; return $null }
  Start-Process -FilePath $nodeCmd -ArgumentList 'server.js' -WorkingDirectory $p -WindowStyle Normal -PassThru | Out-Null
  Start-Sleep -Milliseconds 700
  return $true
}

function Wait-ForUrl {
  param($url,$timeout,$interval)
  $deadline = (Get-Date).AddSeconds($timeout)
  while ((Get-Date) -lt $deadline) {
    try { $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; if ($r.StatusCode -ge 200) { return $true } } catch {}
    Start-Sleep -Seconds $interval
  }
  return $false
}

Ensure-Placeholder -p $AppPath -port $Port
Start-NodeIfMissing -p $AppPath | Out-Null

$Url = "http://localhost:$Port"
if (Wait-ForUrl -url $Url -timeout $WaitTimeoutSeconds -interval $PollIntervalSeconds) {
  if (Test-Path "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") {
    Start-Process -FilePath "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--app=`"$Url`""
  } elseif (Test-Path "$env:ProgramFiles\Google\Chrome\Application\chrome.exe") {
    Start-Process -FilePath "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" -ArgumentList "--app=`"$Url`""
  } else {
    Start-Process $Url
  }
} else {
  $present = Join-Path $AppPath 'demo_presentation_members.html'
  "<html><body style='font-family:Segoe UI,Arial;text-align:center;padding:40px'><h1>Members (no server)</h1></body></html>" | Out-File -FilePath $present -Encoding UTF8 -Force
  Start-Process $present
}

Write-Host "Launcher finished. Press Enter to close."
Read-Host
