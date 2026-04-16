const path = require('path');

async function main() {
  const tests = [
    'test_action_review_unit.cjs',
    'test_ams_data_unit.cjs'
  ];

  for (const testFile of tests) {
    console.log('Running', testFile);
    const run = require(path.join(__dirname, testFile));
    await run();
  }

  console.log('All ams-mobile-app unit tests completed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
