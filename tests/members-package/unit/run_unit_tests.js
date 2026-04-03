const path = require('path');

async function main() {
  const tests = [
    'test_association_workspace_unit.js',
    'test_professional_workspace_unit.js'
  ];

  for (const testFile of tests) {
    console.log('Running', testFile);
    const run = require(path.join(__dirname, testFile));
    await run();
  }

  console.log('All members-package unit tests completed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});