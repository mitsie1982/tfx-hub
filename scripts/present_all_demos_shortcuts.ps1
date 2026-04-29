# present_all_demos_shortcuts.ps1
param([int]$Timeout=45, [int]$Interval=2, [int]$Cols=2)
$urls = @(
  @{ Name='Contractor'; Url='http://localhost:3001' },
  @{ Name='Customer';   Url='http://localhost:3000' },
  @{ Name='AMS';        Url='http://localhost:3002' },
  @{ Name='Members';    Url='http://localhost:3003' }
)
# detect Edge or Chrome
$edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles (x86)\Microsoft\Edge\Application\msedge.exe" }
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$browser = if (Test-Path $edge) { $edge } elseif (Test-Path $chrome) { $chrome } else { $null }

function Wait-Url($u,$t,$i){
  $deadline = (Get-Date).AddSeconds($t)
  while((Get-Date) -lt $deadline){
    try { Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; return $true } catch {}
    Start-Sleep -Seconds $i
  }
  return $false
}

# Start windows and collect PIDs
$opened = @()
foreach ($e in $urls) {
  if (Wait-Url $e.Url $Timeout $Interval) {
    if ($browser) {
      $proc = Start-Process -FilePath $browser -ArgumentList "--app=`"$($e.Url)?kiosk=tv`"" -PassThru
      $opened += @{ Name=$e.Name; Pid=$proc.Id }
    } else {
      Start-Process $e.Url
      $opened += @{ Name=$e.Name; Pid=$null }
    }
  } else {
    Write-Warning "URL not reachable: $($e.Url). Opening fallback local page."
    $html = "$env:TEMP\presentation_$($e.Name).html"
    "<html><body><h1>$($e.Name) (no server)</h1></body></html>" | Out-File $html -Encoding UTF8
    if ($browser) { Start-Process -FilePath $browser -ArgumentList "--app=`"$html`"" } else { Start-Process $html }
    $opened += @{ Name=$e.Name; Pid=$null }
  }
}

# Position windows in grid (best-effort)
Add-Type -AssemblyName System.Windows.Forms
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$cols = [math]::Max(1,$Cols); $rows = [math]::Ceiling($opened.Count / $cols)
$cellW = [int]($bounds.Width / $cols); $cellH = [int]($bounds.Height / $rows)
$i=0
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
foreach ($o in $opened) {
  $col = $i % $cols; $row = [math]::Floor($i / $cols)
  $x = $col * $cellW; $y = $row * $cellH
  if ($o.Pid) {
    Start-Sleep -Milliseconds 700
    try {
      $p = Get-Process -Id $o.Pid -ErrorAction Stop
      $h = $p.MainWindowHandle
      if ($h -ne 0) {
        [Win32]::ShowWindow($h, [Win32]::SW_RESTORE) | Out-Null
        [Win32]::SetWindowPos($h, [Win32]::HWND_TOP, $x, $y, $cellW, $cellH, [Win32]::SWP_SHOWWINDOW) | Out-Null
      }
    } catch {}
  }
  $i++
}
Write-Host "Presentation windows opened and arranged."
