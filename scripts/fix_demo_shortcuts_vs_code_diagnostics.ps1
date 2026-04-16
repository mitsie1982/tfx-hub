<#
  Diagnostics and fix script for demo shortcuts and wrappers (VS Code workflows).
  - Confirms each demo responds on the intended port
  - Shows the first 40 lines of each wrapper script
  - Optionally applies the full fix if needed
  Usage:
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    .\scripts\fix_demo_shortcuts_vs_code_diagnostics.ps1
#>

param(
  [string]$RepoRoot = (Get-Location).Path,
  [int]$ContractorPort = 3001,
  [int]$CustomerPort = 3004,
  [int]$AmsPort = 3002,
  [int]$MembersPort = 3003
)

$ErrorActionPreference = 'Stop'

Write-Host "--- Demo Port Diagnostics ---"
$ports = @(
  @{ Name = 'Contractor'; Port = $ContractorPort },
  @{ Name = 'Customer';   Port = $CustomerPort },
  @{ Name = 'AMS';        Port = $AmsPort },
  @{ Name = 'Members';    Port = $MembersPort }
)

foreach ($p in $ports) {
  $url = "http://127.0.0.1:$($p.Port)/api/status"
  Write-Host "\nChecking $($p.Name) on $url ..."
  try {
    $resp = Invoke-RestMethod $url -UseBasicParsing -TimeoutSec 5
    $json = $resp | ConvertTo-Json -Depth 4
    Write-Host "OK: $json"
  } catch {
    Write-Host "ERROR: $($_.Exception.Message)"
  }
}

Write-Host "\n--- Wrapper Script Heads (first 40 lines) ---"
$wrappers = Get-ChildItem (Join-Path $RepoRoot 'scripts') -Filter 'launch_*_wrapper.ps1' -File
foreach ($w in $wrappers) {
  Write-Host "\n=== $($w.FullName) ==="
  Get-Content $w.FullName -TotalCount 40 | ForEach-Object { Write-Host $_ }
}

Write-Host "\nDiagnostics complete. If any demo did not respond or wrappers look wrong, run the main fix script:"
Write-Host ".\\scripts\\fix_demo_shortcuts_vs_code.ps1"
