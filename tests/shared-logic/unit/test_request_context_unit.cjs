/*
 tests/shared-logic/unit/test_request_context_unit.js
 Unit coverage for association header generation.
*/
const assert = require('assert');
const { buildAssociationHeaders, mergeHeaders } = require('../../../packages/shared-logic/src/requestContext');

async function run() {
  const headers = buildAssociationHeaders({
    associationId: 'assoc-001',
    userId: 'user-123',
    platform: 'android',
    appVersion: '1.4.0'
  });

  assert.deepStrictEqual(headers, {
    'x-association-id': 'assoc-001',
    'x-user-id': 'user-123',
    'x-client-platform': 'android',
    'x-client-version': '1.4.0'
  });

  const merged = mergeHeaders(headers, { 'x-correlation-id': 'corr-123' });
  assert.strictEqual(merged['x-correlation-id'], 'corr-123');
  assert.strictEqual(merged['x-association-id'], 'assoc-001');

  console.log('unit:test_request_context_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
