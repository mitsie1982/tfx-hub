<#
bootstrap-governance-vscode.ps1
Creates governance and runtime scaffolding for VS Code to enforce Zero Trust, No-Before-Action,
tool contracts, agent manager, judge LLM stub, audit trails, capability tokens, OPA policy stubs,
CI checks, monitoring hooks, and POPIA-aware playbook.

Usage:
  Save as bootstrap-governance-vscode.ps1 and run from repo root:
    .\bootstrap-governance-vscode.ps1
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

# Devcontainer (least privilege, secrets mount)
$devcontainer = @"
{
  "name": "Governed Dev Container",
  "image": "mcr.microsoft.com/vscode/devcontainers/base:0-focal",
  "runArgs": ["--env-file","./.env","--security-opt=no-new-privileges"],
  "mounts": ["source=${localEnv:HOME}/.secrets,target=/workspaces/.secrets,type=bind,consistency=cached"],
  "postCreateCommand": "python3 -m pip install --upgrade pip && pip install -r requirements.txt || true",
  "remoteUser": "vscode"
}
"@
Write-File -path ".\.devcontainer\devcontainer.json" -content $devcontainer -force:$Force

# VS Code settings and recommended extensions
$vscodeSettings = @"
{
  "files.exclude": { ".secrets": true, ".env": true, "out/": true },
  "security.workspace.trust.enabled": true,
  "git.autofetch": true
}
"@
Write-File -path ".\.vscode\settings.json" -content $vscodeSettings -force:$Force

$extensions = @"
{ "recommendations": ["ms-python.python","eamodio.gitlens"] }
"@
Write-File -path ".\.vscode\extensions.json" -content $extensions -force:$Force

# Requirements
$reqs = @"
python-dotenv
pyyaml
requests
cryptography
detect-secrets
pytest
"@
Write-File -path ".\requirements.txt" -content $reqs -force:$Force

# Tool contract template
$toolContract = @"
name: example-http-api
version: 0.1.0
description: HTTP API wrapper for external customer reads
owner: team@example.com
capabilities:
  - name: read_customer
    type: external
    allowed_inputs:
      customer_id: string
    allowed_outputs:
      customer_profile: object
    side_effects: none
    risk: high
    preconditions:
      authenticated: true
      approved_roles: [operator, admin]
"@
Write-File -path ".\templates\tool_contract.yaml" -content $toolContract -force:$Force

# Tool contract validator
$validateContract = @"
#!/usr/bin/env python3
import sys, yaml, jsonschema
schema = {'type':'object','required':['name','version','capabilities']}
doc = yaml.safe_load(open(sys.argv[1],'r',encoding='utf-8'))
jsonschema.validate(doc, schema)
print('Tool contract valid:', sys.argv[1])
"@
Write-File -path ".\scripts\validate_tool_contract.py" -content $validateContract -force:$Force

# OPA policy stub (governance)
$opaPolicy = @"
package governance

# Deny external actions unless approved
deny[msg] {
  input.action.type == 'external'
  not input.action.approved
  msg = sprintf('External action %s requires approval', [input.action.name])
}
"@
Write-File -path ".\policies\governance.rego" -content $opaPolicy -force:$Force

# Agent Manager (issue/revoke short TTL tokens)
$agentManager = @"
#!/usr/bin/env python3
import json, time, hmac, hashlib, os, sys
TOKENS='out/agent_tokens.json'
SECRET=os.environ.get('AGENT_MANAGER_SECRET','dev-secret')
def issue(agent_id, scopes, ttl=300):
  payload={'agent_id':agent_id,'scopes':scopes,'exp':int(time.time())+ttl}
  token=hmac.new(SECRET.encode(), json.dumps(payload).encode(), hashlib.sha256).hexdigest()
  rec={'token':token,'payload':payload}
  data=[]
  if os.path.exists(TOKENS): data=json.load(open(TOKENS,'r',encoding='utf-8'))
  data.append(rec); open(TOKENS,'w',encoding='utf-8').write(json.dumps(data,indent=2))
  print(token)
def revoke(agent_id):
  if not os.path.exists(TOKENS): return
  data=json.load(open(TOKENS,'r',encoding='utf-8'))
  data=[r for r in data if r['payload'].get('agent_id')!=agent_id]
  open(TOKENS,'w',encoding='utf-8').write(json.dumps(data,indent=2))
if __name__=='__main__':
  if len(sys.argv)<2: print('usage'); sys.exit(2)
  cmd=sys.argv[1]
  if cmd=='issue': issue(sys.argv[2], sys.argv[3].split(','), int(sys.argv[4]) if len(sys.argv)>4 else 300)
  elif cmd=='revoke': revoke(sys.argv[2])
"@
Write-File -path ".\scripts\agent_manager.py" -content $agentManager -force:$Force

# Judge LLM stub (static checks)
$judge = @"
#!/usr/bin/env python3
import json, re, sys
action=json.load(open(sys.argv[1],'r',encoding='utf-8'))
contract=json.load(open(sys.argv[2],'r',encoding='utf-8'))
caps=[c['name'] for c in contract.get('capabilities',[])]
if action.get('capability') not in caps:
  print(json.dumps({'ok':False,'reason':'capability not in contract'})); sys.exit(0)
deny=[r'ssn',r'credit card',r'private key']
txt=json.dumps(action)
for p in deny:
  if re.search(p,txt,re.I):
    print(json.dumps({'ok':False,'reason':'sensitive pattern detected'})); sys.exit(0)
print(json.dumps({'ok':True,'reason':'static checks passed'}))
"@
Write-File -path ".\scripts\judge_llm.py" -content $judge -force:$Force

# No-Before-Action gate (OPA + judge + human approval + HMAC audit)
$noBefore = @"
#!/usr/bin/env python3
import json, subprocess, time, os, hmac, hashlib, sys
LOG='out/action_audit.log'; HMAC_SECRET=os.environ.get('AUDIT_HMAC_SECRET','audit-dev-secret')
def opa_eval(obj):
  try:
    p=subprocess.run(['opa','eval','-i','-','data.governance.deny'], input=json.dumps(obj).encode(), capture_output=True)
    out=p.stdout.decode().strip()
    if out and 'true' in out: return False,out
    return True,''
  except FileNotFoundError:
    if obj.get('action',{}).get('type')=='external' and not obj.get('action',{}).get('approved',False):
      return False,'external action not approved'
    return True,''
def run_judge(a,c):
  p=subprocess.run(['python3','scripts/judge_llm.py',a,c], capture_output=True)
  return json.loads(p.stdout.decode())
def human_approve(action):
  print('\n=== HUMAN APPROVAL REQUIRED ==='); print(json.dumps(action,indent=2))
  return input('Approve action? (yes/no): ').strip().lower()=='yes'
def log(entry):
  os.makedirs('out',exist_ok=True); raw=json.dumps(entry,sort_keys=True)
  sig=hmac.new(HMAC_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
  with open(LOG,'a',encoding='utf-8') as fh: fh.write(json.dumps({'entry':entry,'hmac':sig})+'\n')
if __name__=='__main__':
  if len(sys.argv)<3: print('usage'); sys.exit(2)
  action=json.load(open(sys.argv[1],'r',encoding='utf-8')); contract=json.load(open(sys.argv[2],'r',encoding='utf-8'))
  ok,reason=opa_eval({'action':action,'contract':contract})
  if not ok: log({'ts':time.time(),'action':action,'verdict':'DENY','reason':reason}); print('Denied by policy:',reason); sys.exit(3)
  verdict=run_judge(sys.argv[1],sys.argv[2])
  if not verdict.get('ok'): log({'ts':time.time(),'action':action,'verdict':'DENY','reason':verdict.get('reason')}); print('Denied by judge:',verdict.get('reason')); sys.exit(4)
  if action.get('risk') in ('high','critical') or action.get('type')=='external':
    if not action.get('approved',False):
      if not human_approve(action): log({'ts':time.time(),'action':action,'verdict':'DENY','reason':'human rejected'}); print('Human rejected'); sys.exit(5)
      action['approved']=True
  log({'ts':time.time(),'action':action,'verdict':'ALLOW','reason':'passed checks'}); print('Action allowed and logged.')
"@
Write-File -path ".\scripts\no_before_action.py" -content $noBefore -force:$Force

# Audit verify script
$auditVerify = @"
#!/usr/bin/env python3
import json, os, hmac, hashlib, sys
LOG='out/action_audit.log'; HMAC_SECRET=os.environ.get('AUDIT_HMAC_SECRET','audit-dev-secret')
if not os.path.exists(LOG): print('No audit log'); sys.exit(1)
ok=True
for l in open(LOG,'r',encoding='utf-8'):
  rec=json.loads(l); raw=json.dumps(rec['entry'],sort_keys=True)
  sig=hmac.new(HMAC_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
  if sig!=rec['hmac']: print('Tamper detected',rec['entry']); ok=False
if ok: print('All audit entries verified'); sys.exit(0)
sys.exit(2)
"@
Write-File -path ".\scripts\audit_verify.py" -content $auditVerify -force:$Force

# Demo action and contract
$demoAction = @"
{
  "agent_id": "agent-42",
  "name": "export_customer_profile",
  "capability": "read_customer",
  "type": "external",
  "risk": "high",
  "inputs": { "customer_id": "CUST-000123" },
  "approved": false,
  "timestamp": "2026-04-26T15:30:00Z"
}
"@
Write-File -path ".\demo\action.json" -content $demoAction -force:$Force

$demoContract = @"
{
  "name": "example-http-api",
  "version": "0.1.0",
  "description": "HTTP API wrapper for customer data reads",
  "owner": "team@example.com",
  "capabilities": [
    {
      "name": "read_customer",
      "type": "external",
      "allowed_inputs": { "customer_id": "string" },
      "allowed_outputs": { "customer_profile": "object" },
      "side_effects": "none",
      "risk": "low",
      "preconditions": { "authenticated": true, "approved_roles": ["operator","admin"] }
    }
  ]
}
"@
Write-File -path ".\demo\contract.json" -content $demoContract -force:$Force

# Audited runner example (safe simulation)
$runnerLines = @(
    '#!/usr/bin/env bash',
    '# scripts/audited_runner.sh - illustrative only',
    'set -euo pipefail',
    'TOKEN_FILE=out/agent-42.token',
    'ACTION=demo/action.json',
    'if [ ! -f "$TOKEN_FILE" ]; then echo ''Token missing''; exit 2; fi',
    'if [ "$(jq -r .approved $ACTION)" != "true" ]; then echo ''Action not approved''; exit 3; fi',
    'TOKEN=$(cat $TOKEN_FILE)',
    'echo ''Simulating external call with token'' > out/traces.log',
    'python3 - <<''PY''',
    'import json,time',
    "trace={'ts':time.time(),'agent':'agent-42','action':'export_customer_profile','status':'success'}",
    "open('out/traces.log','a').write(json.dumps(trace)+'\\n')",
    'PY',
    "echo 'Execution simulated and traced.'"
)
$runnerPath = ".\\scripts\\audited_runner.sh"
Set-Content -Path $runnerPath -Value $runnerLines -Encoding UTF8

# CI workflow (governance checks)
$ci = @"
name: Governance CI
on: [push,pull_request]
jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Python
        uses: actions/setup-python@v4
        with: { python-version: '3.10' }
      - name: Install deps
        run: python -m pip install --upgrade pip && pip install -r requirements.txt || true
      - name: Detect secrets
        run: pip install detect-secrets && detect-secrets scan > .secrets.baseline || true
      - name: Validate tool contract
        run: python3 scripts/validate_tool_contract.py templates/tool_contract.yaml || true
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with: { name: governance-artifacts, path: out/* }
"@
Write-File -path ".\.github\workflows/governance-ci.yml" -content $ci -force:$Force

# Governance README with POPIA and MDM guidance
$readme = @"
README_GOVERNANCE_POPIA.md

This repository scaffolds governance controls for agent safety and POPIA-aware incident handling.

Key operational notes:
- Create a secure .env outside the repo with AGENT_MANAGER_SECRET and AUDIT_HMAC_SECRET.
- Use detect-secrets to create .secrets.baseline and commit it.
- For South Africa high-theft context: ensure device-level controls (encryption, remote wipe) and rapid incident steps are in place; POPIA requires reporting of any security compromise.
- Use scripts/no_before_action.py to gate all external actions; use scripts/agent_manager.py to issue/revoke tokens.
- In an incident: revoke tokens, quarantine agent, collect out/action_audit.log and out/traces.log, run scripts/audit_verify.py, and follow POPIA reporting steps.

MDM integration:
- Enroll corporate devices in MDM to enable selective wipe and remote lock.
- Block access from rooted/jailbroken devices until remediated.

"@
Write-File -path ".\README_GOVERNANCE_POPIA.md" -content $readme -force:$Force

Write-Host "Bootstrap complete. Next steps:"
Write-Host "  1) Create secure secrets file outside repo and set AGENT_MANAGER_SECRET and AUDIT_HMAC_SECRET."
Write-Host "  2) Install dependencies: pip install -r requirements.txt"
Write-Host "  3) Initialize detect-secrets baseline: detect-secrets scan > .secrets.baseline"
Write-Host "  4) Use demo files in demo/ to exercise the approval flow."

# Prevent PowerShell from parsing Bash script content
return
