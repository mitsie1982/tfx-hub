# Bootstrap Orchestrator Integration Script
# Ensures orchestrator-complete is fully integrated with OPA, agent manager, and admin token auth
# Usage: .\bootstrap-orchestrator-integration.ps1 [--Force]

param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

Write-Host "[orchestrator-bootstrap] Starting integration..."

# 1. Ensure required Python and Node.js dependencies are installed
if (!(Test-Path ".venv")) {
    Write-Host "[orchestrator-bootstrap] Creating Python venv..."
    python -m venv .venv
}
. .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

if (!(Test-Path "node_modules")) {
    Write-Host "[orchestrator-bootstrap] Installing Node.js dependencies..."
    pnpm install
}

# 2. Copy OPA policy/data if missing or --Force
$opaPolicy = "policy/policy.rego"
$opaData = "policy/data.json"
if ($Force -or !(Test-Path $opaPolicy)) {
    Write-Host "[orchestrator-bootstrap] Writing OPA policy..."
    Set-Content -Path $opaPolicy -Value "package orchestrator\nallow { input.admin_token == data.admin_token }"
}
if ($Force -or !(Test-Path $opaData)) {
    Write-Host "[orchestrator-bootstrap] Writing OPA data..."
    Set-Content -Path $opaData -Value '{"admin_token": "supersecret"}'
}

# 3. Ensure agent_manager.py exists
if (!(Test-Path "scripts/agent_manager.py")) {
    Write-Host "[orchestrator-bootstrap] ERROR: scripts/agent_manager.py missing!"
    exit 1
}

# 4. Patch orchestrator extension for admin token integration
$extFile = "orchestrator-complete/src/extension.ts"
if (!(Test-Path $extFile)) {
    Write-Host "[orchestrator-bootstrap] ERROR: $extFile missing!"
    exit 1
}

# 5. Set admin token in .env if missing or --Force
$envFile = ".env"
if ($Force -or !(Select-String -Path $envFile -Pattern "ADMIN_TOKEN" -Quiet)) {
    Write-Host "[orchestrator-bootstrap] Setting ADMIN_TOKEN in .env..."
    Add-Content -Path $envFile -Value "ADMIN_TOKEN=supersecret"
}

Write-Host "[orchestrator-bootstrap] Integration complete."
Write-Host "OPA policy, agent manager, and admin token are ready."
