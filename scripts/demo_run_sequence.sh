#!/usr/bin/env bash
# scripts/demo_run_sequence.sh - demo: issue token, auto-approve action, run gate, run audited runner, verify audit
set -euo pipefail
# 1) Issue token (short TTL)
python3 scripts/agent_manager.py issue agent-42 read_customer 300 > out/demo_token.txt
TOKEN=$(cat out/demo_token.txt)
echo $TOKEN > out/agent-42.token
# 2) Auto-approve action for demo (set approved true)
python3 - <<'PY'
import json
a=json.load(open('demo/action.json'))
a['approved']=True
json.dump(a, open('demo/action.json','w'), indent=2)
print('Action auto-approved for demo')
PY
# 3) Run gate (will run judge and skip human approval because approved=true)
python3 scripts/no_before_action.py demo/action.json demo/contract.json
# 4) Run audited runner (simulate)
bash scripts/audited_runner.sh
# 5) Verify audit integrity
python3 scripts/audit_verify.py || true
echo 'Demo sequence complete. Check out/out and out/action_audit.log'
