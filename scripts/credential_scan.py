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
