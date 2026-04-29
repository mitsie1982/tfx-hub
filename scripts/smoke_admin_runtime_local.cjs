const { createApp, createMemoryRepository } = require('../packages/api-server/src');

function requireAdminEnv() {
  const required = ['TFX_ADMIN_USERNAME', 'TFX_ADMIN_EMAIL', 'TFX_ADMIN_PASSWORD'];
  const missing = required.filter((name) => !String(process.env[name] || '').trim());
  if (missing.length > 0) {
    throw new Error(`Missing required admin env vars: ${missing.join(', ')}`);
  }

  return {
    username: process.env.TFX_ADMIN_USERNAME.trim(),
    email: process.env.TFX_ADMIN_EMAIL.trim(),
    password: process.env.TFX_ADMIN_PASSWORD
  };
}

// Polyfill fetch for Node.js if not available
const fetch = global.fetch || ((...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)));

async function main() {
  const adminEnv = requireAdminEnv();
  const repository = await createMemoryRepository();
  await repository.initialize();

  const app = createApp({
    repository,
    logger: console,
    getCurrentDate: () => new Date('2026-04-02T07:00:00.000Z')
  });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: adminEnv.username,
        password: adminEnv.password
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Bootstrap admin login failed with ${loginResponse.status}`);
    }

    const loginPayload = await loginResponse.json();
    const token = loginPayload.token;
    const createResponse = await fetch(`${baseUrl}/admin/accounts`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'x-association-id': 'assoc-contractor-demo',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: 'runtime-admin@example.com',
        username: 'runtime.admin',
        password: 'runtime-admin-password',
        firstName: 'Runtime',
        lastName: 'Admin'
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Managed admin creation failed with ${createResponse.status}`);
    }

    const createPayload = await createResponse.json();
    const auditResponse = await fetch(`${baseUrl}/admin/audit-events?limit=10`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-association-id': 'assoc-contractor-demo'
      }
    });

    if (!auditResponse.ok) {
      throw new Error(`Admin audit fetch failed with ${auditResponse.status}`);
    }

    const auditPayload = await auditResponse.json();
    console.log('bootstrap admin:', loginPayload.user.username);
    console.log('managed admin:', createPayload.item.username);
    console.log('audit events:', Array.isArray(auditPayload.items) ? auditPayload.items.length : 0);
  } finally {
    server.close();
  }
}

module.exports = { main, requireAdminEnv };

if (require.main === module) {
  main().catch((error) => {
    console.error('Admin runtime smoke failed:', error && error.message ? error.message : error);
    process.exit(1);
  });
}
