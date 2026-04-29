const path = require('path');

async function main() {
  const tests = [
    'test_jobs_view_unit.js',
    'test_onboarding_flow_unit.js',
    'test_profile_view_unit.js'
  ];

  for (const testFile of tests) {
    console.log('Running', testFile);
    const run = require(path.join(__dirname, testFile));
    await run();
  }

  console.log('All contractor-package unit tests completed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
