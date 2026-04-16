/*
 tests/shared-auth/unit/run_unit_tests.cjs
 Runs all unit tests for shared-auth
*/
const path = require('path');
const tests = [
  'test_sign_verify.cjs',
  'test_role_middleware.cjs'
];
tests.forEach((t) => {
  console.log('Running', t);
  const run = require(path.join(__dirname, t));
  run();
});
console.log('All shared-auth unit tests completed');
