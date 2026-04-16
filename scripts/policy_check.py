#!/usr/bin/env python3
# scripts/policy_check.py - SLM policy-as-code validator
import sys, os, yaml, fnmatch

def load_policy(path):
    with open(path) as f:
        return yaml.safe_load(f)

def check_allowed(root, allowed_patterns):
    violations = []
    for dirpath, dirnames, filenames in os.walk(root):
        rel = os.path.relpath(dirpath, root)
        if rel == '.':
            rel = ''
        for f in filenames:
            relpath = os.path.join(rel, f).lstrip('./\\')
            allowed = any(fnmatch.fnmatch(relpath, p) for p in allowed_patterns)
            if not allowed:
                violations.append(relpath)
    return violations

def main():
    repo_root = os.getcwd()
    policy_file = os.path.join(repo_root, 'slm', 'policy', 'policy.yaml')
    if not os.path.exists(policy_file):
        print('Policy file not found:', policy_file)
        sys.exit(1)
    policy = load_policy(policy_file)
    allowed = policy.get('allowed_paths', [])
    violations = check_allowed(repo_root, allowed)
    if violations:
        print('Policy violations found (files outside allowed SLM paths):')
        for v in violations[:50]:
            print(' -', v)
        sys.exit(2)
    print('Policy check passed.')
    sys.exit(0)

if __name__ == '__main__':
    main()
