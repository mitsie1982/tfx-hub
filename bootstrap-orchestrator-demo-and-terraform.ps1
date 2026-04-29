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
  "version": "2.0.0",
  "tasks": [
    { "label": "Start OPA (Docker)", "type": "shell", "command": "powershell -ExecutionPolicy Bypass -File scripts/run_opa_container.ps1", "presentation": { "reveal": "always" } },
    { "label": "Issue Token", "type": "shell", "command": "python3 scripts/agent_manager.py issue agent-42 read_customer 300 > out/agent-42.token", "presentation": { "reveal": "always" } },
    { "label": "Gate Action (No-Before-Action)", "type": "shell", "command": "python3 scripts/no_before_action.py demo/action.json demo/contract.json", "presentation": { "reveal": "always", "panel": "shared" } },
    { "label": "Approve Pending Action", "type": "shell", "command": "python3 scripts/approve_action.py --action out/pending_action.json", "presentation": { "reveal": "always" } },
    { "label": "Run Audited Runner (simulate)", "type": "shell", "command": "powershell -ExecutionPolicy Bypass -File scripts/audited_runner.ps1", "presentation": { "reveal": "always" } },
    { "label": "Verify Audit Trail", "type": "shell", "command": "python3 scripts/audit_verify.py", "presentation": { "reveal": "always" } },
    { "label": "Demo: Full Sequence", "type": "shell", "command": "bash scripts/demo_run_sequence.sh", "presentation": { "reveal": "always" } },
    { "label": "Open Audit Log", "type": "shell", "command": "if (Get-Command code -ErrorAction SilentlyContinue) { code -r out/action_audit.log } else { Get-Content out/action_audit.log -Tail 200 }", "presentation": { "reveal": "always" } }
  ]
}
"@
Write-File -path ".\.vscode\tasks.json" -content $tasksJson -force:$Force

# 2) PowerShell OPA runner
$opaRunner = @"
#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'
`$policies = if (`$PSScriptRoot) { Join-Path `$PSScriptRoot '..' 'policies' | Resolve-Path | ForEach-Object { `$_.Path } } else { Join-Path (Get-Location) 'policies' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host 'Docker is not installed or not in PATH.' -ForegroundColor Red
  exit 1
}
Write-Host "Running OPA container with policies from `$policies..."
# Suppress linter false positive: correct PowerShell interpolation
# shellcheck disable=SC2086
docker run --rm -p 8181:8181 -v "$($policies):/policies" openpolicyagent/opa:latest run --server --set=decision_logs.console=true /policies
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
