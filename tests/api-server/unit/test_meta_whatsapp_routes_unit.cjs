const assert = require('assert');
const { createApp, createMemoryRepository } = require('../../../packages/api-server/src');

async function run() {
  const repository = await createMemoryRepository();
  await repository.initialize();

  const senderCalls = [];
  const app = createApp({
    repository,
    logger: { info() {}, warn() {}, error() {} },
    metaWebhookOptions: {
      verifyToken: 'verify-123',
      sender: {
        async sendReply(payload) {
          senderCalls.push(payload);
          return { channel: 'test', payload };
        }
      }
    }
  });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const verifyOk = await fetch(`${baseUrl}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=verify-123&hub.challenge=challenge-abc`);
    const verifyOkBody = await verifyOk.text();
    assert.strictEqual(verifyOk.status, 200);
    assert.strictEqual(verifyOkBody, 'challenge-abc');

    const verifyFail = await fetch(`${baseUrl}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge-abc`);
    const verifyFailBody = await verifyFail.text();
    assert.strictEqual(verifyFail.status, 403);
    assert.strictEqual(verifyFailBody, 'forbidden');

    const webhookResponse = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [
                { from: '27710000001', text: { body: 'Hi' } },
                { from: '27710000003', text: { body: 'Hi' } },
                { from: '27710000004', text: { body: 'Hi' } },
                { from: '27710000005', text: { body: 'Hi' } },
                { from: '27710000006', text: { body: 'Hi' } }
              ]
            }
          }]
        }]
      })
    });
    const webhookPayload = await webhookResponse.json();

    assert.strictEqual(webhookResponse.status, 200);
    assert.strictEqual(webhookPayload.ok, true);
    assert.strictEqual(webhookPayload.processed, 5);
    assert.ok(webhookPayload.replies[0].reply.reply.includes('Welcome back'));
    assert.ok(webhookPayload.replies[1].reply.reply.includes('Welcome back, Michelle'));
    assert.ok(webhookPayload.replies[2].reply.reply.includes('Admin WhatsApp access is disabled'));
    assert.ok(webhookPayload.replies[3].reply.reply.includes('Welcome back, TFX'));
    assert.ok(webhookPayload.replies[4].reply.reply.includes('Welcome back, Lerato'));
    assert.strictEqual(senderCalls.length, 5);
    assert.strictEqual(senderCalls[0].to, '27710000001');
    assert.strictEqual(senderCalls[1].to, '27710000003');
    assert.strictEqual(senderCalls[2].to, '27710000004');
    assert.strictEqual(senderCalls[3].to, '27710000005');
    assert.strictEqual(senderCalls[4].to, '27710000006');
    assert.ok(Array.isArray(senderCalls[0].options));
    assert.strictEqual(senderCalls[0].options.length, 7);
    assert.strictEqual(senderCalls[1].options.length, 4);
    assert.strictEqual(senderCalls[2].options.length, 0);
    assert.strictEqual(senderCalls[3].options.length, 5);
    assert.strictEqual(senderCalls[4].options.length, 6);

    const sessionResponse = await fetch(`${baseUrl}/whatsapp/contractor/session/%2B27710000001`);
    const sessionPayload = await sessionResponse.json();
    assert.strictEqual(sessionResponse.status, 200);
    assert.strictEqual(sessionPayload.item.linked, true);
    assert.strictEqual(sessionPayload.item.screen, 'menu');

    const unlinkedWebhookResponse = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{ from: '27717770000', text: { body: 'Hi' } }]
            }
          }]
        }]
      })
    });
    const unlinkedWebhookPayload = await unlinkedWebhookResponse.json();
    assert.strictEqual(unlinkedWebhookResponse.status, 200);
    assert.ok(unlinkedWebhookPayload.replies[0].reply.reply.includes('Reply with your role'));
    assert.ok(!unlinkedWebhookPayload.replies[0].reply.reply.includes('Admin'));

    async function postMetaMessage(phoneNumber, message) {
      const response = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entry: [{
            changes: [{
              value: {
                messages: [{ from: phoneNumber, text: { body: message } }]
              }
            }]
          }]
        })
      });
      assert.strictEqual(response.status, 200);
      return response.json();
    }

    const associationRolePrompt = await postMetaMessage('27718880041', 'Hi');
    assert.ok(associationRolePrompt.replies[0].reply.reply.includes('Reply with your role'));
    const associationChoice = await postMetaMessage('27718880041', '3');
    assert.ok(associationChoice.replies[0].reply.reply.includes('Register new association account'));
    await postMetaMessage('27718880041', '2');
    await postMetaMessage('27718880041', 'Meta Association');
    const associationRegistered = await postMetaMessage('27718880041', 'meta-association@example.com');
    assert.ok(associationRegistered.replies[0].reply.reply.includes('Welcome back, Meta.'));

    const professionalRolePrompt = await postMetaMessage('27718880051', 'Hi');
    assert.ok(professionalRolePrompt.replies[0].reply.reply.includes('Reply with your role'));
    await postMetaMessage('27718880051', '4');
    await postMetaMessage('27718880051', '2');
    await postMetaMessage('27718880051', 'Meta Professional');
    await postMetaMessage('27718880051', 'electrician');
    const professionalRegistered = await postMetaMessage('27718880051', 'meta-professional@example.com');
    assert.ok(professionalRegistered.replies[0].reply.reply.includes('Welcome back, Meta.'));

    const adminRolePrompt = await postMetaMessage('27718880031', 'Hi');
    assert.ok(adminRolePrompt.replies[0].reply.reply.includes('Reply with your role'));
    const adminBlocked = await postMetaMessage('27718880031', 'admin');
    assert.ok(adminBlocked.replies[0].reply.reply.includes('Admin WhatsApp access is disabled'));

    console.log('unit:test_meta_whatsapp_routes_unit OK');
  } finally {
    server.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
