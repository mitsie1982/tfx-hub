const assert = require('assert');
const { main, requireAdminEnv } = require('../../../scripts/smoke_admin_runtime_local');

async function run() {
  const previousEnv = {
    TFX_ADMIN_USERNAME: process.env.TFX_ADMIN_USERNAME,
    TFX_ADMIN_EMAIL: process.env.TFX_ADMIN_EMAIL,
    TFX_ADMIN_PASSWORD: process.env.TFX_ADMIN_PASSWORD
  };

  delete process.env.TFX_ADMIN_USERNAME;
  delete process.env.TFX_ADMIN_EMAIL;
  delete process.env.TFX_ADMIN_PASSWORD;
  assert.throws(() => requireAdminEnv(), /Missing required admin env vars/);

  process.env.TFX_ADMIN_USERNAME = 'local-admin-secret';
  process.env.TFX_ADMIN_EMAIL = 'admin@example.com';
  process.env.TFX_ADMIN_PASSWORD = 'change-this-admin-password';

  await main();

  process.env.TFX_ADMIN_USERNAME = previousEnv.TFX_ADMIN_USERNAME;
  process.env.TFX_ADMIN_EMAIL = previousEnv.TFX_ADMIN_EMAIL;
  process.env.TFX_ADMIN_PASSWORD = previousEnv.TFX_ADMIN_PASSWORD;

  console.log('unit:test_admin_runtime_smoke_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}