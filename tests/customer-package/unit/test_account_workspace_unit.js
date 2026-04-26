const assert = require('assert');
const { createAccountWorkspace } = require('../../../packages/customer-app/src/accountWorkspace');

async function run() {
  const calls = [];
  const sessionApi = {
    async login(credentials) {
      calls.push({ method: 'login', credentials });
      return { token: 'token-123' };
    },
    async register(payload) {
      calls.push({ method: 'register', payload });
      return { user: { id: 'user-001', role: payload.role } };
    },
    async requestPasswordReset(payload) {
      calls.push({ method: 'requestPasswordReset', payload });
      return { ok: true };
    },
    async getCurrentUser() {
      calls.push({ method: 'getCurrentUser' });
      return { user: { id: 'user-001', role: 'client' } };
    }
  };

  const workspace = createAccountWorkspace(sessionApi);
  const loginResult = await workspace.signIn({ email: 'client@example.com', password: 'secret' });
  assert.strictEqual(loginResult.token, 'token-123');

  const registerResult = await workspace.register({ email: 'client@example.com', password: 'secret' });
  assert.strictEqual(registerResult.user.role, 'client');

  const resetResult = await workspace.requestPasswordReset('client@example.com');
  assert.strictEqual(resetResult.ok, true);

  const currentUser = await workspace.getCurrentUser();
  assert.strictEqual(currentUser.role, 'client');
  assert.strictEqual(calls[1].payload.role, 'client');

  console.log('unit:test_account_workspace_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
