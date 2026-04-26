const assert = require('assert');
const { createAccountWorkspace } = require('../../../packages/ams-app/src/accountWorkspace');

async function run() {
  const sessionApi = {
    async login(credentials) {
      return { token: `token:${credentials.email}` };
    },
    async getCurrentUser() {
      return { user: { id: 'admin-001', role: 'admin' } };
    }
  };

  const workspace = createAccountWorkspace(sessionApi);
  const login = await workspace.signIn({ email: 'admin@example.com', password: 'secret' });
  assert.ok(login.token.includes('admin@example.com'));

  const currentUser = await workspace.getCurrentUser();
  assert.strictEqual(currentUser.role, 'admin');

  console.log('unit:test_account_workspace_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
