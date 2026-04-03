/*
 tests/shared-logic/unit/test_auth_unit.js
 Unit coverage for token signing, verification, and tokenStore behavior.
*/
const assert = require('assert');
const { signToken, verifyToken, tokenStore } = require('../../../packages/shared-logic/src/auth');

async function run() {
  const token = signToken({ sub: 'user-123', associationId: 'assoc-001' }, { expiresIn: '1h' });
  const payload = verifyToken(token);
  const persistenceCalls = [];
  tokenStore.setPersistence({
    async get() {
      persistenceCalls.push('get');
      return token;
    },
    set(savedToken) {
      persistenceCalls.push(['set', savedToken]);
    },
    clear() {
      persistenceCalls.push('clear');
    }
  });

  assert.strictEqual(payload.sub, 'user-123');
  assert.strictEqual(payload.associationId, 'assoc-001');

  tokenStore.clear();
  tokenStore.set(token);
  assert.strictEqual(tokenStore.get(), token);
  const hydratedToken = await tokenStore.hydrate();
  assert.strictEqual(hydratedToken, token);
  tokenStore.clear();
  assert.strictEqual(tokenStore.get(), null);
  assert.deepStrictEqual(persistenceCalls, [
    'clear',
    ['set', token],
    'get',
    'clear'
  ]);
  tokenStore.setPersistence(null);

  console.log('unit:test_auth_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
