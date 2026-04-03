const assert = require('assert');
const { createWhatsappProfessionalApi } = require('../../../packages/shared-logic/src/whatsappProfessional');

async function run() {
  const calls = [];
  const client = {
    async get(url, config) {
      calls.push({ method: 'GET', url, config });
      return { data: { item: { phoneNumber: '+27710000006', linked: true, screen: 'menu' } } };
    },
    async post(url, body, config) {
      calls.push({ method: 'POST', url, body, config });
      return { data: { reply: 'Welcome back, Lerato.', session: { phoneNumber: body.phoneNumber } } };
    }
  };

  const whatsapp = createWhatsappProfessionalApi(client, { associationId: 'assoc-001' });
  const session = await whatsapp.getSession('+27710000006');
  const reply = await whatsapp.sendMessage('+27710000006', 'Hi');

  assert.strictEqual(session.item.linked, true);
  assert.strictEqual(reply.session.phoneNumber, '+27710000006');
  assert.strictEqual(calls[0].config.headers['x-association-id'], 'assoc-001');

  console.log('unit:test_whatsapp_professional_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => { console.error(error); process.exit(1); });
}