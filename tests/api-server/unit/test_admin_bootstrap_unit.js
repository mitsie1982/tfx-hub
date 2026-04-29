const assert = require('assert');
const { validateAdminBootstrapEnv } = require('../../../packages/api-server/src/adminAccess');

async function run() {
  const validConfig = validateAdminBootstrapEnv({
    TFX_ADMIN_USERNAME: 'local-admin-secret',
    TFX_ADMIN_EMAIL: 'admin@example.com',
    TFX_ADMIN_PASSWORD: 'change-this-admin-password'
  });

  assert.strictEqual(validConfig.username, 'local-admin-secret');
  assert.strictEqual(validConfig.email, 'admin@example.com');
  assert.strictEqual(validConfig.password, 'change-this-admin-password');

  assert.throws(() => validateAdminBootstrapEnv({
    TFX_ADMIN_USERNAME: 'local-admin-secret',
    TFX_ADMIN_EMAIL: ''
  }), /TFX_ADMIN_EMAIL, TFX_ADMIN_PASSWORD/);

  console.log('unit:test_admin_bootstrap_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
