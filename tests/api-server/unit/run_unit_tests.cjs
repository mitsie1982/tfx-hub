const path = require('path');

async function main() {
  const tests = [
    'test_admin_bootstrap_unit.cjs',
    'test_admin_actions_unit.cjs',
    'test_auth_registration_unit.cjs',
    'test_customer_shortlist_unit.cjs',
    'test_admin_management_unit.cjs',
    'test_admin_runtime_smoke_unit.cjs',
    'test_password_reset_notifier_unit.cjs',
    'test_whatsapp_admin_service_unit.cjs',
    'test_meta_whatsapp_webhook_unit.cjs',
    'test_meta_whatsapp_option1_preflight_unit.cjs',
    'test_meta_whatsapp_routes_unit.cjs',
    'test_role_whatsapp_routes_unit.cjs'
  ];

  for (const testFile of tests) {
    console.log('Running', testFile);
    const run = require(path.join(__dirname, testFile));
    await run();
  }

  console.log('All api-server unit tests completed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
