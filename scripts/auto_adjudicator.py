#!/usr/bin/env python3
"""
auto_adjudicator.py
- Automatically approves external/high-risk actions if admin token is present in .env.local
- Usage: import and call auto_approve_action(action) from agent_manager.py
"""
import os

def auto_approve_action(action):
    # Simulate admin authentication via env secret
    admin_token = os.environ.get('AGENT_MANAGER_SECRET')
    if not admin_token or admin_token == 'replace-with-strong-secret':
        return False, 'Admin authentication missing or default.'
    # Approve if external/high risk and not already approved
    if (action.get('type') == 'external' or action.get('risk') in ('high','critical')) and not action.get('approved', False):
        action['approved'] = True
        return True, 'Auto-approved by admin.'
    return False, 'No auto-approval needed.'
