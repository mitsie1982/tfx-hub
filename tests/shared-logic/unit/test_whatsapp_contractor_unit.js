const assert = require('assert');
const { createWhatsappContractorApi } = require('../../../packages/shared-logic/src/whatsappContractor');

async function run() {
  const calls = [];
  const client = {
    async get(url, config) {
      calls.push({ method: 'GET', url, config });
      return { data: { item: { phoneNumber: '+27710000001', linked: true, screen: 'menu' } } };
    },
    async post(url, body, config) {
      calls.push({ method: 'POST', url, body, config });
      return { data: { reply: 'Welcome back, Naledi.', session: { phoneNumber: body.phoneNumber } } };
    }
  };

  const whatsapp = createWhatsappContractorApi(client, { associationId: 'assoc-001' });
  const session = await whatsapp.getSession('+27710000001');
  const reply = await whatsapp.sendMessage('+27710000001', 'Hi');

  assert.strictEqual(session.item.linked, true);
  assert.strictEqual(reply.session.phoneNumber, '+27710000001');
  assert.strictEqual(calls[0].config.headers['x-association-id'], 'assoc-001');

  try {
    await whatsapp.sendMessage('', 'Hi');
    assert.fail('expected missing phone number error');
  } catch (error) {
    assert.ok(error.message.includes('phoneNumber'));
  }

  console.log('unit:test_whatsapp_contractor_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => { console.error(error); process.exit(1); });
}
