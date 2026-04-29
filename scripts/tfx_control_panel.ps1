param(
  [string]$Mode = "auto"  # auto | repair | admin | normal | docker
)

$ErrorActionPreference = "Stop"

function Log($m) { Write-Host "[TFX-Control] $m" -ForegroundColor Green }

function IsAdmin {
  ([Security.Principal.WindowsPrincipal]
    [Security.Principal.WindowsIdentity]::GetCurrent()
  ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function GetVSCode {
  $cmd = Get-Command code -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $paths = @(
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe",
    "C:\Program Files\Microsoft VS Code\Code.exe"
  )

  foreach ($p in $paths) {
    if (Test-Path $p) { return $p }
  }

  throw "VS Code not found"
}

function LaunchVSCode($adminMode) {
  $code = GetVSCode
  $cwd = (Get-Location).Path

  if ($adminMode -and -not (IsAdmin)) {
    Log "Launching VS Code as ADMIN"
    Start-Process $code -ArgumentList "`"$cwd`"" -Verb RunAs
  } else {
    Log "Launching VS Code NORMAL"
    Start-Process $code -ArgumentList "`"$cwd`""
  }
}

function RunRepair($adminRequired) {
  if ($adminRequired -and -not (IsAdmin)) {
    Log "Elevating for repair..."
    Start-Process powershell `
      -ArgumentList "-ExecutionPolicy Bypass -File scripts/repair.ps1 -FullRepair" `
      -Verb RunAs
  } else {
    Log "Running repair script..."
    powershell -ExecutionPolicy Bypass -File scripts/repair.ps1 -FullRepair
  }
}

# -------------------------
# MODE SWITCH
# -------------------------

switch ($Mode) {

  "auto" {
    Log "Mode: AUTO"
    if (Test-Path "scripts/repair.ps1") {
      Log "Repair script detected → Admin launch"
      LaunchVSCode $true
    } else {
      LaunchVSCode $false
    }
  }

  "admin" {
    Log "Mode: FORCE ADMIN"
    LaunchVSCode $true
  }

  "normal" {
    Log "Mode: NORMAL"
    LaunchVSCode $false
  }

  "repair" {
    Log "Mode: REPAIR"
    RunRepair $true
  }

  "docker" {
    Log "Mode: DOCKER REPAIR"
    docker compose -f docker/docker-compose.repair.yml up --build
  }

  default {
    Log "Unknown mode"
  }
}

Log "Done."
