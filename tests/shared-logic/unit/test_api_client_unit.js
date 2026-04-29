/*
 tests/shared-logic/unit/test_api_client_unit.js
 Basic unit test for createApiClient request interceptor behavior.
*/
const assert = require('assert');
const { createApiClient } = require('../../../packages/shared-logic/src/apiClient');

async function run() {
  let tokenProvided = false;
  const client = createApiClient({
    baseURL: 'http://localhost/',
    getToken: async () => {
      tokenProvided = true;
      return 'unit-test-token';
    }
  });
  const config = await client.interceptors.request.handlers[0].fulfilled({ headers: {} });
  assert(tokenProvided, 'getToken should be called');
  assert.strictEqual(config.headers.Authorization, 'Bearer unit-test-token');
  console.log('unit:test_api_client_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
