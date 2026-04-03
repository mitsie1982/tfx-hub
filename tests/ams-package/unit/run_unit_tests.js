const path = require('path');

async function main() {
  const tests = [
    'test_account_workspace_unit.js',
    'test_admin_workspace_unit.js',
    'test_contractor_directory_unit.js',
    'test_operations_dashboard_unit.js'
  ];

  for (const testFile of tests) {
    console.log('Running', testFile);
    const run = require(path.join(__dirname, testFile));
    await run();
  }

  console.log('All ams-package unit tests completed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});