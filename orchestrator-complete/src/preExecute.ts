// orchestrator-complete/src/preExecute.ts
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as crypto from 'crypto';

const AUDIT_LOG = 'out/action_audit.log';
const PENDING_ACTION = 'out/pending_action.json';
const HMAC_SECRET = process.env.AUDIT_HMAC_SECRET || 'audit-dev-secret';

// Simple preExecute: OPA check, judge stub, pending approval for high-risk external actions, HMAC audit
export async function preExecute(action: any, contract: any, user: string = 'unknown'): Promise<{ allowed: boolean; reason?: string }> {
  try { fs.mkdirSync('out', { recursive: true }); } catch {}
  // 1) OPA (if available)
  try {
    const input = JSON.stringify({ action, contract });
    const opa = child_process.spawnSync('opa', ['eval', '-i', '-', 'data.governance.deny'], { input, encoding: 'utf8' });
    if (opa.status === 0 && opa.stdout && opa.stdout.includes('true')) {
      const reason = opa.stdout.trim();
      await logAudit(action, 'DENY', reason);
      return { allowed: false, reason };
    }
  } catch (e) { /* opa not available: fallback */ }

  // 2) Judge stub (scripts/judge_llm.py)
  try {
    const judge = child_process.spawnSync('python3', ['scripts/judge_llm.py'], { input: JSON.stringify(action), encoding: 'utf8' });
    if (judge && judge.stdout) {
      try {
        const v = JSON.parse(judge.stdout.toString());
        if (!v.ok) { await logAudit(action, 'DENY', v.reason || 'judge_denied'); return { allowed: false, reason: v.reason }; }
      } catch {}
    }
  } catch {}

  // 3) High-risk approval
  if ((action.risk === 'high' || action.type === 'external') && !action.approved) {
    fs.writeFileSync(PENDING_ACTION, JSON.stringify(action, null, 2), 'utf8');
    await logAudit(action, 'PENDING', 'awaiting_human_approval');
    return { allowed: false, reason: 'pending_human_approval' };
  }

  // 4) Allow and log
  await logAudit(action, 'ALLOW', 'passed_checks');
  return { allowed: true };
}

async function logAudit(action: any, verdict: string, reason: string) {
  const entry = { ts: Math.floor(Date.now()/1000), action, verdict, reason };
  const raw = JSON.stringify(entry, Object.keys(entry).sort());
  const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(raw).digest('hex');
  const record = { entry, hmac };
  fs.appendFileSync(AUDIT_LOG, JSON.stringify(record) + '\n', 'utf8');
}
