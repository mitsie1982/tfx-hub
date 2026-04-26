const path = require('path');

async function main() {
  const tests = [
    'test_browser_hosts_unit.js'
  ];

  for (const testFile of tests) {
    console.log('Running', testFile);
    const run = require(path.join(__dirname, testFile));
    await run();
  }

  console.log('All browser-host unit tests completed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
