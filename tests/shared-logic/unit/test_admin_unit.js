const assert = require('assert');
const { createAdminApi } = require('../../../packages/shared-logic/src/admin');

async function run() {
  const calls = [];
  const client = {
    async get(url, config) {
      calls.push({ method: 'GET', url, config });
      if (config && config.params && config.params.format === 'csv') {
        return { data: 'id,eventType\naudit-001,admin_login' };
      }
      return { data: { items: [{ id: 'admin-001' }] } };
    },
    async post(url, body, config) {
      calls.push({ method: 'POST', url, body, config });
      return { data: { item: { id: 'admin-ops-001', username: 'ops.admin' }, ok: true, targetUserId: 'admin-ops-001' } };
    }
  };

  const admin = createAdminApi(client, { associationId: 'assoc-admin-demo' });
  const accounts = await admin.listAccounts();
  const created = await admin.createAccount({ username: 'ops.admin' });
  const rotated = await admin.rotateCredentials('admin-ops-001', { password: 'temp-123456' });
  const reset = await admin.requestPasswordReset('admin-ops-001');
  const audit = await admin.listAuditEvents({ outcome: 'denied' });
  const csv = await admin.exportAuditEvents({ outcome: 'success' });

  assert.strictEqual(accounts.items[0].id, 'admin-001');
  assert.strictEqual(created.item.username, 'ops.admin');
  assert.strictEqual(rotated.item.id, 'admin-ops-001');
  assert.strictEqual(reset.targetUserId, 'admin-ops-001');
  assert.strictEqual(audit.items[0].id, 'admin-001');
  assert.ok(csv.includes('audit-001'));
  assert.strictEqual(calls[0].config.headers['x-association-id'], 'assoc-admin-demo');

  console.log('unit:test_admin_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}