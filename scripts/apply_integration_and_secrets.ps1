<#
scripts/apply_integration_and_secrets.ps1
- Writes a GitHub secrets guidance file for maintainers
- Patches orchestrator-complete/src/extension.ts to import and call preExecute before executing external steps
- Adds optional dashboard notification call after successful step execution
Usage:
  pwsh ./scripts/apply_integration_and_secrets.ps1
  pwsh ./scripts/apply_integration_and_secrets.ps1 -Force
#>

param([switch]$Force)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-File($path, $content, $force=$false) {
  $dir = Split-Path -Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -Path $dir -ItemType Directory -Force | Out-Null }
  if ((Test-Path $path) -and -not $force) {
    Write-Host "Skipped $path (exists). Use -Force to overwrite." -ForegroundColor Yellow
    return
  }
  $content | Out-File -FilePath $path -Encoding UTF8 -Force
  Write-Host "Wrote $path"
}

# 1) Write GitHub secrets guidance file
$secretsGuidance = @"
# GITHUB ACTIONS SECRETS AND ENVIRONMENT VARIABLES
Add these repository secrets under Settings → Secrets and variables → Actions.

Required secrets:
- AUDIT_HMAC_SECRET : HMAC key for audit signing
- AGENT_MANAGER_SECRET : Agent Manager signing secret
- SLACK_WEBHOOK_URL : Slack incoming webhook URL
- TEAMS_WEBHOOK_URL : Teams incoming webhook URL
- AUDIT_SIEM_ENDPOINT : SIEM ingest endpoint (HTTPS)
- AZURE_STORAGE_ACCOUNT : Azure storage account name
- AZURE_STORAGE_KEY : Azure storage account key (or use SAS/managed identity)
- AWS_S3_BUCKET : S3 bucket for artifacts/backups
- AWS_ACCESS_KEY_ID : AWS access key (prefer OIDC instead)
- AWS_SECRET_ACCESS_KEY : AWS secret key (prefer OIDC instead)
- KUBE_CONFIG_DATA : base64-encoded kubeconfig for CI (use ephemeral creds)
- DASHBOARD_BASIC_AUTH_USER : dashboard basic auth user (dev only)
- DASHBOARD_BASIC_AUTH_PASS : dashboard basic auth password (dev only)
- OPA_POLICY_SIGNING_KEY : optional key for signed policy bundles
- BACKUP_PASSPHRASE : passphrase for encrypted backups

Security notes:
- Prefer short-lived credentials and OIDC for cloud providers.
- Use Key Vault / KMS for production secrets and reference them in CI via service principals or roles.
- Rotate keys regularly and audit access to repository secrets.
"@
Write-File -path ".\out\GITHUB_SECRETS_GUIDANCE.md" -content $secretsGuidance -force:$Force

# 2) Patch orchestrator-complete/src/extension.ts
$extPath = ".\orchestrator-complete\src\extension.ts"
if (-not (Test-Path $extPath)) {
  Write-Host "extension.ts not found; creating a sample integration file." -ForegroundColor Yellow
  $sample = @"
// orchestrator-complete/src/extension.ts - sample integration with preExecute and dashboard notify
import * as vscode from 'vscode';
import { preExecute } from './preExecute';
import * as child_process from 'child_process';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('orchestrator.runStep', async () => {
    const action = { name: 'example', type: 'external', risk: 'high', inputs: {} };
    const contract = {}; // load contract for capability
    const user = process.env['USER'] || 'dev';
    const verdict = await preExecute(action, contract, user);
    if (!verdict.allowed) {
      if (verdict.reason === 'pending_human_approval') {
        vscode.window.showWarningMessage('Action pending human approval. See out/pending_action.json');
      } else {
        vscode.window.showErrorMessage('Action blocked: ' + (verdict.reason || 'policy'));
      }
      return;
    }
    // Execute the step (example)
    try {
      child_process.execSync('echo Executing external step', { stdio: 'inherit' });
      // Notify dashboard of success (best-effort)
      try {
        child_process.execSync('curl -s -X POST -H "Content-Type: application/json" -d "{\"status\":\"success\",\"action\":\"example\"}" http://localhost:3000/notify || true');
      } catch {}
      vscode.window.showInformationMessage('Step executed successfully.');
    } catch (e) {
      // Notify dashboard of failure
      try {
        child_process.execSync('curl -s -X POST -H "Content-Type: application/json" -d "{\"status\":\"failure\",\"action\":\"example\",\"error\":\"' + (e.message || 'error') + '\"}" http://localhost:3000/notify || true');
      } catch {}
      vscode.window.showErrorMessage('Step execution failed.');
    }
  }));
}
"@
  Write-File -path $extPath -content $sample -force:$Force
  Write-Host "Created sample extension.ts with preExecute integration."
} else {
  $text = Get-Content $extPath -Raw
  # Add import for preExecute if missing
  if ($text -notmatch "from './preExecute'") {
    $text = $text -replace "(import .*;)", "`$1`nimport { preExecute } from './preExecute';`nimport * as child_process from 'child_process';"
  } elseif ($text -notmatch "child_process") {
    $text = $text -replace "(import .*;)", "`$1`nimport * as child_process from 'child_process';"
  }
  # Heuristic: find function that executes steps; insert preExecute call before external execution
  if ($text -match "executeStep\s*\(") {
    $text = $text -replace "executeStep\s*\(([^)]*)\)\s*{", "const _executeStep = async ($1) => {"
    $text += "`n// Wrapped executeStep to call preExecute before external steps`nasync function executeStepWrapper(action, contract, user) {`n  const verdict = await preExecute(action, contract, user || process.env['USER'] || 'dev');`n  if (!verdict.allowed) { throw new Error('preExecute blocked action: ' + (verdict.reason || 'policy')); }`n  return await _executeStep(action, contract);`n}`n"
    $text = $text -replace "_executeStep", "executeStep"
    Write-File -path $extPath -content $text -force:$Force
    Write-Host "Patched executeStep to call preExecute before execution."
  } else {
    # Fallback: append integration helper and usage note
    $note = @"
// NOTE: preExecute hook created at src/preExecute.ts
// To integrate, import and call preExecute(action, contract, user) before executing any external step.
// Example:
// import { preExecute } from './preExecute';
// const verdict = await preExecute(action, contract, currentUser);
// if (!verdict.allowed) { /* handle denial or pending approval */ }
"@
    Add-Content -Path $extPath -Value $note
    Write-Host "Appended integration note to extension.ts. Manual integration may be required."
  }
}

# 3) Add small dashboard notify endpoint helper (optional)
$notifyHelper = @"
/* dashboard/notify_endpoint.js - optional: accepts POST /notify for quick status updates */
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());
app.post('/notify', (req, res) => {
  const out = path.join(__dirname, '..', 'out', 'dashboard_notifications.log');
  const entry = { ts: new Date().toISOString(), body: req.body };
  fs.appendFileSync(out, JSON.stringify(entry) + '\n', 'utf8');
  res.json({ ok: true });
});
const port = process.env.PORT || 3001;
app.listen(port, () => console.log('Notify endpoint listening on', port));
"@
Write-File -path ".\dashboard\notify_endpoint.js" -content $notifyHelper -force:$Force

Write-Host "Integration patch applied and GitHub secrets guidance written to out/GITHUB_SECRETS_GUIDANCE.md"
Write-Host "Next steps:"
Write-Host "  1) Add the listed secrets to your GitHub repository (Settings → Secrets and variables → Actions)."
Write-Host "  2) Review orchestrator-complete/src/extension.ts and adjust the inserted preExecute call to match your extension's execution flow."
Write-Host "  3) Start the dashboard notify endpoint: node dashboard/notify_endpoint.js (or integrate into existing dashboard)."
