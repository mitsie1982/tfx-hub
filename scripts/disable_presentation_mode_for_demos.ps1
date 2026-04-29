# scripts/disable_presentation_mode_for_demos.ps1
# Restores Windows settings saved by enable_presentation_mode_for_demos.ps1:
#   - Restores notification (Focus Assist) state
#   - Restores screen sleep and screensaver settings
#   - Restores previous power plan
# Usage: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#        .\scripts\disable_presentation_mode_for_demos.ps1

param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"

$stateFile = Join-Path $RepoRoot "artifacts\demo-presentation-state.json"

Write-Host ""
Write-Host "=== Disable Presentation Mode / Restore Settings ==="
Write-Host ""

if (-not (Test-Path $stateFile)) {
  Write-Host "[WARN] No saved state found at: $stateFile"
  Write-Host "  Run enable_presentation_mode_for_demos.ps1 first, or restore settings manually."
  Write-Host ""
  exit 0
}

$state = Get-Content $stateFile -Raw | ConvertFrom-Json
Write-Host "Restoring state saved at: $($state.savedAt)"
Write-Host ""

# 1. Focus Assist
Write-Host "[1/3] Focus Assist..."
$faKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings"
$faVal = "NOC_GLOBAL_SETTING_TOASTS_ENABLED"
$prevFa = $state.FocusAssist_ToastsEnabled
if ($null -ne $prevFa -and $prevFa -ne "") {
  try {
    Set-ItemProperty -Path $faKey -Name $faVal -Value ([int]$prevFa) -Type DWord -Force
    Write-Host "  [OK] Notifications restored (-> $prevFa)"
  } catch {
    Write-Host "  [WARN] Could not restore Focus Assist: $($_.Exception.Message)"
  }
} else {
  # Default: re-enable toasts
  Set-ItemProperty -Path $faKey -Name $faVal -Value 1 -Type DWord -Force
  Write-Host "  [OK] Notifications re-enabled (no prior value saved, defaulted to 1)"
}

# 2. Screen sleep + screensaver
Write-Host "[2/3] Screen sleep and screensaver..."

# Restore sleep timeout (convert hex string back to decimal minutes)
$prevSleepHex = $state.PowerSleep_AC_prev
if ($prevSleepHex -and $prevSleepHex -ne "") {
  try {
    $prevSleepSec = [Convert]::ToUInt32($prevSleepHex, 16)
    $prevSleepMin = [Math]::Ceiling($prevSleepSec / 60)
    & powercfg /change standby-timeout-ac $prevSleepMin 2>$null
    Write-Host "  [OK] Standby timeout restored to $prevSleepMin min ($prevSleepSec sec)"
  } catch {
    & powercfg /change standby-timeout-ac 30 2>$null
    Write-Host "  [OK] Standby timeout set to 30 min (restore failed, used default)"
  }
} else {
  & powercfg /change standby-timeout-ac 30 2>$null
  Write-Host "  [OK] Standby timeout set to 30 min (no prior value)"
}

# Restore monitor timeout
$prevMonHex = $state.PowerMonitor_AC_prev
if ($prevMonHex -and $prevMonHex -ne "") {
  try {
    $prevMonSec = [Convert]::ToUInt32($prevMonHex, 16)
    $prevMonMin = [Math]::Ceiling($prevMonSec / 60)
    & powercfg /change monitor-timeout-ac $prevMonMin 2>$null
    Write-Host "  [OK] Monitor timeout restored to $prevMonMin min"
  } catch {
    & powercfg /change monitor-timeout-ac 15 2>$null
    Write-Host "  [OK] Monitor timeout set to 15 min (restore failed, used default)"
  }
} else {
  & powercfg /change monitor-timeout-ac 15 2>$null
  Write-Host "  [OK] Monitor timeout set to 15 min (no prior value)"
}

& powercfg /change hibernate-timeout-ac 0 2>$null

# Restore screensaver
$ssKey = "HKCU:\Control Panel\Desktop"
$prevActive = $state.ScreenSaver_Active_prev
$prevSecure = $state.ScreenSaver_Secure_prev
if ($null -ne $prevActive -and $prevActive -ne "") {
  Set-ItemProperty -Path $ssKey -Name "ScreenSaveActive"    -Value "$prevActive" -Force
  Set-ItemProperty -Path $ssKey -Name "ScreenSaverIsSecure" -Value "$prevSecure" -Force
  Write-Host "  [OK] Screensaver restored (active=$prevActive, secure=$prevSecure)"
} else {
  Set-ItemProperty -Path $ssKey -Name "ScreenSaveActive" -Value "0" -Force
  Write-Host "  [OK] Screensaver left disabled (no prior value saved)"
}

# 3. Power plan
Write-Host "[3/3] Power plan..."
$prevGuid = $state.PowerPlan_prev_guid
$prevName = $state.PowerPlan_prev_name
if ($prevGuid -and $prevGuid -ne "") {
  & powercfg /setactive $prevGuid 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Power plan restored to: $prevName ($prevGuid)"
  } else {
    Write-Host "  [WARN] Could not restore power plan GUID $prevGuid -- may have been removed"
  }
} else {
  # Fallback to Balanced
  & powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e 2>$null
  Write-Host "  [OK] Power plan set to Balanced (no prior GUID saved)"
}

Write-Host ""
Write-Host "=== Presentation Mode DISABLED ==="
Write-Host "  Settings restored from: $stateFile"
Write-Host ""
