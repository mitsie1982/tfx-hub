const path = require('path');

async function main() {
  const tests = [
    'test_action_review_unit.cjs',
    'test_contractor_data_unit.cjs',
    'test_login_screen_ui_unit.cjs'
  ];

  for (const testFile of tests) {
    console.log('Running', testFile);
    const run = require(path.join(__dirname, testFile));
    await run();
  }

  console.log('All contractor-mobile-app unit tests completed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
