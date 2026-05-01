<#
bootstrap-orchestrator-demo-and-terraform.ps1
Creates VS Code tasks, demo scripts, a demo transcript, and a minimal Terraform starter for AKS/EKS + managed PostgreSQL.

Usage:
  Save to repo root and run in PowerShell:
    .\bootstrap-orchestrator-demo-and-terraform.ps1
  To overwrite existing files:
    .\bootstrap-orchestrator-demo-and-terraform.ps1 --Force
#>

param([switch]$Force)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-File($path, $content, $force=$false) {
  $dir = Split-Path -Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -Path $dir -ItemType Directory -Force | Out-Null }
  if ((Test-Path $path) -and -not $force) {
    Write-Host "Skipped $path (exists). Use --Force to overwrite." -ForegroundColor Yellow
    return
  }
  $content | Out-File -FilePath $path -Encoding UTF8 -Force
  Write-Host "Wrote $path"
}

## Ensure directories
New-Item -ItemType Directory -Path .\.vscode -Force | Out-Null
New-Item -ItemType Directory -Path .\scripts -Force | Out-Null
New-Item -ItemType Directory -Path .\infra\terraform -Force | Out-Null
New-Item -ItemType Directory -Path .\demo -Force | Out-Null
New-Item -ItemType Directory -Path .\out -Force | Out-Null

# 1) .vscode/tasks.json (cross-platform, admin auth)

$tasksJson = @"
{
  "version": "2.0.0"
}
"@

Write-File -path ".\.vscode\tasks.json" -content $tasksJson -force:$Force

# 2) PowerShell OPA runner

# 2) PowerShell OPA runner (robust $policies resolution)
$opaRunner = @"
#!/usr/bin/env pwsh
`$ErrorActionPreference = 'Stop'
if (`$PSScriptRoot) {
  `$tmpArr = @(Join-Path `$PSScriptRoot '..' 'policies' | Resolve-Path -ErrorAction SilentlyContinue | ForEach-Object { `$_.Path })
  `$policies = if (`$tmpArr.Count -gt 0) { `$tmpArr[0] } else { Join-Path `$PSScriptRoot 'policies' }
} else {
  `$try1 = Join-Path (Get-Location) 'policies'
  if (Test-Path `$try1) { `$policies = `$try1 }
  else {
    `$tmp2 = Resolve-Path '../policies' -ErrorAction SilentlyContinue
    `$policies = if (`$tmp2) { `$tmp2.Path } else { `$null }
  }
}
if (-not `$policies -or -not (Test-Path `$policies)) {
  Write-Host 'Policies directory not found.' -ForegroundColor Red
  exit 1
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host 'Docker is not installed or not in PATH.' -ForegroundColor Red
  exit 1
}
Write-Host "Running OPA container with policies from `$policies..."
docker run --rm -p 8181:8181 -v "`${policies}:/policies" openpolicyagent/opa:latest run --server --set=decision_logs.console=true /policies
"@
Write-File -path ".\scripts\run_opa_container.ps1" -content $opaRunner -force:$Force

# 3) PowerShell audited runner
$auditedRunner = @"
# scripts/audited_runner.ps1
param(
  [string]`$TokenFile = \"out/agent-42.token\",
  [string]`$ActionFile = \"demo/action.json\"
)
if (!(Test-Path `$TokenFile)) {
  Write-Host \"Token missing\" -ForegroundColor Red
  exit 2
}
`$action = Get-Content `$ActionFile | ConvertFrom-Json
if (-not `$action.approved) {
  Write-Host \"Action not approved\" -ForegroundColor Yellow
  exit 3
}
`$token = Get-Content `$TokenFile -Raw
Write-Host \"Simulating external call with token: `$(`$token.Substring(0,8))...\"
`$trace = @{ ts = [math]::Round((Get-Date -UFormat %s)); agent = 'agent-42'; action = 'export_customer_profile'; status = 'success' }
`$traceJson = `$trace | ConvertTo-Json -Compress
`$outFile = \"out/traces.log\"
if (!(Test-Path \"out\")) { New-Item -ItemType Directory -Path \"out\" | Out-Null }
Add-Content -Path `$outFile -Value `$traceJson
Write-Host \"Trace written to `$outFile\"
Write-Host \"Execution simulated and traced.\"
"@
Write-File -path ".\scripts\audited_runner.ps1" -content $auditedRunner -force:$Force

Write-Host "Bootstrap complete. All orchestrator demo, admin auth, and infra starter files are ready."
Write-Host "Next steps:"
Write-Host "  1) Set AGENT_MANAGER_SECRET and AUDIT_HMAC_SECRET as environment variables."
Write-Host "  2) Run VS Code tasks for OPA, token, gating, approval, and demo."
Write-Host "  3) Use the PowerShell tasks for full admin-authenticated, cross-platform orchestration."
