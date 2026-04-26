const assert = require('assert');
const auth = require('../../../packages/shared-logic/src/auth');
const { createSessionApi } = require('../../../packages/shared-logic/src/session');

async function run() {
  auth.tokenStore.clear();

  const calls = [];
  const client = {
    async post(url, body, config) {
      calls.push({ method: 'POST', url, body, config });
      if (url === '/auth/password-reset/request') {
        return { data: { ok: true, resetToken: 'reset-001' } };
      }
      if (url === '/auth/password-reset/confirm') {
        return { data: { ok: true } };
      }
      if (url === '/user/whatsapp-subscription') {
        return { data: { item: { role: 'contractor', phoneNumber: body.phoneNumber, subscribed: true } } };
      }
      return { data: { token: 'session-token', user: { id: 'user-001', email: body.email || 'contractor@example.com' } } };
    },
    async get(url, config) {
      calls.push({ method: 'GET', url, config });
      return { data: { id: 'user-001', email: 'contractor@example.com' } };
    }
  };

  const session = createSessionApi(client, { associationId: 'assoc-001' });
  const login = await session.login({ identifier: '+27710000001', password: 'password123' });
  const register = await session.register({ email: 'new@example.com', password: 'password123', firstName: 'A', lastName: 'B', role: 'contractor' });
  const resetRequest = await session.requestPasswordReset({ email: 'contractor@example.com' });
  const resetConfirm = await session.confirmPasswordReset({ token: 'reset-001', password: 'newpass123' });
  const user = await session.getCurrentUser();
  const subscription = await session.subscribeWhatsapp('+27710000001');

  assert.strictEqual(login.user.email, 'contractor@example.com');
  assert.strictEqual(register.user.email, 'new@example.com');
  assert.strictEqual(resetRequest.resetToken, 'reset-001');
  assert.strictEqual(resetConfirm.ok, true);
  assert.strictEqual(auth.tokenStore.get(), 'session-token');
  assert.strictEqual(user.id, 'user-001');
  assert.strictEqual(subscription.item.subscribed, true);
  assert.strictEqual(calls[0].config.headers['x-association-id'], 'assoc-001');

  try {
    await session.login({ identifier: '', password: 'password123' });
    assert.fail('expected missing identifier error');
  } catch (error) {
    assert.ok(error.message.includes('credentials.identifier'));
  }

  try {
    await session.requestPasswordReset({ email: '' });
    assert.fail('expected missing email error');
  } catch (error) {
    assert.ok(error.message.includes('payload.email'));
  }

  console.log('unit:test_session_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
