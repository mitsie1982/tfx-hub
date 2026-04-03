const assert = require('assert');
const { createWhatsappAssociationApi } = require('../../../packages/shared-logic/src/whatsappAssociation');

async function run() {
  const calls = [];
  const client = {
    async get(url, config) {
      calls.push({ method: 'GET', url, config });
      return { data: { item: { phoneNumber: '+27710000005', linked: true, screen: 'menu' } } };
    },
    async post(url, body, config) {
      calls.push({ method: 'POST', url, body, config });
      return { data: { reply: 'Welcome back, TFX.', session: { phoneNumber: body.phoneNumber } } };
    }
  };

  const whatsapp = createWhatsappAssociationApi(client, { associationId: 'assoc-001' });
  const session = await whatsapp.getSession('+27710000005');
  const reply = await whatsapp.sendMessage('+27710000005', 'Hi');

  assert.strictEqual(session.item.linked, true);
  assert.strictEqual(reply.session.phoneNumber, '+27710000005');
  assert.strictEqual(calls[0].config.headers['x-association-id'], 'assoc-001');

  console.log('unit:test_whatsapp_association_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => { console.error(error); process.exit(1); });
}