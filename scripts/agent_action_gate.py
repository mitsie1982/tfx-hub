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
