/*
 tests/shared-auth/unit/test_role_middleware.js
 Tests roleMiddleware by simulating req/res/next
*/
const assert = require('assert');
const auth = require('../../../packages/shared-auth/src');

function run() {
  const req = { auth: { role: 'admin' } };
  const res = { status: () => ({ json: () => {} }) };
  let called = false;
  const next = () => { called = true; };
  const mw = auth.roleMiddleware(['admin','owner']);
  mw(req, res, next);
  assert.strictEqual(called, true, 'admin should pass roleMiddleware');
  console.log('unit:test_role_middleware OK');
}

if (require.main === module) run();
module.exports = run;
