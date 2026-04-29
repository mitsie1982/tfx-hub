#!/usr/bin/env python3
"""
audit_hmac_utils.py
- Utilities for generating and verifying HMAC-SHA256 signed audit entries
"""
import json, hmac, hashlib, os

def get_audit_secret():
    # Use env var or fallback
    return os.environ.get('AUDIT_HMAC_SECRET', 'replace-with-strong-secret').encode()

def generate_audit_entry(entry: dict) -> dict:
    """
    Given an audit entry dict (without 'hmac'), returns a dict with 'entry' and 'hmac'.
    """
    entry_json = json.dumps(entry, sort_keys=True, separators=(',', ':')).encode()
    secret = get_audit_secret()
    sig = hmac.new(secret, entry_json, hashlib.sha256).hexdigest()
    return {'entry': entry, 'hmac': sig}

def verify_audit_entry(signed_entry: dict) -> bool:
    """
    Given a dict with 'entry' and 'hmac', verifies the HMAC signature.
    """
    entry = signed_entry['entry']
    expected = signed_entry['hmac']
    entry_json = json.dumps(entry, sort_keys=True, separators=(',', ':')).encode()
    secret = get_audit_secret()
    actual = hmac.new(secret, entry_json, hashlib.sha256).hexdigest()
    return hmac.compare_digest(actual, expected)

# Example usage:
if __name__ == '__main__':
    sample = {
        'ts': 1714104600.123,
        'action': {
            'agent_id': 'agent-42',
            'name': 'export_customer_profile',
            'capability': 'read_customer',
            'type': 'external',
            'risk': 'high',
            'inputs': {'customer_id': 'CUST-000123'},
            'approved': True,
            'timestamp': '2026-04-26T15:30:00Z'
        },
        'verdict': 'ALLOW',
        'reason': 'passed all checks'
    }
    signed = generate_audit_entry(sample)
    print('Signed:', json.dumps(signed, indent=2))
    print('Verify:', verify_audit_entry(signed))
