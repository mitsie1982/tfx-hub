#!/bin/bash
# scripts/audited_runner.sh - illustrative only
set -euo pipefail
TOKEN_FILE=out/agent-42.token
ACTION=demo/action.json
if [ ! -f "$TOKEN_FILE" ]; then echo 'Token missing'; exit 2; fi
if [ "$(jq -r .approved $ACTION)" != "true" ]; then echo 'Action not approved'; exit 3; fi
TOKEN=$(cat $TOKEN_FILE)
echo 'Simulating external call with token' > out/traces.log
python3 - <<'PY'
import json,time
trace={'ts':time.time(),'agent':'agent-42','action':'export_customer_profile','status':'success'}
open('out/traces.log','a').write(json.dumps(trace)+'\n')
PY
echo 'Execution simulated and traced.'
