$ErrorActionPreference = 'Stop'

$startScript = Join-Path $PSScriptRoot 'start_local_live_stack_windows.ps1'

if (-not (Test-Path $startScript)) {
  throw ('Start script not found: ' + $startScript)
}

Start-Process -FilePath 'powershell.exe' -ArgumentList @(
  '-NoLogo',
  '-NoProfile',
  '-WindowStyle',
  'Hidden',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  $startScript
) -WindowStyle Hidden

Write-Output 'Detached local live stack startup launched.'