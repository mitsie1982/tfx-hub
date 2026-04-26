const path = require('path');

async function main() {
  const tests = [
    'test_admin_bootstrap_unit.js',
    'test_admin_actions_unit.js',
    'test_customer_shortlist_unit.js',
    'test_admin_management_unit.js',
    'test_admin_runtime_smoke_unit.js',
    'test_password_reset_notifier_unit.js',
    'test_whatsapp_admin_service_unit.js',
    'test_meta_whatsapp_webhook_unit.js',
    'test_meta_whatsapp_option1_preflight_unit.js',
    'test_meta_whatsapp_routes_unit.js',
    'test_role_whatsapp_routes_unit.js'
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
