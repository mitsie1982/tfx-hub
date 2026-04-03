const assert = require('assert');
const http = require('http');
const { createApp, createMemoryRepository } = require('../packages/api-server/src');

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function stopServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
}

async function main() {
  const capturedRequests = [];
  const rolePhones = ['27710000001', '27710000003', '27710000004', '27710000005', '27710000006'];
  const fakeMetaServer = await startServer(async (req, res) => {
    if (req.method === 'POST' && /\/mock-meta\/[^/]+\/messages$/.test(req.url || '')) {
      const payload = await readJsonBody(req);
      capturedRequests.push({
        url: req.url,
        authorization: req.headers.authorization,
        payload
      });

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        messages: [{ id: 'wamid.mock-local-001' }],
        contacts: [{ wa_id: payload.to }]
      }));
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });

  const fakeMetaPort = fakeMetaServer.address().port;
  const originalEnv = {
    WHATSAPP_WEBHOOK_TOKEN: process.env.WHATSAPP_WEBHOOK_TOKEN,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_GRAPH_API_BASE_URL: process.env.WHATSAPP_GRAPH_API_BASE_URL,
    WHATSAPP_GRAPH_API_VERSION: process.env.WHATSAPP_GRAPH_API_VERSION
  };

  process.env.WHATSAPP_WEBHOOK_TOKEN = 'local-verify-token';
  process.env.WHATSAPP_ACCESS_TOKEN = 'local-access-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'local-phone-number-id';
  process.env.WHATSAPP_GRAPH_API_BASE_URL = `http://127.0.0.1:${fakeMetaPort}/mock-meta`;
  process.env.WHATSAPP_GRAPH_API_VERSION = 'v18.0';

  let appServer;
  try {
    const repository = await createMemoryRepository();
    await repository.initialize();

    const app = createApp({ repository, logger: { info() {}, warn() {}, error() {} } });
    appServer = await new Promise((resolve) => {
      const server = app.listen(0, '127.0.0.1', () => resolve(server));
    });

    const appPort = appServer.address().port;
    const baseUrl = `http://127.0.0.1:${appPort}`;

    const verifyResponse = await fetch(`${baseUrl}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=local-verify-token&hub.challenge=local-challenge`);
    const verifyBody = await verifyResponse.text();
    assert.strictEqual(verifyResponse.status, 200);
    assert.strictEqual(verifyBody, 'local-challenge');

    const inboundPayload = {
      entry: [{
        changes: [{
          value: {
            messages: rolePhones.map((phoneNumber) => ({
              from: phoneNumber,
              text: { body: 'Hi' }
            }))
          }
        }]
      }]
    };

    const webhookResponse = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(inboundPayload)
    });
    const webhookResult = await webhookResponse.json();

    assert.strictEqual(webhookResponse.status, 200);
    assert.strictEqual(webhookResult.ok, true);
    assert.strictEqual(webhookResult.processed, 5);
    assert.ok(Array.isArray(webhookResult.replies));
    assert.ok(webhookResult.replies[0].reply.reply.includes('Welcome back'));
    assert.ok(webhookResult.replies[1].reply.reply.includes('Welcome back, Ayanda'));
    assert.ok(webhookResult.replies[2].reply.reply.includes('Admin WhatsApp access is disabled'));
    assert.ok(webhookResult.replies[3].reply.reply.includes('Welcome back, TFX'));
    assert.ok(webhookResult.replies[4].reply.reply.includes('Welcome back, Lerato'));

    assert.strictEqual(capturedRequests.length, 5);
    assert.strictEqual(capturedRequests[0].authorization, 'Bearer local-access-token');
    assert.deepStrictEqual(capturedRequests.map((item) => item.payload.to), rolePhones);
    assert.strictEqual(capturedRequests[0].payload.type, 'interactive');
    assert.strictEqual(capturedRequests[0].payload.interactive.type, 'list');
    assert.strictEqual(capturedRequests[1].payload.interactive.type, 'list');
    assert.strictEqual(capturedRequests[2].payload.type, 'text');
    assert.strictEqual(capturedRequests[3].payload.interactive.type, 'list');
    assert.strictEqual(capturedRequests[4].payload.interactive.type, 'list');

    const sessionResponse = await fetch(`${baseUrl}/whatsapp/contractor/session/%2B27710000001`);
    const sessionResult = await sessionResponse.json();
    assert.strictEqual(sessionResponse.status, 200);
    assert.strictEqual(sessionResult.item.linked, true);
    assert.strictEqual(sessionResult.item.screen, 'menu');

    const onboardingWebhookResponse = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{ from: '27718887777', text: { body: 'Hi' } }]
            }
          }]
        }]
      })
    });
    const onboardingWebhook = await onboardingWebhookResponse.json();
    assert.ok(onboardingWebhook.replies[0].reply.reply.includes('Reply with your role'));
    assert.ok(!onboardingWebhook.replies[0].reply.reply.includes('Admin'));

    const onboardingSelectResponse = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{ from: '27718887777', text: { body: '3' } }]
            }
          }]
        }]
      })
    });
    const onboardingSelected = await onboardingSelectResponse.json();
    assert.ok(onboardingSelected.replies[0].reply.reply.includes('Welcome to TFX Hub association WhatsApp'));

    async function sendMetaMessage(phoneNumber, body) {
      const response = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entry: [{
            changes: [{
              value: {
                messages: [{ from: phoneNumber, text: { body } }]
              }
            }]
          }]
        })
      });
      assert.strictEqual(response.status, 200);
      return response.json();
    }

    const associationRolePrompt = await sendMetaMessage('27718880041', 'Hi');
    assert.ok(associationRolePrompt.replies[0].reply.reply.includes('Reply with your role'));
    const associationChoice = await sendMetaMessage('27718880041', '3');
    assert.ok(associationChoice.replies[0].reply.reply.includes('Register new association account'));
    await sendMetaMessage('27718880041', '2');
    await sendMetaMessage('27718880041', 'Meta Association');
    const associationRegistered = await sendMetaMessage('27718880041', 'meta-association@example.com');
    assert.ok(associationRegistered.replies[0].reply.reply.includes('Welcome back, Meta.'));

    const professionalRolePrompt = await sendMetaMessage('27718880051', 'Hi');
    assert.ok(professionalRolePrompt.replies[0].reply.reply.includes('Reply with your role'));
    await sendMetaMessage('27718880051', '4');
    await sendMetaMessage('27718880051', '2');
    await sendMetaMessage('27718880051', 'Meta Professional');
    await sendMetaMessage('27718880051', 'electrician');
    const professionalRegistered = await sendMetaMessage('27718880051', 'meta-professional@example.com');
    assert.ok(professionalRegistered.replies[0].reply.reply.includes('Welcome back, Meta.'));

    const adminRolePrompt = await sendMetaMessage('27718880031', 'Hi');
    assert.ok(adminRolePrompt.replies[0].reply.reply.includes('Reply with your role'));
    const adminBlocked = await sendMetaMessage('27718880031', 'admin');
    assert.ok(adminBlocked.replies[0].reply.reply.includes('Admin WhatsApp access is disabled'));

    const associationActionResponse = await fetch(`${baseUrl}/whatsapp/association/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000005', message: '2' })
    });
    const associationActionDirectory = await associationActionResponse.json();
    assert.ok(associationActionDirectory.reply.includes('Professional directory'));

    const associationDetailResponse = await fetch(`${baseUrl}/whatsapp/association/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000005', message: '1' })
    });
    const associationDetail = await associationDetailResponse.json();
    assert.ok(associationDetail.reply.includes('Reply:'));

    const associationQueuedResponse = await fetch(`${baseUrl}/whatsapp/association/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000005', message: '1' })
    });
    const associationQueued = await associationQueuedResponse.json();
    assert.ok(associationQueued.reply.includes('Member review queued'));

    const professionalAvailabilityResponse = await fetch(`${baseUrl}/whatsapp/professional/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000006', message: '3' })
    });
    const professionalAvailability = await professionalAvailabilityResponse.json();
    assert.ok(professionalAvailability.reply.includes('Availability check-in recorded'));

    console.log('local Meta verification:', verifyBody);
    console.log('local Meta processed:', webhookResult.processed);
    console.log('local Meta outbound type:', capturedRequests[0].payload.interactive.type);
    console.log('local Meta recipients:', capturedRequests.map((item) => item.payload.to).join(','));
  } finally {
    if (appServer) {
      await stopServer(appServer);
    }
    await stopServer(fakeMetaServer);

    Object.entries(originalEnv).forEach(([key, value]) => {
      if (typeof value === 'string') {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });
  }
}

main().catch((error) => {
  console.error('Local Meta WhatsApp smoke test failed:', error && error.message ? error.message : error);
  process.exit(1);
});