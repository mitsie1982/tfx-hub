const assert = require('assert');
const auth = require('../../../packages/shared-auth/src');
const { createApp, createMemoryRepository } = require('../../../packages/api-server/src');

async function run() {
  const repository = await createMemoryRepository();
  await repository.initialize();

  const app = createApp({
    repository,
    logger: { info() {}, warn() {}, error() {} }
  });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const token = auth.signToken({
      sub: 'client-001',
      userId: 'client-001',
      associationId: 'assoc-customer-demo',
      role: 'client'
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const headers = {
      authorization: `Bearer ${token}`,
      'x-association-id': 'assoc-customer-demo'
    };

    const initialResponse = await fetch(`${baseUrl}/user/shortlist`, { headers });
    const initialPayload = await initialResponse.json();
    assert.strictEqual(initialResponse.status, 200);
    assert.deepStrictEqual(initialPayload.items, []);

    const addResponse = await fetch(`${baseUrl}/user/shortlist/pro-001`, {
      method: 'POST',
      headers
    });
    const addPayload = await addResponse.json();
    assert.strictEqual(addResponse.status, 201);
    assert.strictEqual(addPayload.shortlisted, true);
    assert.deepStrictEqual(addPayload.items, ['pro-001']);

    const listResponse = await fetch(`${baseUrl}/user/shortlist`, { headers });
    const listPayload = await listResponse.json();
    assert.strictEqual(listResponse.status, 200);
    assert.deepStrictEqual(listPayload.items, ['pro-001']);

    const removeResponse = await fetch(`${baseUrl}/user/shortlist/pro-001`, {
      method: 'DELETE',
      headers
    });
    const removePayload = await removeResponse.json();
    assert.strictEqual(removeResponse.status, 200);
    assert.strictEqual(removePayload.shortlisted, false);
    assert.deepStrictEqual(removePayload.items, []);

    console.log('unit:test_customer_shortlist_unit OK');
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
