const assert = require('assert');
const { createContractorApi } = require('../../../packages/shared-logic/src/contractor');

async function run() {
  const calls = [];
  const client = {
    async get(url, config) {
      calls.push({ method: 'GET', url, config });
      if (url === '/contractor/profile') {
        return { data: { item: { professionalId: 'pro-003', name: 'Naledi Khumalo' } } };
      }
      return { data: { items: [{ id: 'hist-001', type: 'quote' }] } };
    },
    async post(url, body, config) {
      calls.push({ method: 'POST', url, body, config });
      return { data: { item: { id: 'out-001', jobId: body.jobId } } };
    }
  };

  const contractor = createContractorApi(client, { associationId: 'assoc-001', platform: 'android' });

  const profile = await contractor.getProfile();
  const history = await contractor.listLeadHistory();
  const quote = await contractor.submitQuote('job-001', { amount: 'R1000' });
  const message = await contractor.sendMessage('job-001', { body: 'Hello' });

  assert.strictEqual(profile.item.professionalId, 'pro-003');
  assert.strictEqual(history.items[0].type, 'quote');
  assert.strictEqual(quote.item.jobId, 'job-001');
  assert.strictEqual(message.item.jobId, 'job-001');
  assert.strictEqual(calls[0].config.headers['x-association-id'], 'assoc-001');

  try {
    await contractor.submitQuote('', { amount: 'R1000' });
    assert.fail('expected missing jobId error');
  } catch (error) {
    assert.ok(error.message.includes('jobId'));
  }

  try {
    await contractor.sendMessage('job-001', { body: '' });
    assert.fail('expected missing message body error');
  } catch (error) {
    assert.ok(error.message.includes('message.body'));
  }

  console.log('unit:test_contractor_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => { console.error(error); process.exit(1); });
}