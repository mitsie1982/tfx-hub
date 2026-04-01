/*
 tests/shared-auth/unit/test_sign_verify.js
 Unit tests for signToken and verifyToken
*/
const assert = require('assert');
const auth = require('../../../packages/shared-auth/src');

function run() {
  const payload = { sub: 'user-1', associationId: 'assoc-1', role: 'member' };
  const token = auth.signToken(payload, { secret: 'unit-secret', expiresIn: '1h' });
  const decoded = auth.verifyToken(token, { secret: 'unit-secret' });
  assert.strictEqual(decoded.sub, payload.sub);
  assert.strictEqual(decoded.associationId, payload.associationId);
  console.log('unit:test_sign_verify OK');
}

if (require.main === module) run();
module.exports = run;
