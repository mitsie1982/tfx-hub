const path = require('path');

async function main() {
  const tests = [
    'test_action_review_unit.js',
    'test_members_data_unit.js'
  ];

  for (const testFile of tests) {
    console.log('Running', testFile);
    const run = require(path.join(__dirname, testFile));
    await run();
  }

  console.log('All members-mobile-app unit tests completed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
