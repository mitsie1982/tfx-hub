const assert = require('assert');
const { createAdminWorkspace } = require('../../../packages/ams-app/src/adminWorkspace');

async function run() {
  const adminApi = {
    async listAccounts() {
      return { items: [{ id: 'admin-001' }] };
    },
    async createAccount() {
      return { item: { id: 'admin-ops-001', username: 'ops.admin' } };
    },
    async rotateCredentials() {
      return { item: { id: 'admin-ops-001', username: 'ops.admin' } };
    },
    async requestPasswordReset() {
      return { ok: true, targetUserId: 'admin-ops-001' };
    },
    async listAuditEvents() {
      return { items: [{ id: 'audit-001' }] };
    },
    async exportAuditEvents() {
      return 'id,eventType';
    }
  };

  const workspace = createAdminWorkspace(adminApi);
  const accounts = await workspace.listAccounts();
  const created = await workspace.createAccount({ username: 'ops.admin' });
  const rotated = await workspace.rotateCredentials('admin-ops-001', { password: 'temp-123' });
  const reset = await workspace.requestPasswordReset('admin-ops-001');
  const audit = await workspace.listAuditEvents({ outcome: 'denied' });
  const csv = await workspace.exportAuditEvents({ outcome: 'success' });

  assert.strictEqual(accounts[0].id, 'admin-001');
  assert.strictEqual(created.username, 'ops.admin');
  assert.strictEqual(rotated.id, 'admin-ops-001');
  assert.strictEqual(reset.targetUserId, 'admin-ops-001');
  assert.strictEqual(audit[0].id, 'audit-001');
  assert.ok(csv.includes('eventType'));

  console.log('unit:test_admin_workspace_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
