/*
 tests/shared-logic/unit/run_unit_tests.cjs
 Runs unit tests for shared-logic.
*/
const path = require('path');

async function main() {
  const tests = [
    'test_admin_unit.cjs',
    'test_api_client_unit.cjs',
    'test_auth_unit.cjs',
    'test_contractor_unit.cjs',
    'test_request_context_unit.cjs',
    'test_professionals_unit.cjs',
    'test_jobs_unit.cjs',
    'test_session_unit.cjs',
    'test_onboarding_unit.cjs',
    'test_whatsapp_association_unit.cjs',
    'test_whatsapp_admin_unit.cjs',
    'test_whatsapp_contractor_unit.cjs',
    'test_whatsapp_customer_unit.cjs',
    'test_whatsapp_professional_unit.cjs'
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
