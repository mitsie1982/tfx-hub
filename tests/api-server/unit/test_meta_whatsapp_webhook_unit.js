const assert = require('assert');
const {
  buildMetaReplyPayload,
  collectInboundMessages,
  createMetaWhatsAppSender,
  createMetaWhatsAppWebhookAdapter,
  extractIncomingText
} = require('../../../packages/api-server/src/metaWhatsAppWebhook');

async function run() {
  assert.strictEqual(extractIncomingText({ text: { body: 'Hi' } }), 'Hi');
  assert.strictEqual(extractIncomingText({ button: { text: 'My Leads' } }), 'My Leads');
  assert.strictEqual(extractIncomingText({ interactive: { button_reply: { title: 'Interested' } } }), 'Interested');

  const inbound = collectInboundMessages({
    entry: [{
      changes: [{
        value: {
          messages: [
            { from: '27710000001', text: { body: 'Hi' } },
            { from: '27710000002', interactive: { button_reply: { title: 'My Leads' } } }
          ]
        }
      }]
    }]
  });

  assert.strictEqual(inbound.length, 2);
  assert.strictEqual(inbound[0].message, 'Hi');
  assert.strictEqual(inbound[1].message, 'My Leads');

  const buttonPayload = buildMetaReplyPayload({
    to: '27710000001',
    text: 'Choose an option',
    options: ['1', '2', '3']
  });
  assert.strictEqual(buttonPayload.type, 'interactive');
  assert.strictEqual(buttonPayload.interactive.type, 'button');
  assert.strictEqual(buttonPayload.interactive.action.buttons.length, 3);

  const listPayload = buildMetaReplyPayload({
    to: '27710000001',
    text: 'Reply with a number:',
    options: ['1', '2', '3', '4']
  });
  assert.strictEqual(listPayload.type, 'interactive');
  assert.strictEqual(listPayload.interactive.type, 'list');
  assert.strictEqual(listPayload.interactive.action.sections[0].rows.length, 4);

  const fetchCalls = [];
  const sender = createMetaWhatsAppSender({
    accessToken: 'token-123',
    phoneNumberId: 'phone-123',
    fetchImpl: async (url, config) => {
      fetchCalls.push({ url, config });
      return {
        ok: true,
        async json() {
          return { messages: [{ id: 'wamid.123' }] };
        }
      };
    },
    logger: { info() {}, warn() {}, error() {} }
  });

  const sendResult = await sender.sendReply({ to: '27710000001', text: 'Welcome back', options: ['1', '2', '3', '4'] });
  assert.strictEqual(sendResult.channel, 'meta');
  assert.strictEqual(fetchCalls.length, 1);
  assert.ok(fetchCalls[0].url.includes('/phone-123/messages'));
  const sentBody = JSON.parse(fetchCalls[0].config.body);
  assert.strictEqual(sentBody.type, 'interactive');
  assert.strictEqual(sentBody.interactive.type, 'list');

  const originalGraphBaseUrl = process.env.WHATSAPP_GRAPH_API_BASE_URL;
  process.env.WHATSAPP_GRAPH_API_BASE_URL = 'http://127.0.0.1:4010/mock-meta';
  const envFetchCalls = [];
  const envConfiguredSender = createMetaWhatsAppSender({
    accessToken: 'token-456',
    phoneNumberId: 'phone-456',
    fetchImpl: async (url, config) => {
      envFetchCalls.push({ url, config });
      return {
        ok: true,
        async json() {
          return { messages: [{ id: 'wamid.456' }] };
        }
      };
    },
    logger: { info() {}, warn() {}, error() {} }
  });
  await envConfiguredSender.sendReply({ to: '27710000001', text: 'Testing env base URL' });
  assert.strictEqual(envFetchCalls[0].url, 'http://127.0.0.1:4010/mock-meta/phone-456/messages');
  if (typeof originalGraphBaseUrl === 'string') {
    process.env.WHATSAPP_GRAPH_API_BASE_URL = originalGraphBaseUrl;
  } else {
    delete process.env.WHATSAPP_GRAPH_API_BASE_URL;
  }

  const loggedMessages = [];
  const fallbackSender = createMetaWhatsAppSender({
    logger: {
      info(message, payload) {
        loggedMessages.push({ message, payload });
      },
      warn() {},
      error() {}
    }
  });
  const fallbackResult = await fallbackSender.sendReply({ to: '27710000001', text: 'Logged locally', options: ['1', '2'] });
  assert.strictEqual(fallbackResult.channel, 'log');
  assert.strictEqual(loggedMessages[0].message, 'meta whatsapp reply logged locally');

  const contractorCalls = [];
  const customerCalls = [];
  const senderCalls = [];
  const adapter = createMetaWhatsAppWebhookAdapter({
    verifyToken: 'verify-123',
    contractorService: {
      async handleIncomingMessage({ phoneNumber, message }) {
        contractorCalls.push({ phoneNumber, message });
        return { reply: `Echo: ${message}` };
      }
    },
    serviceRouter: async ({ phoneNumber }) => (phoneNumber === '27710000003'
      ? {
        async handleIncomingMessage({ phoneNumber: target, message }) {
          customerCalls.push({ phoneNumber: target, message });
          return { reply: `Customer: ${message}` };
        }
      }
      : null),
    sender: {
      async sendReply(payload) {
        senderCalls.push(payload);
      }
    },
    logger: { info() {}, warn() {}, error() {} }
  });

  const verification = adapter.verify({
    'hub.mode': 'subscribe',
    'hub.verify_token': 'verify-123',
    'hub.challenge': 'challenge-abc'
  });
  assert.deepStrictEqual(verification, { ok: true, challenge: 'challenge-abc' });
  assert.deepStrictEqual(adapter.verify({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong' }), { ok: false });

  const processed = await adapter.processPayload({
    entry: [{
      changes: [{
        value: {
          messages: [
            { from: '27710000001', text: { body: 'Hi' } },
            { from: '27710000003', text: { body: 'Menu' } }
          ]
        }
      }]
    }]
  });

  assert.strictEqual(processed.processed, 2);
  assert.strictEqual(contractorCalls[0].phoneNumber, '27710000001');
  assert.strictEqual(customerCalls[0].phoneNumber, '27710000003');
  assert.strictEqual(senderCalls[0].to, '27710000001');
  assert.strictEqual(senderCalls[0].text, 'Echo: Hi');
  assert.strictEqual(senderCalls[1].to, '27710000003');
  assert.strictEqual(senderCalls[1].text, 'Customer: Menu');

  console.log('unit:test_meta_whatsapp_webhook_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}