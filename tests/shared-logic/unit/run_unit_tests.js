/*
 tests/shared-logic/unit/run_unit_tests.js
 Runs unit tests for shared-logic.
*/
const path = require('path');

async function main() {
  const tests = [
    'test_admin_unit.js',
    'test_api_client_unit.js',
    'test_auth_unit.js',
    'test_contractor_unit.js',
    'test_request_context_unit.js',
    'test_professionals_unit.js',
    'test_jobs_unit.js',
    'test_session_unit.js',
    'test_onboarding_unit.js',
    'test_whatsapp_association_unit.js',
    'test_whatsapp_admin_unit.js',
    'test_whatsapp_contractor_unit.js',
    'test_whatsapp_customer_unit.js',
    'test_whatsapp_professional_unit.js'
  ];

  for (const testFile of tests) {
    console.log('Running', testFile);
    const run = require(path.join(__dirname, testFile));
    await run();
  }

  console.log('All shared-logic unit tests completed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
