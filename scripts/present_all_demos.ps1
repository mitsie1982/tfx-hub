# scripts/present_all_demos.ps1
# Orchestrate presentation windows for Contractor, Customer, AMS, Members and open developer log tail.
# Usage:
#   Run elevated (recommended) from repo root:
#     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#     .\scripts\present_all_demos.ps1
param(
  [string]$RepoRoot = (Get-Location).Path,
  [int]$ServerPollTimeoutSeconds = 45,
  [int]$ServerPollIntervalSeconds = 2,
  [int]$GridCols = 2
)

$ErrorActionPreference = 'Stop'
Write-Host "Presentation orchestrator starting in $RepoRoot"

# Paths
$scriptsDir = Join-Path $RepoRoot 'scripts'
$logDir = Join-Path $RepoRoot 'artifacts\demo-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

# Demo entries: friendly name, start script path, optional explicit URL
$demos = @(
  @{ Name='Contractor'; Start = Join-Path $scriptsDir 'start_contractor_demo.ps1'; Url = $null },
  @{ Name='Customer';   Start = Join-Path $scriptsDir 'start_customer_demo.ps1';   Url = $null },
  @{ Name='AMS';        Start = Join-Path $scriptsDir 'start_ams_demo.ps1';        Url = $null },
  @{ Name='Members';    Start = Join-Path $scriptsDir 'start_members_demo.ps1';    Url = $null }
)

# Common candidate URLs to poll for servers
$candidateUrls = @('http://localhost:3000','http://localhost:8080','http://localhost:19006','http://localhost:8081','http://localhost:19000')

# Detect browser executable (Edge preferred, then Chrome)
function Get-Browser {
  $edge = @(
    "$env:ProgramFiles (x86)\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($edge) { return @{ Name='edge'; Path=$edge } }
  $chrome = @(
    "$env:ProgramFiles (x86)\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($chrome) { return @{ Name='chrome'; Path=$chrome } }
  return $null
}

$browser = Get-Browser
if ($browser) { Write-Host "Browser found: $($browser.Name) at $($browser.Path)" } else { Write-Warning "Edge/Chrome not found. Will open default browser windows." }

# Helper: start a start script in its own PowerShell process if not already running
function Start-DemoProcess {
  param($StartScript)
  if (-not (Test-Path $StartScript)) { Write-Warning "Start script missing: $StartScript"; return $null }
  # Check if a process already runs that references this script in its command line
  $existing = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match [regex]::Escape($StartScript) }
  if ($existing) {
    Write-Host "Demo process already running for $StartScript (pid $($existing.ProcessId))"
    return $existing.ProcessId
  }
  # Launch new PowerShell process running the start script
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = (Get-Command powershell.exe).Source
  $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$StartScript`" -Mode dev"
  $psi.WorkingDirectory = Split-Path $StartScript -Parent
  $psi.UseShellExecute = $true
  $proc = [System.Diagnostics.Process]::Start($psi)
  Start-Sleep -Milliseconds 500
  Write-Host "Started demo process for $StartScript (pid $($proc.Id))"
  return $proc.Id
}

# Helper: poll for a reachable URL from candidate list or explicit url
function Wait-ForServer {
  param($ExplicitUrl, $TimeoutSeconds, $IntervalSeconds)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  if ($ExplicitUrl) {
    $candidates = @($ExplicitUrl)
  } else {
    $candidates = $candidateUrls
  }
  while ((Get-Date) -lt $deadline) {
    foreach ($u in $candidates) {
      try {
        $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($r.StatusCode -ge 200) { return $u }
      } catch { }
    }
    Start-Sleep -Seconds $IntervalSeconds
  }
  return $null
}

# Add user32 functions to move windows
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

# Helper: try to bring a process main window to position and size
function Position-ProcessWindow {
  param($ProcessId, $X, $Y, $Width, $Height)
  try {
    $p = Get-Process -Id $ProcessId -ErrorAction Stop
    $h = $p.MainWindowHandle
    if ($h -eq 0) { return $false }
    [Win32]::ShowWindow($h, [Win32]::SW_RESTORE) | Out-Null
    [Win32]::SetWindowPos($h, [Win32]::HWND_TOP, [int]$X, [int]$Y, [int]$Width, [int]$Height, [Win32]::SWP_SHOWWINDOW) | Out-Null
    return $true
  } catch {
    return $false
  }
}

# Helper: open URL in app mode or default browser and return process id if possible
function Open-UrlInAppWindow {
  param($Url)
  if ($browser) {
    $exe = $browser.Path
    $args = "--app=`"$Url`""
    $proc = Start-Process -FilePath $exe -ArgumentList $args -PassThru -WindowStyle Normal
    Start-Sleep -Milliseconds 600
    return $proc.Id
  } else {
    Start-Process $Url
    return $null
  }
}

# Start demos, detect servers, open windows, and collect PIDs
$openWindows = @()
$index = 0
foreach ($d in $demos) {
  Write-Host "Processing demo $($d.Name)"
  # Start demo process if needed
  $demoPid = Start-DemoProcess -StartScript $d.Start
  # Wait for server
  $url = Wait-ForServer -ExplicitUrl $d.Url -TimeoutSeconds $ServerPollTimeoutSeconds -IntervalSeconds $ServerPollIntervalSeconds
  if ($url) {
    Write-Host "Detected server for $($d.Name) at $url"
    $browserPid = Open-UrlInAppWindow -Url $url
    $openWindows += @{ Name=$d.Name; Url=$url; BrowserPid=$browserPid; Index=$index }
  } else {
    Write-Warning "No server detected for $($d.Name). Opening local presentation page instead."
    # Create a simple local presentation HTML and open it
    $presentHtml = Join-Path (Split-Path $d.Start -Parent) ("presentation_$($d.Name).html")
    $html = @"
<!doctype html><html><head><meta charset='utf-8'/><title>$($d.Name) Presentation</title></head><body style='font-family:Segoe UI,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f7f9fc'><div style='padding:28px;border-radius:8px;background:white;box-shadow:0 6px 18px rgba(0,0,0,0.08);max-width:900px;text-align:center'><h1>$($d.Name) Demo</h1><p>Status: Placeholder or no server detected</p><p>Started at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p></div></body></html>
"@
    $html | Out-File -FilePath $presentHtml -Encoding UTF8 -Force
    $browserPid = Open-UrlInAppWindow -Url $presentHtml
    $openWindows += @{ Name=$d.Name; Url=$presentHtml; BrowserPid=$browserPid; Index=$index }
  }
  $index++
}

# Arrange windows in a grid
# Get primary screen resolution
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$screenWidth = $screen.Width
$screenHeight = $screen.Height

$cols = [math]::Max(1, [int]$GridCols)
$rows = [math]::Ceiling($openWindows.Count / $cols)
$cellW = [int]($screenWidth / $cols)
$cellH = [int]($screenHeight / $rows)

# Try to position browser windows by PID; fallback to user to arrange manually
foreach ($entry in $openWindows) {
  $i = $entry.Index
  $col = $i % $cols
  $row = [math]::Floor($i / $cols)
  $x = $col * $cellW
  $y = $row * $cellH
  $w = $cellW
  $h = $cellH
  if ($entry.BrowserPid) {
    Start-Sleep -Milliseconds 700
    $ok = Position-ProcessWindow -ProcessId $entry.BrowserPid -X $x -Y $y -Width $w -Height $h
    if ($ok) {
      Write-Host "Positioned $($entry.Name) window at $x,$y size $w x $h"
    } else {
      Write-Warning "Could not position window for $($entry.Name). You may need to arrange manually."
    }
  } else {
    Write-Host "No browser PID for $($entry.Name); please arrange the window manually."
  }
}

# Open developer tail window that shows all demo logs
$logFiles = Get-ChildItem -Path $logDir -Filter "*_launch_*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
if ($logFiles) {
  $tailScript = Join-Path $scriptsDir 'dev_demo_tail.ps1'
  $tailContent = @"
# dev_demo_tail.ps1 - tails demo logs for developer
Write-Host 'Developer log tail started. Press Ctrl+C to stop.'
Get-ChildItem -Path '$logDir' -Filter '*_launch_*.log' | Sort-Object LastWriteTime | ForEach-Object {
  Write-Host '--- Tailing' `$_.FullName
  Get-Content -Path `$_.FullName -Wait -Tail 200
}
"@
  $tailContent | Out-File -FilePath $tailScript -Encoding UTF8 -Force
  Unblock-File -Path $tailScript -ErrorAction SilentlyContinue
  # Start developer tail in a new PowerShell window
  Start-Process -FilePath (Get-Command powershell.exe).Source -ArgumentList "-NoProfile -ExecutionPolicy Bypass -NoExit -File `"$tailScript`"" -WindowStyle Normal
  Write-Host "Developer tail window opened."
} else {
  Write-Warning "No demo log files found in $logDir. Developer tail not started."
}

Write-Host ""
Write-Host "Presentation windows launched and arranged. Developer tail opened if logs exist."
Write-Host "If any presentation window is not visible, check that Edge/Chrome is installed or arrange windows manually."
Write-Host "Press Enter to exit this orchestrator (presentation windows remain open)."
Read-Host
