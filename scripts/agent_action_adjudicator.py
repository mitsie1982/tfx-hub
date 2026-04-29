#!/usr/bin/env python3
"""
agent_action_adjudicator.py
- Automates approval workflow for agent actions
- Integrates with OPA (Open Policy Agent) and Judge LLM (simulated/human/AI)
- Usage: python3 scripts/agent_action_adjudicator.py <action.json> <contract.json>
"""
import sys, json, subprocess, os
from pathlib import Path

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def opa_adjudicate(action, contract=None):
    # If OPA is installed and policy exists, use it
    opa_policy = Path('policies/agent_policy.rego')
    if opa_policy.exists():
        opa_input = {'action': action}
        if contract:
            opa_input['tool_contract'] = contract
        try:
            res = subprocess.run([
                'opa', 'eval', '-i', '-', 'data.orchestrator.policies.deny'
            ], input=json.dumps(opa_input).encode(), capture_output=True, check=False)
            out = res.stdout.decode().strip()
            if out and 'true' in out:
                return False, out
            return True, ''
        except FileNotFoundError:
            pass
    return None, 'OPA not available'

def judge_llm_adjudicate(action):
    # Simulate Judge LLM (could be replaced with real LLM or human-in-the-loop)
    print('\n=== JUDGE LLM ADJUDICATION REQUIRED ===')
    print('Action:', json.dumps(action, indent=2))
    ans = input('Approve action? (yes/no): ').strip().lower()
    return ans == 'yes', 'Judge LLM' if ans == 'yes' else 'Rejected by Judge LLM'

def main():
    if len(sys.argv) < 2:
        print('Usage: python3 scripts/agent_action_adjudicator.py <action.json> <contract.json>')
        sys.exit(2)
    action = load_json(sys.argv[1])
    contract = load_json(sys.argv[2]) if len(sys.argv) > 2 else None
    # 1. OPA policy adjudication
    ok, reason = opa_adjudicate(action, contract)
    if ok is False:
        print(f'OPA DENIED: {reason}')
        sys.exit(3)
    elif ok is True:
        print('OPA ALLOWED')
        sys.exit(0)
    # 2. Judge LLM fallback
    approved, reason = judge_llm_adjudicate(action)
    if approved:
        print('JUDGE LLM ALLOWED')
        sys.exit(0)
    else:
        print(f'JUDGE LLM DENIED: {reason}')
        sys.exit(4)

if __name__ == '__main__':
    main()
