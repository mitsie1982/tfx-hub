const assert = require('assert');
const { createWhatsappCustomerApi } = require('../../../packages/shared-logic/src/whatsappCustomer');

async function run() {
  const calls = [];
  const client = {
    async get(url, config) {
      calls.push({ method: 'GET', url, config });
      return { data: { item: { phoneNumber: '+27710000003', linked: true, screen: 'menu' } } };
    },
    async post(url, body, config) {
      calls.push({ method: 'POST', url, body, config });
      return { data: { reply: 'Welcome back, Ayanda.', session: { phoneNumber: body.phoneNumber } } };
    }
  };

  const whatsapp = createWhatsappCustomerApi(client, { associationId: 'assoc-001' });
  const session = await whatsapp.getSession('+27710000003');
  const reply = await whatsapp.sendMessage('+27710000003', 'Hi');

  assert.strictEqual(session.item.linked, true);
  assert.strictEqual(reply.session.phoneNumber, '+27710000003');
  assert.strictEqual(calls[0].config.headers['x-association-id'], 'assoc-001');

  console.log('unit:test_whatsapp_customer_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => { console.error(error); process.exit(1); });
}