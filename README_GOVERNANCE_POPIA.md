README_GOVERNANCE_POPIA.md

This repository scaffolds governance controls for agent safety and POPIA-aware incident handling.

Key operational notes:
- Create a secure .env outside the repo with AGENT_MANAGER_SECRET and AUDIT_HMAC_SECRET.
- Use detect-secrets to create .secrets.baseline and commit it.
- For South Africa high-theft context: ensure device-level controls (encryption, remote wipe) and rapid incident steps are in place; POPIA requires reporting of any security compromise.
- Use scripts/no_before_action.py to gate all external actions; use scripts/agent_manager.py to issue/revoke tokens.
- In an incident: revoke tokens, quarantine agent, collect out/action_audit.log and out/traces.log, run scripts/audit_verify.py, and follow POPIA reporting steps.

MDM integration:
- Enroll corporate devices in MDM to enable selective wipe and remote lock.
- Block access from rooted/jailbroken devices until remediated.

