#!/usr/bin/env python3
"""
validate_agent_tokens.py
- Validates agent tokens in out/agent_tokens.json
- Checks for required fields, expiration, and duplicate agent_ids
"""
import json, sys, time
from pathlib import Path

def main():
    path = Path('out/agent_tokens.json')
    if not path.exists():
        print('No agent_tokens.json found.')
        sys.exit(1)
    tokens = json.load(open(path, 'r', encoding='utf-8'))
    seen_ids = set()
    now = int(time.time())
    for entry in tokens:
        payload = entry.get('payload', {})
        agent_id = payload.get('agent_id')
        scopes = payload.get('scopes')
        exp = payload.get('exp')
        token = entry.get('token')
        if not agent_id or not scopes or not exp or not token:
            print(f'Invalid entry: {entry}')
            sys.exit(2)
        if agent_id in seen_ids:
            print(f'Duplicate agent_id: {agent_id}')
            sys.exit(2)
        seen_ids.add(agent_id)
        if exp < now:
            print(f'Expired token for agent_id: {agent_id}')
            sys.exit(2)
    print('All agent tokens are valid.')

if __name__ == '__main__':
    main()
