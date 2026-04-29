#!/usr/bin/env python3
"""
audit_verify_tail.py
- Verifies only the last N HMAC-signed audit entries in a log file
- Usage: python3 scripts/audit_verify_tail.py [audit_log.jsonl] [N]
"""
import sys, json
from pathlib import Path
from audit_hmac_utils import verify_audit_entry

def main():
    log_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('out/agent_manager_audit.log')
    N = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    with open(log_path, 'r', encoding='utf-8') as fh:
        lines = [line.strip() for line in fh if line.strip()]
    ok = True
    for i, line in enumerate(lines[-N:], len(lines)-N+1):
        try:
            entry = json.loads(line)
            if not verify_audit_entry(entry):
                print(f'Line {i}: INVALID HMAC')
                ok = False
        except Exception as e:
            print(f'Line {i}: ERROR {e}')
            ok = False
    if ok:
        print(f'Last {N} audit entries verified.')
    else:
        print('Some of the last audit entries failed verification!')
        sys.exit(1)

if __name__ == '__main__':
    main()
