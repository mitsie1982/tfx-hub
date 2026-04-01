/*
 tests/shared-logic/unit/test_auth_unit.js
 Unit coverage for token signing, verification, and tokenStore behavior.
*/
const assert = require('assert');
const { signToken, verifyToken, tokenStore } = require('../../../packages/shared-logic/src/auth');

async function run() {
  const token = signToken({ sub: 'user-123', associationId: 'assoc-001' }, { expiresIn: '1h' });
  const payload = verifyToken(token);

  assert.strictEqual(payload.sub, 'user-123');
  assert.strictEqual(payload.associationId, 'assoc-001');

  tokenStore.clear();
  tokenStore.set(token);
  assert.strictEqual(tokenStore.get(), token);
  tokenStore.clear();
  assert.strictEqual(tokenStore.get(), null);

  console.log('unit:test_auth_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
