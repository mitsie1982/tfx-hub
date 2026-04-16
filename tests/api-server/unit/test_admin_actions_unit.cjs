const assert = require('assert');
const auth = require('../../../packages/shared-auth/src');
const { createApp, createMemoryRepository } = require('../../../packages/api-server/src');

async function run() {
  const repository = await createMemoryRepository();
  await repository.initialize();

  const app = createApp({
    repository,
    logger: { info() {}, warn() {}, error() {} },
    getCurrentDate: () => new Date('2026-04-02T07:00:00.000Z'),
    adminAccessPolicy: { allowAfterHours: true }
  });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const token = auth.signToken({
      sub: 'admin-001',
      userId: 'admin-001',
      associationId: 'assoc-members-demo',
      role: 'admin'
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const createResponse = await fetch(`${baseUrl}/professionals/pro-001/admin-actions/tier-review`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-association-id': 'assoc-contractor-demo'
      },
      body: JSON.stringify({ note: 'Quarterly premium review' })
    });
    const createPayload = await createResponse.json();
    assert.strictEqual(createResponse.status, 201);
    assert.strictEqual(createPayload.item.actionType, 'tier-review');

    const listResponse = await fetch(`${baseUrl}/professionals/pro-001/admin-actions`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-association-id': 'assoc-contractor-demo'
      }
    });
    const listPayload = await listResponse.json();
    assert.strictEqual(listResponse.status, 200);
    assert.strictEqual(listPayload.items.length, 1);
    assert.strictEqual(listPayload.items[0].note, 'Quarterly premium review');

    const closedApp = createApp({
      repository,
      logger: { info() {}, warn() {}, error() {} },
      getCurrentDate: () => new Date('2026-04-02T18:00:00.000Z'),
      adminAccessPolicy: { allowAfterHours: false, startHour: 8, endHour: 17, timeZone: 'Africa/Johannesburg' }
    });
    const closedServer = await new Promise((resolve) => {
      const instance = closedApp.listen(0, () => resolve(instance));
    });

    try {
      const closedBaseUrl = `http://127.0.0.1:${closedServer.address().port}`;
      const closedListResponse = await fetch(`${closedBaseUrl}/professionals/pro-001/admin-actions`, {
        headers: {
          authorization: `Bearer ${token}`,
          'x-association-id': 'assoc-contractor-demo'
        }
      });
      const closedListPayload = await closedListResponse.json();
      assert.strictEqual(closedListResponse.status, 403);
      assert.strictEqual(closedListPayload.error, 'admin_access_closed');
    } finally {
      closedServer.close();
    }

    console.log('unit:test_admin_actions_unit OK');
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
