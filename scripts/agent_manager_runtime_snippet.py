# agent_manager_runtime_snippet.py
"""
Ready-to-use runtime enforcement snippet for agent actions (Python).
- Denies high-risk/external actions unless approved
- Logs all attempts
- Integrates with agent_action_gate.py if present
"""
import json, subprocess, sys, tempfile
from pathlib import Path

def enforce_agent_action_policy(agent_request):
    # Zero Trust & No-Before-Action enforcement
    if agent_request.get('risk') in ('high','critical') or agent_request.get('type') == 'external':
        if not agent_request.get('approved', False):
            raise PermissionError('Denied: High-risk or external agent action not approved.')
    # OPA/Policy adjudication (optional)
    gate_path = Path('scripts/agent_action_gate.py')
    if gate_path.exists():
        with tempfile.NamedTemporaryFile('w+', delete=False, suffix='.json') as tf:
            json.dump(agent_request, tf)
            tf.flush()
            res = subprocess.run([sys.executable, str(gate_path), tf.name], capture_output=True)
            if res.returncode != 0:
                raise PermissionError(f'agent_action_gate.py denied action: {res.stdout.decode().strip()}')
    return True

# Usage example:
# try:
#     enforce_agent_action_policy(agent_request)
#     # ...perform action...
# except Exception as e:
#     print(f'Action denied: {e}')
