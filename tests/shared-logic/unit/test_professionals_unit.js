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
      if (url === '/professionals/pro-001/admin-actions') {
        return { data: { items: [{ id: 'admin-action-001', actionType: 'tier-review' }] } };
      }
      if (url === '/professionals/pro-001/operational-actions') {
        return { data: { items: [{ id: 'op-action-001', actionType: 'availability-check-in' }] } };
      }
      return { data: { item: { id: 'pro-001', trade: 'plumber' } } };
    },
    async post(url, body, config) {
      calls.push({ url, body, config, method: 'POST' });
      return { data: { item: { id: 'action-001', url, body } } };
    }
  };

  const professionals = createProfessionalsApi(client, {
    associationId: 'assoc-001',
    platform: 'ios'
  });

  const list = await professionals.listProfessionals({ trade: 'plumber' });
  const detail = await professionals.getProfessional('pro-001');
  const adminActions = await professionals.listAdminActions('pro-001');
  const adminAction = await professionals.runAdminAction('pro-001', 'tier-review', { note: 'Quarterly review' });
  const operationalActions = await professionals.listOperationalActions('pro-001');
  const operationalAction = await professionals.runOperationalAction('pro-001', 'availability-check-in', { note: 'Ready for work' });

  assert.strictEqual(calls[0].url, '/professionals');
  assert.strictEqual(calls[0].config.headers['x-association-id'], 'assoc-001');
  assert.strictEqual(calls[0].config.params.trade, 'plumber');
  assert.strictEqual(calls[1].url, '/professionals/pro-001');
  assert.strictEqual(calls[2].url, '/professionals/pro-001/admin-actions');
  assert.strictEqual(calls[3].url, '/professionals/pro-001/admin-actions/tier-review');
  assert.strictEqual(calls[3].body.note, 'Quarterly review');
  assert.strictEqual(calls[4].url, '/professionals/pro-001/operational-actions');
  assert.strictEqual(calls[5].url, '/professionals/pro-001/operational-actions/availability-check-in');
  assert.strictEqual(calls[5].body.note, 'Ready for work');
  assert.strictEqual(detail.item.id, 'pro-001');
  assert.strictEqual(list.items[0].trade, 'plumber');
  assert.strictEqual(adminActions.items[0].actionType, 'tier-review');
  assert.strictEqual(adminAction.item.id, 'action-001');
  assert.strictEqual(operationalActions.items[0].actionType, 'availability-check-in');
  assert.strictEqual(operationalAction.item.id, 'action-001');

  await assert.rejects(() => professionals.listAdminActions(), /professionalId is required/);
  await assert.rejects(() => professionals.runAdminAction('pro-001'), /actionType is required/);
  await assert.rejects(() => professionals.listOperationalActions(), /professionalId is required/);
  await assert.rejects(() => professionals.runOperationalAction('pro-001'), /actionType is required/);

  console.log('unit:test_professionals_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
