param(
  [string]$RepoRoot = (Get-Location).Path,
  [int]$WaitTimeoutSeconds = 45,
  [int]$PollIntervalSeconds = 1,
  [int]$GridCols = 2
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Join-Path $RepoRoot 'scripts'
$logDir = Join-Path $RepoRoot 'artifacts\demo-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$demos = @(
  @{ Name='Contractor'; Path = Join-Path $RepoRoot 'packages\contractor-app'; Port=3001 },
  @{ Name='Customer';   Path = Join-Path $RepoRoot 'packages\customer-app';   Port=3004 },
  @{ Name='AMS';        Path = Join-Path $RepoRoot 'packages\ams-app';        Port=3002 },
  @{ Name='Members';    Path = Join-Path $RepoRoot 'packages\members-app';    Port=3003 }
)

function NodeCmd { (Get-Command node -ErrorAction SilentlyContinue).Source }

function EnsureServerFile {
  param($appPath, $port)
  $server = Join-Path $appPath 'server.js'
  if (-not (Test-Path $server)) {
    Write-Warning "server.js missing in $appPath. Please copy the provided server.js into this folder."
  }
}

function NodeRunningForApp {
  param($appPath)
  $leaf = Split-Path $appPath -Leaf
  $nodes = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue
  foreach ($n in $nodes) { if ($n.CommandLine -and $n.CommandLine -match [regex]::Escape($leaf)) { return $true } }
  return $false
}

function StartNodeForApp {
  param($appPath, $port)
  $node = NodeCmd
  if (-not $node) { Write-Warning "Node not found on PATH. Install Node LTS."; return $null }
  $timestamp = (Get-Date).ToString('yyyyMMddTHHmmss')
  $logFile = Join-Path $logDir ("{0}_server_{1}.log" -f (Split-Path $appPath -Leaf), $timestamp)
  $wrapper = Join-Path $appPath ("run_server_wrapper_{0}.ps1" -f $timestamp)
  $wrapperContent = @"
Set-Location `"$appPath`"
`$env:PORT = '$($args[0])'
node server.js 2>&1 | Tee-Object -FilePath `"$logFile`"
"@
  # Write wrapper with port argument support
  $wrapperContent | Out-File -FilePath $wrapper -Encoding UTF8 -Force
  Unblock-File -Path $wrapper -ErrorAction SilentlyContinue
  $psExe = (Get-Command powershell.exe).Source
  $args = "-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File",$wrapper,$port
  Start-Process -FilePath $psExe -ArgumentList $args -WorkingDirectory $appPath | Out-Null
  Start-Sleep -Milliseconds 700
  return $true
}

function WaitForUrl {
  param($url,$timeout,$interval)
  $deadline = (Get-Date).AddSeconds($timeout)
  while ((Get-Date) -lt $deadline) {
    try { $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; if ($r.StatusCode -ge 200) { return $true } } catch {}
    Start-Sleep -Seconds $interval
  }
  return $false
}

function OpenAppWindow {
  param($url)
  $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  $chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
  if (Test-Path $edge) {
    $p = Start-Process -FilePath $edge -ArgumentList "--app=`"$url`"" -PassThru
    return $p.Id
  } elseif (Test-Path $chrome) {
    $p = Start-Process -FilePath $chrome -ArgumentList "--app=`"$url`"" -PassThru
    return $p.Id
  } else {
    Start-Process $url
    return $null
  }
}

# Start servers and open windows
$opened = @()
foreach ($d in $demos) {
  EnsureServerFile -appPath $d.Path -port $d.Port
  if (-not (NodeRunningForApp -appPath $d.Path)) {
    Write-Host "Starting node for $($d.Name) in $($d.Path)"
    StartNodeForApp -appPath $d.Path -port $d.Port | Out-Null
  } else {
    Write-Host "Node already running for $($d.Name)"
  }
  $url = "http://localhost:$($d.Port)"
  if (WaitForUrl -url $url -timeout $WaitTimeoutSeconds -interval $PollIntervalSeconds) {
    Write-Host "Detected $($d.Name) at $url"
    $browserPid = OpenAppWindow -url $url
    $opened += @{ Name=$d.Name; Url=$url; Pid=$browserPid }
  } else {
    Write-Warning "No server detected for $($d.Name) at $url; opening local presentation page"
    $present = Join-Path $d.Path "demo_presentation_${($d.Name).ToLower()}.html"
    if (-not (Test-Path $present)) {
      "<html><body style='font-family:Segoe UI,Arial;text-align:center;padding:40px'><h1>$($d.Name) (no server)</h1></body></html>" | Out-File -FilePath $present -Encoding UTF8 -Force
    }
    $browserPid = OpenAppWindow -url $present
    $opened += @{ Name=$d.Name; Url=$present; Pid=$browserPid }
  }
}

# Arrange windows in grid (best-effort)
Add-Type -AssemblyName System.Windows.Forms
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$cols = [math]::Max(1, [int]$GridCols)
$rows = [math]::Ceiling($opened.Count / $cols)
$cellW = [int]($bounds.Width / $cols)
$cellH = [int]($bounds.Height / $rows)

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  public static IntPtr HWND_TOP = new IntPtr(0);
  public const uint SWP_SHOWWINDOW = 0x0040;
  public const int SW_RESTORE = 9;
}
"@

for ($i=0; $i -lt $opened.Count; $i++) {
  $entry = $opened[$i]
  $col = $i % $cols
  $row = [math]::Floor($i / $cols)
  $x = $col * $cellW
  $y = $row * $cellH
  $w = $cellW
  $h = $cellH
  if ($entry.Pid) {
    Start-Sleep -Milliseconds 800
    try {
      $p = Get-Process -Id $entry.Pid -ErrorAction Stop
      $hWnd = $p.MainWindowHandle
      if ($hWnd -ne 0) {
        [Win32]::ShowWindow($hWnd, [Win32]::SW_RESTORE) | Out-Null
        [Win32]::SetWindowPos($hWnd, [Win32]::HWND_TOP, $x, $y, $w, $h, [Win32]::SWP_SHOWWINDOW) | Out-Null
        Write-Host "Positioned $($entry.Name) at $x,$y size $w x $h"
      } else {
        Write-Warning "Window handle not found for PID $($entry.Pid) ($($entry.Name))"
      }
    } catch {
      Write-Warning "Could not position window for $($entry.Name): $($_.Exception.Message)"
    }
  } else {
    Write-Host "No browser PID for $($entry.Name); arrange manually if needed."
  }
}

# Open developer tail window for logs
$tailScript = Join-Path $scriptsDir 'dev_tail_all_logs.ps1'
$tailContent = @"
Write-Host 'Tailing demo logs. Press Ctrl+C to stop.'
Get-ChildItem -Path '$logDir' -Filter '*_server_*.log' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | ForEach-Object {
  Write-Host '--- Tailing' \$_.FullName
  Get-Content -Path \$_.FullName -Wait -Tail 200
}
"@
$tailContent | Out-File -FilePath $tailScript -Encoding UTF8 -Force
Unblock-File -Path $tailScript -ErrorAction SilentlyContinue
Start-Process -FilePath (Get-Command powershell.exe).Source -ArgumentList "-NoProfile -ExecutionPolicy Bypass -NoExit -File `"$tailScript`"" -WindowStyle Normal

Write-Host "Presentation started. Windows arranged. Developer tail opened."
