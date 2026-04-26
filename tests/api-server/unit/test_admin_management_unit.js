const assert = require('assert');
const auth = require('../../../packages/shared-auth/src');
const { createApp, createMemoryRepository } = require('../../../packages/api-server/src');

async function run() {
  const repository = await createMemoryRepository();
  await repository.initialize();

  const app = createApp({
    repository,
    logger: { info() {}, warn() {}, error() {} },
    getCurrentDate: () => new Date('2026-04-02T07:00:00.000Z')
  });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const token = auth.signToken({
      sub: 'admin-001',
      userId: 'admin-001',
      associationId: 'assoc-contractor-demo',
      role: 'admin'
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const headers = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-association-id': 'assoc-contractor-demo'
    };

    const createResponse = await fetch(`${baseUrl}/admin/accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: 'ops-admin@example.com',
        username: 'ops.admin',
        password: 'ops-password-123',
        firstName: 'Ops',
        lastName: 'Admin'
      })
    });
    const createPayload = await createResponse.json();
    assert.strictEqual(createResponse.status, 201);
    assert.strictEqual(createPayload.item.email, 'ops-admin@example.com');
    assert.strictEqual(createPayload.item.username, 'ops.admin');
    const createdAdminId = createPayload.item.id;

    const listResponse = await fetch(`${baseUrl}/admin/accounts`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-association-id': 'assoc-contractor-demo'
      }
    });
    const listPayload = await listResponse.json();
    assert.strictEqual(listResponse.status, 200);
    assert.ok(listPayload.items.length >= 2);
    assert.ok(listPayload.items.some((item) => item.id === createdAdminId));

    const rotateResponse = await fetch(`${baseUrl}/admin/accounts/${createdAdminId}/rotate-credentials`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username: 'ops.supervisor',
        password: 'rotated-password-456'
      })
    });
    const rotatePayload = await rotateResponse.json();
    assert.strictEqual(rotateResponse.status, 200);
    assert.strictEqual(rotatePayload.item.username, 'ops.supervisor');

    const resetResponse = await fetch(`${baseUrl}/admin/accounts/${createdAdminId}/password-reset-request`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
    const resetPayload = await resetResponse.json();
    assert.strictEqual(resetResponse.status, 200);
    assert.strictEqual(resetPayload.ok, true);
    assert.ok(resetPayload.resetToken);

    const bootstrapRotateResponse = await fetch(`${baseUrl}/admin/accounts/admin-001/rotate-credentials`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ password: 'do-not-allow' })
    });
    const bootstrapRotatePayload = await bootstrapRotateResponse.json();
    assert.strictEqual(bootstrapRotateResponse.status, 403);
    assert.strictEqual(bootstrapRotatePayload.error, 'bootstrap_admin_rotation_forbidden');

    const bootstrapResetResponse = await fetch(`${baseUrl}/admin/accounts/admin-001/password-reset-request`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
    const bootstrapResetPayload = await bootstrapResetResponse.json();
    assert.strictEqual(bootstrapResetResponse.status, 403);
    assert.strictEqual(bootstrapResetPayload.error, 'bootstrap_admin_reset_forbidden');

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: 'ops.supervisor', password: 'rotated-password-456' })
    });
    const loginPayload = await loginResponse.json();
    assert.strictEqual(loginResponse.status, 200);
    assert.strictEqual(loginPayload.user.id, createdAdminId);

    const deniedLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: 'ops.supervisor', password: 'wrong-password' })
    });
    const deniedLoginPayload = await deniedLoginResponse.json();
    assert.strictEqual(deniedLoginResponse.status, 401);
    assert.strictEqual(deniedLoginPayload.error, 'invalid_credentials');

    const closedApp = createApp({
      repository,
      logger: { info() {}, warn() {}, error() {} },
      getCurrentDate: () => new Date('2026-04-02T18:00:00.000Z')
    });
    const closedServer = await new Promise((resolve) => {
      const instance = closedApp.listen(0, () => resolve(instance));
    });

    try {
      const closedBaseUrl = `http://127.0.0.1:${closedServer.address().port}`;
      const closedResponse = await fetch(`${closedBaseUrl}/admin/accounts`, {
        headers: {
          authorization: `Bearer ${token}`,
          'x-association-id': 'assoc-contractor-demo'
        }
      });
      const closedPayload = await closedResponse.json();
      assert.strictEqual(closedResponse.status, 403);
      assert.strictEqual(closedPayload.error, 'admin_access_closed');
    } finally {
      closedServer.close();
    }

    const auditResponse = await fetch(`${baseUrl}/admin/audit-events?limit=20`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-association-id': 'assoc-contractor-demo'
      }
    });
    const auditPayload = await auditResponse.json();
    assert.strictEqual(auditResponse.status, 200);
    assert.ok(auditPayload.items.some((event) => event.eventType === 'admin_account_create' && event.targetUserId === createdAdminId));
    assert.ok(auditPayload.items.some((event) => event.eventType === 'admin_credentials_rotate' && event.targetUserId === createdAdminId));
    assert.ok(auditPayload.items.some((event) => event.eventType === 'admin_password_reset_request' && event.targetUserId === createdAdminId));
    assert.ok(auditPayload.items.some((event) => event.eventType === 'admin_login' && event.outcome === 'success' && event.adminUserId === createdAdminId));
    assert.ok(auditPayload.items.some((event) => event.eventType === 'admin_login' && event.outcome === 'denied' && event.adminUserId === createdAdminId));
    assert.ok(auditPayload.items.some((event) => event.eventType === 'admin_api_access' && event.outcome === 'denied'));

    const deniedAuditResponse = await fetch(`${baseUrl}/admin/audit-events?limit=20&outcome=denied`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-association-id': 'assoc-contractor-demo'
      }
    });
    const deniedAuditPayload = await deniedAuditResponse.json();
    assert.strictEqual(deniedAuditResponse.status, 200);
    assert.ok(deniedAuditPayload.items.every((event) => event.outcome === 'denied'));

    const csvAuditResponse = await fetch(`${baseUrl}/admin/audit-events?limit=5&format=csv&outcome=success`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-association-id': 'assoc-contractor-demo'
      }
    });
    const csvAuditPayload = await csvAuditResponse.text();
    assert.strictEqual(csvAuditResponse.status, 200);
    assert.ok(csvAuditPayload.includes('eventType'));
    assert.ok(csvAuditPayload.includes('admin_account_create'));

    console.log('unit:test_admin_management_unit OK');
  } finally {
    server.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
