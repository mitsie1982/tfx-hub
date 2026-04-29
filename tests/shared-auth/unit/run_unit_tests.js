/*
 tests/shared-auth/unit/run_unit_tests.js
 Runs all unit tests for shared-auth
*/
const path = require('path');
const tests = [
  'test_sign_verify.js',
  'test_role_middleware.js'
];
tests.forEach((t) => {
  console.log('Running', t);
  const run = require(path.join(__dirname, t));
  run();
});
console.log('All shared-auth unit tests completed');
