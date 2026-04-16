  $IsAdmin = ([Security.Principal.WindowsPrincipal] 
    [Security.Principal.WindowsIdentity]::GetCurrent()
  ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

  if (-not $IsAdmin) {
    Log "Running in LIMITED MODE (no system repair actions)"
  }
Write-Host "=== TFX Repair Script ===" -ForegroundColor Cyan
Write-Host "Running as Admin: $([bool]([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))"
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
  Log "Node.js is not installed or not in PATH."
  exit 1
}
param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$TargetRestoreDateTime = '2026-04-04 18:00:00',
  [int]$ContractorPort = 3001,
  [int]$CustomerPort = 3004,
  [int]$AmsPort = 3002,
  [int]$MembersPort = 3003
)

$ErrorActionPreference = 'Stop'
$now = Get-Date -Format 'yyyyMMddTHHmmss'
$logDir = Join-Path $RepoRoot 'artifacts\demo-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$diag = Join-Path $logDir "repair-with-restorepoint_$now.txt"

function Log { param($m) "$((Get-Date).ToString('s')) - $m" | Tee-Object -FilePath $diag -Append; Write-Host $m }

# 0) Require elevation
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "This script must be run as Administrator. Use the VS Code task or run an elevated PowerShell." -ForegroundColor Yellow
  exit 1
}

Log "Starting repair_with_restorepoint.ps1"


# Only perform system repair actions if running as admin
if ($IsAdmin) {
  # 1) Check for the specific restore point (best-effort)
  try {
    Log "Listing available restore points..."
    $rps = Get-ComputerRestorePoint 2>$null
    if ($rps) {
      $target = [datetime]::Parse($TargetRestoreDateTime)
      $match = $rps | Where-Object {
          [datetime]$_.CreationTime -ge $target.AddMinutes(-5) -and
          [datetime]$_.CreationTime -le $target.AddMinutes(5)
      }
      if ($match) {
        Log "Found a restore point within ±5 minutes of $TargetRestoreDateTime:"
        $match | Select-Object SequenceNumber, Description, CreationTime | Format-List | Out-String | Tee-Object -FilePath $diag -Append
        Log "To restore to this point: run 'rstrui.exe' and select the restore point closest to $TargetRestoreDateTime."

  } catch {
    Log "Registry export failed: $($_.Exception.Message)"
  }

  # 4) Run SFC and log output
  try {
    Log "Running sfc /scannow (this may take several minutes)..."
    $sfcLog = Join-Path $logDir "sfc_$now.txt"
    & sfc.exe /scannow 2>&1 | Tee-Object -FilePath $sfcLog
    Log "SFC finished. Output saved to $sfcLog"
  } catch {
    Log "SFC failed: $($_.Exception.Message)"
  }

  # 5) Run DISM if SFC reported issues (best-effort)
  try {
    if (Test-Path $sfcLog) {
      $sfcOutput = Get-Content -Path $sfcLog -Raw
      if ($sfcOutput -match "Windows Resource Protection found corrupt files and successfully repaired them" -or $sfcOutput -match "Windows Resource Protection found corrupt files but was unable to fix some of them") {
        Log "SFC reported repairs or issues; running DISM /Online /Cleanup-Image /RestoreHealth..."
        $dismLog = Join-Path $logDir "dism_$now.txt"
        & dism.exe /online /cleanup-image /restorehealth 2>&1 | Tee-Object -FilePath $dismLog
        Log "DISM finished. Output saved to $dismLog"
      } else {
        Log "SFC did not report corruption; skipping DISM."
      }
    } else {
      Log "SFC log file not found; skipping DISM."
    }
  } catch {
    Log "DISM failed: $($_.Exception.Message)"
  }
}

# 6) Recreate demo wrappers and Desktop shortcuts (non-destructive)
try {
  Log "Recreating demo wrappers and Desktop shortcuts (Contractor, Customer, AMS, Members)."
  $scriptsDir = Join-Path $RepoRoot 'scripts'
  New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
  $desktop = [Environment]::GetFolderPath('Desktop')
  $shell = New-Object -ComObject WScript.Shell
  $apps = @(
    @{ Name='Demo Contractor'; Wrapper='launch_contractor_wrapper.ps1'; AppRel='packages\contractor-app'; Port=$ContractorPort },
    @{ Name='Demo Customer';   Wrapper='launch_customer_wrapper.ps1';   AppRel='packages\customer-app';   Port=$CustomerPort },
    @{ Name='Demo AMS';        Wrapper='launch_ams_wrapper.ps1';        AppRel='packages\ams-app';        Port=$AmsPort },
    @{ Name='Demo Members';    Wrapper='launch_members_wrapper.ps1';    AppRel='packages\members-app';    Port=$MembersPort }
  )
  foreach ($a in $apps) {
    $appPath = Join-Path $RepoRoot $a.AppRel
    New-Item -ItemType Directory -Path $appPath -Force | Out-Null
    $wrapperPath = Join-Path $scriptsDir $a.Wrapper
    $logFile = Join-Path $logDir ("$($a.Name -replace ' ','_')_server_$now.log")
    $content = @"
try {
  `$env:PORT = '$($a.Port)'
  Set-Location `"$appPath`"
  Write-Host 'Starting $($a.Name) on port' `$env:PORT
  if (Test-Path 'server.js') {
    node server.js 2>&1 | Tee-Object -FilePath `"$logFile`"
  } else {
    Write-Host 'No server.js found in' `"$appPath`"
    Read-Host 'Press Enter to close'
  }
} catch {
  Write-Host 'ERROR starting $($a.Name):' `$_.Exception.Message
  Read-Host 'Press Enter to close'
}
"@
    $content | Out-File -FilePath $wrapperPath -Encoding UTF8 -Force
    Unblock-File -Path $wrapperPath -ErrorAction SilentlyContinue

    $link = Join-Path $desktop ("$($a.Name).lnk")
    if (Test-Path $link) { Remove-Item -Path $link -Force -ErrorAction SilentlyContinue }
    $sc = $shell.CreateShortcut($link)
    $sc.TargetPath = (Get-Command powershell.exe).Source
    $sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -NoExit -File `"$wrapperPath`""
    $sc.WorkingDirectory = $appPath
    $sc.IconLocation = "shell32.dll, 1"
    $sc.Description = "Launch $($a.Name)"
    $sc.Save()
    Log "Created wrapper and shortcut for $($a.Name)"
  }
} catch {
  Log "Failed to recreate wrappers/shortcuts: $($_.Exception.Message)"
}

# 7) Final instructions about the 2026-04-04 18:00 restore point
Log "If you want to restore the system to $TargetRestoreDateTime (if that restore point exists), run the System Restore UI now:"
Log "  1) Press Win+R, type: rstrui.exe, press Enter"
Log "  2) In the UI select the restore point dated $TargetRestoreDateTime and follow prompts."
Log "Note: System Restore will reboot the machine and revert system files and registry to that point."

Log "Script finished. Diagnostics saved to: $diag"
