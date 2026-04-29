SECURITY: VS Code & Local Orchestrator Protections

Purpose
- Provide workspace-level protections against agentic misalignment, privilege escalation, data exfiltration, sandbox escape, hallucination-driven actions, and supply-chain/code risk.

Quick start
1. Create a local secrets folder outside the repo (e.g., ~/.tfxhub-secrets) and place your .env there.
2. Add .env to .gitignore.
3. Rebuild Dev Container in VS Code.
4. Install pre-commit: pip install pre-commit
5. Initialize detect-secrets baseline: detect-secrets scan > .secrets.baseline
6. Enable hooks: pre-commit install

Key controls
- No-Before-Action: any external action must be validated by policies and, for high-risk actions, human-approved via scripts/agent_action_gate.py.
- Least privilege: devcontainer uses env-file and mounts a local secrets folder; tokens should be short-lived.
- Secret scanning: scripts/credential_scan.py and detect-secrets baseline run in CI and locally.
- Policy as code: policies/agent_policy.rego enforces tool contracts and denies unapproved external actions.
- Audit trail: out/agent_actions.log and out/traces.log capture decisions and traces for post-mortem.

Emergency playbook
- If an agent performs an unexpected external action:
  1. Revoke tokens and rotate credentials immediately.
  2. Quarantine the agent process and container.
  3. Collect traces: out/traces.log and out/agent_actions.log.
  4. Run forensic secret scan and review recent commits.
  5. Notify security and follow incident response runbook.

