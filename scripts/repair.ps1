param(
  [switch]$FullRepair
)

$ErrorActionPreference = 'Stop'
$IsAdmin = ([Security.Principal.WindowsPrincipal]
  [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

function Log($msg) {
  Write-Host "[TFX] $msg"
}

Log "Starting TFX Unified Repair"
Log "Admin Mode: $IsAdmin"

# 1. Validate Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Log "Node.js NOT installed"
  exit 1
}

# 2. Safe Mode Always Runs
Log "Running Safe Mode Repairs"

# Recreate folders
$apps = @("contractor-app","customer-app","ams-app","members-app")
foreach ($app in $apps) {
  New-Item -ItemType Directory -Path "packages/$app" -Force | Out-Null
}

# 3. Admin Only
if ($FullRepair -and $IsAdmin) {

  Log "Running FULL SYSTEM REPAIR"

  try {
    $target = [datetime]::ParseExact('2026-04-04 18:00:00','yyyy-MM-dd HH:mm:ss',$null)
    $rps = Get-ComputerRestorePoint 2>$null
    if ($rps) {
      $match = $rps | Where-Object {
        [datetime]$_.CreationTime -ge $target.AddMinutes(-5) -and
        [datetime]$_.CreationTime -le $target.AddMinutes(5)
      }
      if ($match) {
        Log "Found restore point within ±5 min of 2026-04-04 18:00:00:"
        $match | Select-Object SequenceNumber, Description, CreationTime | Format-List | Out-String | Write-Host
      } else {
        Log "No restore point within ±5 min of 2026-04-04 18:00:00."
      }
    }
  } catch {
    Log "Restore point lookup failed"
  }

  try {
    Checkpoint-Computer -Description "TFX Repair Point" -RestorePointType "MODIFY_SETTINGS"
    Log "Restore Point Created"
  } catch {
    Log "Restore Point Failed"
  }

  try {
    sfc /scannow
  } catch {
    Log "SFC Failed"
  }

  try {
    dism /online /cleanup-image /restorehealth
  } catch {
    Log "DISM Failed"
  }

} else {
  Log "Skipping system repair (not admin or not requested)"
}

# 4. Create Launchers
$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell

foreach ($app in $apps) {
  $name = "TFX $app"
  $link = Join-Path $desktop "$name.lnk"

  $sc = $shell.CreateShortcut($link)
  $sc.TargetPath = "powershell.exe"
  $sc.Arguments = "-NoExit -Command cd packages/$app; node server.js"
  $sc.Save()
}

Log "Repair Complete"
