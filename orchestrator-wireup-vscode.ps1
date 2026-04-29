<#
orchestrator-wireup-vscode.ps1
Bootstrap tasks, preExecute hook, and local helpers for the orchestrator flow.
Usage:
  Save to repo root and run:
    .\orchestrator-wireup-vscode.ps1
  To overwrite existing files:
    .\orchestrator-wireup-vscode.ps1 --Force
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

# Ensure directories
New-Item -ItemType Directory -Path .\.vscode -Force | Out-Null
New-Item -ItemType Directory -Path .\orchestrator-complete\src -Force | Out-Null
New-Item -ItemType Directory -Path .\scripts -Force | Out-Null
New-Item -ItemType Directory -Path .\demo -Force | Out-Null
New-Item -ItemType Directory -Path .\out -Force | Out-Null

# .vscode/tasks.json
$tasksJson = @"
{
  "version": "2.0.0",
  "tasks": [
    { "label": "Start OPA (Docker)", "type": "shell", "command": "bash scripts/run_opa_container.sh", "presentation": { "reveal": "always" } },
    { "label": "Issue Token", "type": "shell", "command": "python3 scripts/agent_manager.py issue agent-42 read_customer 300 > out/agent-42.token && echo Token -> out/agent-42.token", "presentation": { "reveal": "always" } },
    { "label": "Gate Action (No-Before-Action)", "type": "shell", "command": "python3 scripts/no_before_action.py demo/action.json demo/contract.json", "presentation": { "reveal": "always", "panel": "shared" } },
    { "label": "Approve Pending Action", "type": "shell", "command": "python3 scripts/approve_action.py --action out/pending_action.json", "presentation": { "reveal": "always" } },
    { "label": "Run Audited Runner (simulate)", "type": "shell", "command": "bash scripts/audited_runner.sh", "presentation": { "reveal": "always" } },
    { "label": "Stream Audit to SIEM (test)", "type": "shell", "command": "python3 scripts/audit_streamer.py --file out/action_audit.log --dest ${env:AUDIT_SIEM_ENDPOINT}", "presentation": { "reveal": "always" } },
    { "label": "Verify Audit Trail", "type": "shell", "command": "python3 scripts/audit_verify.py", "presentation": { "reveal": "always" } },
    { "label": "Demo: Full Sequence", "type": "shell", "command": "bash scripts/demo_run_sequence.sh", "presentation": { "reveal": "always" } },
    { "label": "Open Audit Log", "type": "shell", "command": "if command -v code >/dev/null 2>&1; then code -r out/action_audit.log; else tail -n 200 out/action_audit.log; fi", "presentation": { "reveal": "always" } }
  ]
}
"@
Write-File -path ".\.vscode\tasks.json" -content $tasksJson -force:$Force

# preExecute.ts (concise, production-ready hooks are left as integration points)
$preExecuteTs = @"
// orchestrator-complete/src/preExecute.ts
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as crypto from 'crypto';

const AUDIT_LOG = 'out/action_audit.log';
const PENDING_ACTION = 'out/pending_action.json';
const HMAC_SECRET = process.env.AUDIT_HMAC_SECRET || 'audit-dev-secret';

// Simple preExecute: OPA check, judge stub, pending approval for high-risk external actions, HMAC audit
export async function preExecute(action: any, contract: any, user: string = 'unknown'): Promise<{ allowed: boolean; reason?: string }> {
  try { fs.mkdirSync('out', { recursive: true }); } catch {}
  // 1) OPA (if available)
  try {
    const input = JSON.stringify({ action, contract });
    const opa = child_process.spawnSync('opa', ['eval', '-i', '-', 'data.governance.deny'], { input, encoding: 'utf8' });
    if (opa.status === 0 && opa.stdout && opa.stdout.includes('true')) {
      const reason = opa.stdout.trim();
      await logAudit(action, 'DENY', reason);
      return { allowed: false, reason };
    }
  } catch (e) { /* opa not available: fallback */ }

  // 2) Judge stub (scripts/judge_llm.py)
  try {
    const judge = child_process.spawnSync('python3', ['scripts/judge_llm.py'], { input: JSON.stringify(action), encoding: 'utf8' });
    if (judge && judge.stdout) {
      try {
        const v = JSON.parse(judge.stdout.toString());
        if (!v.ok) { await logAudit(action, 'DENY', v.reason || 'judge_denied'); return { allowed: false, reason: v.reason }; }
      } catch {}
    }
  } catch {}

  // 3) High-risk approval
  if ((action.risk === 'high' || action.type === 'external') && !action.approved) {
    fs.writeFileSync(PENDING_ACTION, JSON.stringify(action, null, 2), 'utf8');
    await logAudit(action, 'PENDING', 'awaiting_human_approval');
    return { allowed: false, reason: 'pending_human_approval' };
  }

  // 4) Allow and log
  await logAudit(action, 'ALLOW', 'passed_checks');
  return { allowed: true };
}

async function logAudit(action: any, verdict: string, reason: string) {
  const entry = { ts: Math.floor(Date.now()/1000), action, verdict, reason };
  const raw = JSON.stringify(entry, Object.keys(entry).sort());
  const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(raw).digest('hex');
  const record = { entry, hmac };
  fs.appendFileSync(AUDIT_LOG, JSON.stringify(record) + '\n', 'utf8');
}
"@
Write-File -path ".\orchestrator-complete\src\preExecute.ts" -content $preExecuteTs -force:$Force

# Agent Manager (simple CLI)
$agentManager = @"
#!/usr/bin/env python3
import json, time, hmac, hashlib, os, sys
TOKENS='out/agent_tokens.json'
SECRET=os.environ.get('AGENT_MANAGER_SECRET','dev-secret')
def issue(agent_id, scopes, ttl=300):
  payload={'agent_id':agent_id,'scopes':scopes,'exp':int(time.time())+int(ttl)}
  token=hmac.new(SECRET.encode(), json.dumps(payload).encode(), hashlib.sha256).hexdigest()
  rec={'token':token,'payload':payload}
  data=[]
  if os.path.exists(TOKENS):
    data=json.load(open(TOKENS,'r',encoding='utf-8'))
  data.append(rec)
  open(TOKENS,'w',encoding='utf-8').write(json.dumps(data,indent=2))
  print(token)
def revoke(agent_id):
  if not os.path.exists(TOKENS): return
  data=json.load(open(TOKENS,'r',encoding='utf-8'))
  data=[r for r in data if r['payload'].get('agent_id')!=agent_id]
  open(TOKENS,'w',encoding='utf-8').write(json.dumps(data,indent=2))
if __name__=='__main__':
  if len(sys.argv)<2: print('usage'); sys.exit(2)
  cmd=sys.argv[1]
  if cmd=='issue': issue(sys.argv[2], sys.argv[3].split(','), sys.argv[4] if len(sys.argv)>4 else 300)
  elif cmd=='revoke': revoke(sys.argv[2])
"@
Write-File -path ".\scripts\agent_manager.py" -content $agentManager -force:$Force

# No-Before-Action gate (concise)
$noBefore = @"
#!/usr/bin/env python3
import json, subprocess, time, os, sys, hmac, hashlib
LOG='out/action_audit.log'; HMAC_SECRET=os.environ.get('AUDIT_HMAC_SECRET','audit-dev-secret')
def opa_eval(obj):
  try:
    p = subprocess.run(['opa','eval','-i','-','data.governance.deny'], input=json.dumps(obj).encode(), capture_output=True)
    out = p.stdout.decode().strip()
    if out and 'true' in out: return False, out
    return True, ''
  except FileNotFoundError:
    if obj.get('action',{}).get('type')=='external' and not obj.get('action',{}).get('approved',False):
      return False, 'external action not approved'
    return True, ''
def log_entry(entry):
  os.makedirs('out', exist_ok=True)
  raw = json.dumps(entry, sort_keys=True)
  sig = hmac.new(HMAC_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
  record = {'entry': entry, 'hmac': sig}
  with open(LOG,'a',encoding='utf-8') as fh: fh.write(json.dumps(record)+'\n')
if __name__=='__main__':
  if len(sys.argv)<3: print('usage'); sys.exit(2)
  action=json.load(open(sys.argv[1],'r',encoding='utf-8')); contract=json.load(open(sys.argv[2],'r',encoding='utf-8'))
  ok,reason=opa_eval({'action':action,'contract':contract})
  if not ok: log_entry({'ts':time.time(),'action':action,'verdict':'DENY','reason':reason}); print('Denied by policy:',reason); sys.exit(3)
  log_entry({'ts':time.time(),'action':action,'verdict':'ALLOW','reason':'passed checks'}); print('Action allowed and logged.')
"@
Write-File -path ".\scripts\no_before_action.py" -content $noBefore -force:$Force

# Audit streamer, verifier, demo runner, OPA runner
$auditStreamer = @"
#!/usr/bin/env python3
import argparse, json, requests, os, sys
p=argparse.ArgumentParser(); p.add_argument('--file', required=True); p.add_argument('--dest', required=True); args=p.parse_args()
if not os.path.exists(args.file): print('Audit file not found'); sys.exit(2)
for line in open(args.file,'r',encoding='utf-8'):
  rec=json.loads(line)
  try: requests.post(args.dest, json=rec, timeout=5)
  except Exception as e: print('stream error', e)
print('stream complete')
"@
Write-File -path ".\scripts\audit_streamer.py" -content $auditStreamer -force:$Force

$auditVerify = @"
#!/usr/bin/env python3
import json, os, hmac, hashlib, sys
LOG='out/action_audit.log'; HMAC_SECRET=os.environ.get('AUDIT_HMAC_SECRET','audit-dev-secret')
if not os.path.exists(LOG): print('No audit log'); sys.exit(1)
ok=True
for l in open(LOG,'r',encoding='utf-8'):
  rec=json.loads(l); raw=json.dumps(rec['entry'], sort_keys=True)
  sig=hmac.new(HMAC_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
  if sig!=rec['hmac']: print('Tamper detected', rec['entry']); ok=False
if ok: print('All audit entries verified'); sys.exit(0)
sys.exit(2)
"@
Write-File -path ".\scripts\audit_verify.py" -content $auditVerify -force:$Force

$auditedRunner = @"
#!/usr/bin/env bash
set -euo pipefail
TOKEN_FILE=out/agent-42.token; ACTION=demo/action.json
if [ ! -f \"$TOKEN_FILE\" ]; then echo 'Token missing'; exit 2; fi
if [ \"$(jq -r .approved $ACTION)\" != \"true\" ]; then echo 'Action not approved'; exit 3; fi
TOKEN=$(Get-Content $TOKEN_FILE)
echo \"Simulating external call with token: ${TOKEN:0:8}...\"
python3 - <<'PY'
import json,time
trace={'ts':time.time(),'agent':'agent-42','action':'export_customer_profile','status':'success'}
open('out/traces.log','a').write(json.dumps(trace)+'\n')
print('Trace written')
PY
"@
Write-File -path ".\scripts\audited_runner.sh" -content $auditedRunner -force:$Force

$demoSeq = @"
#!/usr/bin/env bash
set -euo pipefail
python3 scripts/agent_manager.py issue agent-42 read_customer 300 > out/demo_token.txt
cat out/demo_token.txt > out/agent-42.token
python3 - <<'PY'
import json
a=json.load(open('demo/action.json')); a['approved']=True
json.dump(a, open('demo/action.json','w'), indent=2)
print('Action auto-approved')
PY
python3 scripts/no_before_action.py demo/action.json demo/contract.json || true
bash scripts/audited_runner.sh || true
python3 scripts/audit_verify.py || true
echo 'Demo complete'
"@
Write-File -path ".\scripts\demo_run_sequence.sh" -content $demoSeq -force:$Force

$runOpa = @"
#!/usr/bin/env bash
docker run --rm -p 8181:8181 -v $(Get-Location)/policies:/policies openpolicyagent/opa:latest run --server /policies
"@
Write-File -path ".\scripts\run_opa_container.sh" -content $runOpa -force:$Force

# Demo action/contract
$demoAction = @"
{
  ""agent_id"": ""agent-42"",
  ""name"": ""export_customer_profile"",
  ""capability"": ""read_customer"",
  ""type"": ""external"",
  ""risk"": ""high"",
  ""inputs"": { ""customer_id"": ""CUST-000123"" },
  ""approved"": false,
  ""timestamp"": ""2026-04-28T15:00:00Z""
}
"@
Write-File -path ".\demo\action.json" -content $demoAction -force:$Force

$demoContract = @"
{
  ""name"": ""example-http-api"",
  ""version"": ""0.1.0"",
  ""capabilities"": [
    { ""name"": ""read_customer"", ""type"": ""external"", ""allowed_inputs"": { ""customer_id"": ""string"" }, ""allowed_outputs"": { ""customer_profile"": ""object"" }, ""risk"": ""low"" }
  ]
}
"@
Write-File -path ".\demo\contract.json" -content $demoContract -force:$Force

Write-Host "Bootstrap complete. Next steps:"
Write-Host "  1) Set environment secrets: AGENT_MANAGER_SECRET and AUDIT_HMAC_SECRET."
Write-Host "  2) Start OPA: Run Task 'Start OPA (Docker)' or: bash scripts/run_opa_container.sh"
Write-Host "  3) In VS Code: Run Task -> Demo: Full Sequence to exercise the flow."
