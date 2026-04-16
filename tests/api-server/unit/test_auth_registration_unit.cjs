const assert = require('assert');
const { createApp, createMemoryRepository } = require('../../../packages/api-server/src');

async function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function register(baseUrl, payload) {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

async function run() {
  const repository = await createMemoryRepository();
  await repository.initialize();

  const app = createApp({ repository, logger: { info() {}, warn() {}, error() {} } });
  const server = await startServer(app);

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const created = await register(baseUrl, {
      email: 'desktop-demo@example.com',
      password: 'password123',
      firstName: 'Desktop',
      lastName: 'Demo',
      role: 'contractor',
      trade: 'electrician',
      phoneNumber: '+27719990000'
    });
    assert.strictEqual(created.status, 201);
    assert.ok(created.body.token);
    assert.strictEqual(created.body.user.email, 'desktop-demo@example.com');

    const savedUser = await repository.getUserByPhoneNumber('+27719990000');
    assert.ok(savedUser);
    assert.strictEqual(savedUser.email, 'desktop-demo@example.com');

    const duplicatePhone = await register(baseUrl, {
      email: 'desktop-demo-2@example.com',
      password: 'password123',
      firstName: 'Desktop',
      lastName: 'Demo Two',
      role: 'contractor',
      trade: 'plumber',
      phoneNumber: '+27719990000'
    });
    assert.strictEqual(duplicatePhone.status, 409);
    assert.strictEqual(duplicatePhone.body.error, 'phone_number_in_use');

    const invalidPhone = await register(baseUrl, {
      email: 'desktop-demo-3@example.com',
      password: 'password123',
      firstName: 'Desktop',
      lastName: 'Demo Three',
      role: 'contractor',
      trade: 'builder',
      phoneNumber: 'not-a-number'
    });
    assert.strictEqual(invalidPhone.status, 400);
    assert.strictEqual(invalidPhone.body.error, 'invalid_phone_number');

    console.log('unit:test_auth_registration_unit OK');
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
