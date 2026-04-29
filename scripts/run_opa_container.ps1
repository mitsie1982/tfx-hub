#!/usr/bin/env pwsh
Stop = 'Stop'
$policies = if ($PSScriptRoot) { Join-Path $PSScriptRoot '..' 'policies' | Resolve-Path | ForEach-Object { $_.Path } } else { Join-Path (Get-Location) 'policies' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host 'Docker is not installed or not in PATH.' -ForegroundColor Red
  exit 1
}
Write-Host "Running OPA container with policies from $policies..."
# Suppress linter false positive: correct PowerShell interpolation
# shellcheck disable=SC2086
docker run --rm -p 8181:8181 -v "$($policies):/policies" openpolicyagent/opa:latest run --server --set=decision_logs.console=true /policies
