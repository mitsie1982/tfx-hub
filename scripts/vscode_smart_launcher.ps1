param(
  [string]$WorkspacePath = (Get-Location).Path,
  [switch]$ForceAdmin,
  [switch]$ForceNormal
)

$ErrorActionPreference = "Stop"

function Log($msg) {
  Write-Host "[SmartLauncher] $msg" -ForegroundColor Cyan
}

function IsAdmin {
  return ([Security.Principal.WindowsPrincipal] 
    [Security.Principal.WindowsIdentity]::GetCurrent()
  ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function NeedsAdmin {
  # Define triggers that REQUIRE admin
  $adminIndicators = @(
    "repair",
    "restore",
    "sfc",
    "dism",
    "docker",
    "registry"
  )

  foreach ($indicator in $adminIndicators) {
    if ($WorkspacePath.ToLower().Contains($indicator)) {
      return $true
    }
  }

  # Check if scripts folder contains repair scripts
  $repairScript = Join-Path $WorkspacePath "scripts\repair.ps1"
  if (Test-Path $repairScript) {
    return $true
  }

  return $false
}

function GetVSCodePath {
  $codeCmd = Get-Command code -ErrorAction SilentlyContinue

  if ($codeCmd) {
    return $codeCmd.Source
  }

  $fallbacks = @(
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe",
    "C:\Program Files\Microsoft VS Code\Code.exe"
  )

  foreach ($path in $fallbacks) {
    if (Test-Path $path) {
      return $path
    }
  }

  throw "VS Code executable not found."
}

# -------------------------------
# MAIN EXECUTION
# -------------------------------

Log "Starting VS Code Smart Launcher"

$codeExe = GetVSCodePath
$admin = IsAdmin

Log "Current Admin Status: $admin"

# Override logic
if ($ForceAdmin) {
  $shouldElevate = $true
  Log "ForceAdmin flag detected"
}
elseif ($ForceNormal) {
  $shouldElevate = $false
  Log "ForceNormal flag detected"
}
else {
  $shouldElevate = NeedsAdmin
  Log "Auto-detection result: NeedsAdmin = $shouldElevate"
}

# Decision
if ($shouldElevate -and -not $admin) {
  Log "Launching VS Code as ADMIN..."
  
  Start-Process -FilePath $codeExe `
    -ArgumentList "`"$WorkspacePath`"" `
    -Verb RunAs

} else {
  Log "Launching VS Code in NORMAL mode..."

  Start-Process -FilePath $codeExe `
    -ArgumentList "`"$WorkspacePath`""
}

Log "Done."
