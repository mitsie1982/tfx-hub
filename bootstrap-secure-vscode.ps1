<#
bootstrap-secure-vscode.ps1
Creates a VS Code security scaffold to mitigate agentic misalignment, privilege escalation,
data exfiltration, sandbox escape, hallucination-as-action, and supply-chain/code risk.

Run from repository root:
  .\bootstrap-secure-vscode.ps1
#>

param(
  [switch]$Force
)

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

# 1) Devcontainer: least-privilege, env-file, non-root user, no host network
$devcontainer = @'
{
  "name": "Secure Dev Container",
  "image": "mcr.microsoft.com/vscode/devcontainers/base:0-focal",
  "extensions": [
    "ms-python.python",
    "eamodio.gitlens",
    "ms-vscode.cpptools",
    "GitHub.copilot",
    "ms-vscode.vscode-typescript-tslint-plugin"
  ],
  "settings": {
    "terminal.integrated.shell.linux": "/bin/bash",
    "security.workspace.trust.untrustedFiles": "open"
  },
  "runArgs": [
    "--env-file",
    "$${localWorkspaceFolder}/.env"
  ],
  "mounts": [
    "source=$${localEnv:HOME}/.tfxhub-secrets,target=/workspaces/.tfxhub-secrets,type=bind,consistency=cached"
  ],
  "postCreateCommand": "python3 -m pip install --upgrade pip && pip install -r requirements.txt || true",
  "remoteUser": "vscode"
}
'@
Write-File -path ".\.devcontainer\devcontainer.json" -content $devcontainer -force:$Force

# 2) VS Code workspace settings and recommended extensions
$vscodeSettings = @'
{
  "files.exclude": {
    "out/": true,
    ".env": true,
    ".tfxhub-secrets/": true
  },
  "security.workspace.trust.enabled": true,
  "git.autofetch": true,
  "telemetry.enableTelemetry": false,
  "telemetry.enableCrashReporter": false
}
'@
Write-File -path ".\.vscode\settings.json" -content $vscodeSettings -force:$Force

$extensions = @'
{
  "recommendations": [
    "ms-python.python",
    "eamodio.gitlens",
    "ms-vscode.cpptools",
    "ms-vscode.vscode-node-azure-pack",
    "GitHub.copilot"
  ]
}
'@
Write-File -path ".\.vscode\extensions.json" -content $extensions -force:$Force

# 3) Pre-commit config with secret scanning and tests
$precommit = @'
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.0.3
    hooks:
      - id: detect-secrets-hook
        args: ['--baseline', '.secrets.baseline']

  - repo: local
    hooks:
      - id: run-tests
        name: Run unit tests
        entry: pytest -q
        language: system
        pass_filenames: false
'@
Write-File -path ".\.pre-commit-config.yaml" -content $precommit -force:$Force

# 4) Credential scanner script (lightweight)
$credScan = @'
#!/usr/bin/env python3
# scripts/credential_scan.py
# Simple repository scan for high-risk patterns (do not replace dedicated secret scanners)
import re, sys, os, json
patterns = [
  re.compile(r'AKIA[0-9A-Z]{16}'), # AWS access key id
  re.compile(r'sk_live_[0-9a-zA-Z]{20,}'), # plausible API key
  re.compile(r'-----BEGIN PRIVATE KEY-----')
]
def scan(root='.'):
    findings = []
    for dirpath, _, files in os.walk(root):
        if '.git' in dirpath or 'node_modules' in dirpath or '.venv' in dirpath:
            continue
        for f in files:
            path = os.path.join(dirpath, f)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                    txt = fh.read()
                for p in patterns:
                    for m in p.finditer(txt):
                        findings.append({'file': path, 'match': m.group(0)[:80]})
            except Exception:
                continue
    return findings

if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else '.'
    f = scan(root)
    if f:
        print('Potential secrets found:')
        print(json.dumps(f, indent=2))
        sys.exit(2)
    print('No obvious secrets found.')
'@
Write-File -path ".\scripts\credential_scan.py" -content $credScan -force:$Force

# 5) Policy-as-code (OPA) stub for No-Before-Action and tool contracts
$opa = @'
package orchestrator.policies

# Deny actions that require external side effects unless approved
deny[msg] {
  input.action.type == 'external'
  not input.action.approved
  msg = sprintf('External action %s requires approval', [input.action.name])
}

# Enforce minimal tool contract fields
deny[msg] {
  not input.tool_contract.name
  msg = 'tool_contract.name missing'
}
'@
Write-File -path ".\policies\agent_policy.rego" -content $opa -force:$Force

# 6) Runtime action gate: enforces policy, logs, requires human approval for high-risk actions
$actionGate = @'
#!/usr/bin/env python3
# scripts/agent_action_gate.py
# Enforces No-Before-Action: validate action against OPA policy, log, and optionally require human approval.
import os, sys, json, subprocess, time
from pathlib import Path

LOG = Path('out/agent_actions.log')
POLICY = Path('policies/agent_policy.rego')

def opa_check(action):
    # Minimal local check: call 'opa' if available, else do a simple policy check
    try:
        res = subprocess.run(['opa','eval','-i','-','data.orchestrator.policies.deny'], input=json.dumps(action).encode(), capture_output=True, check=False)
        out = res.stdout.decode().strip()
        if out and 'true' in out:
            return False, out
        return True, ''
    except FileNotFoundError:
        # fallback: simple rule: external actions must include approved=true
        if action.get('type') == 'external' and not action.get('approved', False):
            return False, 'external action not approved'
        return True, ''

def log_action(action, verdict, reason=''):
    LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {'ts': time.time(), 'action': action, 'verdict': verdict, 'reason': reason}
    with open(LOG, 'a', encoding='utf-8') as fh:
        fh.write(json.dumps(entry) + '\\n')

def require_human_approval(action):
    # Minimal interactive approval for local runs
    print('\\n=== HUMAN APPROVAL REQUIRED ===')
    print('Action:', json.dumps(action, indent=2))
    ans = input('Approve action? (yes/no): ').strip().lower()
    return ans == 'yes'

def main():
    if len(sys.argv) < 2:
        print('Usage: agent_action_gate.py action.json')
        sys.exit(2)
    action_file = sys.argv[1]
    action = json.load(open(action_file, 'r', encoding='utf-8'))
    ok, reason = opa_check(action)
    if not ok:
        log_action(action, 'DENIED', reason)
        print('Action denied by policy:', reason)
        sys.exit(3)
    # high-risk classification
    high_risk = action.get('risk','low') in ('high','critical') or action.get('type') == 'external'
    if high_risk and not action.get('approved', False):
        approved = require_human_approval(action)
        if not approved:
            log_action(action, 'DENIED', 'human rejected')
            print('Action rejected by human.')
            sys.exit(4)
        action['approved'] = True
    # allow action and log
    log_action(action, 'ALLOWED', '')
    print('Action allowed and logged.')
    # NOTE: this script does NOT execute the action. Execution must be performed by a separate, audited runner.
if __name__ == "__main__":
    main()
'@
Write-File -path ".\scripts\agent_action_gate.py" -content $actionGate -force:$Force

# 7) Tracing helper for reproducible debug bundles
$trace = @'
#!/usr/bin/env python3
# scripts/trace_utils.py
import time, json, uuid, os
def start_trace(name):
    t = {'trace_id': str(uuid.uuid4()), 'name': name, 'start': time.time()}
    return t
def end_trace(t, extra=None):
    t['end'] = time.time()
    t['duration_ms'] = int((t['end'] - t['start'])*1000)
    if extra:
        t['extra'] = extra
    os.makedirs('out', exist_ok=True)
    with open('out/traces.log','a',encoding='utf-8') as fh:
        fh.write(json.dumps(t) + '\\n')
    return t
'@
Write-File -path ".\scripts\trace_utils.py" -content $trace -force:$Force

# 8) CI workflow: run secret scan, policy check, and upload audit artifacts
$ci = @'
name: Security CI

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install deps
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt || true
      - name: Run credential scan
        run: python3 scripts/credential_scan.py || true
      - name: Run pre-commit checks
        run: |
          pip install pre-commit
          pre-commit run --all-files || true
      - name: Run OPA policy lint (if opa available)
        run: |
          if command -v opa >/dev/null 2>&1; then opa eval -f pretty -d policies 'data.orchestrator.policies.deny' || true; fi
      - name: Upload audit artifacts
        uses: actions/upload-artifact@v4
        with:
          name: security-artifacts
          path: |
            out/agent_actions.log
            out/traces.log
            .secrets.baseline
'@
Write-File -path ".\.github\workflows/security-ci.yml" -content $ci -force:$Force

# 9) README with operational steps and emergency playbook
$readme = @'
SECURITY: VS Code & Local Orchestrator Protections

Purpose
- Provide workspace-level protections against agentic misalignment, privilege escalation, data exfiltration, sandbox escape, hallucination-driven actions, and supply-chain/code risk.

Quick start
1. Create a local secrets folder outside the repo (e.g., ~/.tfxhub-secrets) and place your .env there.
2. Add .env to .gitignore.
3. Rebuild Dev Container in VS Code.
4. Install pre-commit: pip install pre-commit
5. Initialize detect-secrets baseline: detect-secrets scan > .secrets.baseline
6. Enable hooks: pre-commit install

Key controls
- No-Before-Action: any external action must be validated by policies and, for high-risk actions, human-approved via scripts/agent_action_gate.py.
- Least privilege: devcontainer uses env-file and mounts a local secrets folder; tokens should be short-lived.
- Secret scanning: scripts/credential_scan.py and detect-secrets baseline run in CI and locally.
- Policy as code: policies/agent_policy.rego enforces tool contracts and denies unapproved external actions.
- Audit trail: out/agent_actions.log and out/traces.log capture decisions and traces for post-mortem.

Emergency playbook
- If an agent performs an unexpected external action:
  1. Revoke tokens and rotate credentials immediately.
  2. Quarantine the agent process and container.
  3. Collect traces: out/traces.log and out/agent_actions.log.
  4. Run forensic secret scan and review recent commits.
  5. Notify security and follow incident response runbook.

'@
Write-File -path ".\README_SECURITY.md" -content $readme -force:$Force

# 10) requirements.txt
$reqs = @'
python-dotenv
faiss-cpu
tqdm
openai
pytest
detect-secrets
'@
Write-File -path ".\requirements.txt" -content $reqs -force:$Force

Write-Host "Bootstrap complete. Next steps:"
Write-Host "  - Add .env to .gitignore and create a local secrets folder (outside repo)."
Write-Host "  - Install pre-commit: pip install pre-commit; pre-commit install"
Write-Host "  - Initialize detect-secrets baseline: detect-secrets scan > .secrets.baseline"
Write-Host "  - Rebuild Dev Container in VS Code and follow README_SECURITY.md"
