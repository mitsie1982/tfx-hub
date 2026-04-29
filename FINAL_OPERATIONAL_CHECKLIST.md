# Final Operational Checklist: Immediate Actions

**1. Enforce device hygiene**
- Require full-disk encryption, biometric locks, and MDM enrollment for all corporate devices.
- Block access from devices not meeting these standards (critical for high-theft environments).

**2. Gate every external action**
- Always run `scripts/no_before_action.py` before any action that can affect external systems or data.

**3. Issue short-TTL tokens**
- Use `scripts/agent_manager.py issue <agent> <scopes>` to issue tokens.
- Revoke tokens immediately if there is any suspicion of compromise.

**4. Log and verify**
- Run `scripts/audit_verify.py` regularly and after any incident.
- Preserve `out/action_audit.log` and `out/traces.log` as primary evidence for POPIA compliance and reporting.

---

*Embed this checklist in your onboarding, incident response, and governance documentation for continuous compliance and operational safety.*
