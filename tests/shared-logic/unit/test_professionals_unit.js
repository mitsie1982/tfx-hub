/*
 tests/shared-logic/unit/test_professionals_unit.js
 Unit coverage for professional directory helpers.
*/
const assert = require('assert');
const { createProfessionalsApi } = require('../../../packages/shared-logic/src/professionals');

async function run() {
  const calls = [];
  const client = {
    async get(url, config) {
      calls.push({ url, config });
      if (url === '/professionals') {
        return { data: { items: [{ id: 'pro-001', trade: 'plumber' }] } };
      }
      return { data: { item: { id: 'pro-001', trade: 'plumber' } } };
    }
  };

  const professionals = createProfessionalsApi(client, {
    associationId: 'assoc-001',
    platform: 'ios'
  });

  const list = await professionals.listProfessionals({ trade: 'plumber' });
  const detail = await professionals.getProfessional('pro-001');

  assert.strictEqual(calls[0].url, '/professionals');
  assert.strictEqual(calls[0].config.headers['x-association-id'], 'assoc-001');
  assert.strictEqual(calls[0].config.params.trade, 'plumber');
  assert.strictEqual(calls[1].url, '/professionals/pro-001');
  assert.strictEqual(detail.item.id, 'pro-001');
  assert.strictEqual(list.items[0].trade, 'plumber');

  console.log('unit:test_professionals_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
