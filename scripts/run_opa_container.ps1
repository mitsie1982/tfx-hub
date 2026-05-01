#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'
if ($PSScriptRoot) {
  $tmpArr = @(Join-Path $PSScriptRoot '..' 'policies' | Resolve-Path -ErrorAction SilentlyContinue | ForEach-Object { $_.Path })
  $policies = if ($tmpArr.Count -gt 0) { $tmpArr[0] } else { Join-Path $PSScriptRoot 'policies' }
} else {
  $try1 = Join-Path (Get-Location) 'policies'
  if (Test-Path $try1) { $policies = $try1 }
  else {
    $tmp2 = Resolve-Path '../policies' -ErrorAction SilentlyContinue
    $policies = if ($tmp2) { $tmp2.Path } else { $null }
  }
}
if (-not $policies -or -not (Test-Path $policies)) {
  Write-Host 'Policies directory not found.' -ForegroundColor Red
  exit 1
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host 'Docker is not installed or not in PATH.' -ForegroundColor Red
  exit 1
}
Write-Host "Running OPA container with policies from $policies..."
docker run --rm -p 8181:8181 -v "${policies}:/policies" openpolicyagent/opa:latest run --server --set=decision_logs.console=true /policies
