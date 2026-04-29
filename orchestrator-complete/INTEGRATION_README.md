ORCHESTRATOR INTEGRATION README

What this bootstrap did:
- Created .vscode/tasks.json with tasks to validate contracts, issue/revoke tokens, gate actions, run workflows, approve actions, run audited runner, verify audit, and a demo sequence.
- Created orchestrator-complete/src/preExecute.ts (pre-execution hook).
- Attempted to patch orchestrator-complete/src/extension.ts to call preExecute before executeStep (heuristic). If your extension has a different internal API, integrate preExecute manually as shown below.

Manual integration (if automatic patch didn't match your code):
1. Import the hook:
   import { preExecute } from './preExecute';
2. Before executing any step that performs external side effects, call:
   const verdict = await preExecute(action, contract);
   if (!verdict.allowed) {
     // handle denial or pending approval (verdict.reason)
     return;
   }
3. Continue with step execution.

Environment variables:
- AGENT_MANAGER_SECRET : secret for issuing tokens
- AUDIT_HMAC_SECRET : secret for HMAC signing audit entries

Run demo:
- In VS Code: Terminal -> Run Task -> Demo: Full Sequence (non-interactive)
- Or run: bash scripts/demo_run_sequence.sh

Security note:
- This scaffold is for local development and testing. For production, run OPA in a hardened environment, use a secure Agent Manager service, and ensure secrets are stored in a secure vault.
