const { createApp, createMemoryRepository } = require('../packages/api-server/src');

function normalizeWhatsAppRecipient(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (digits.startsWith('27')) {
    return digits;
  }

  if (digits.startsWith('0')) {
    return `27${digits.slice(1)}`;
  }

  return digits;
}

async function main() {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_TOKEN;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const testRecipient = normalizeWhatsAppRecipient(process.env.WHATSAPP_TEST_RECIPIENT);

  if (!verifyToken || !accessToken || !phoneNumberId || !testRecipient) {
    console.error('Meta WhatsApp smoke test skipped: set WHATSAPP_WEBHOOK_TOKEN, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_TEST_RECIPIENT.');
    process.exit(0);
  }

  const repository = await createMemoryRepository();
  await repository.initialize();
  const app = createApp({ repository, logger: console });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const verificationResponse = await fetch(`${baseUrl}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=smoke-challenge`);
    const verificationBody = await verificationResponse.text();
    if (verificationResponse.status !== 200 || verificationBody !== 'smoke-challenge') {
      throw new Error(`Webhook verification failed with ${verificationResponse.status}: ${verificationBody}`);
    }

    const payload = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: testRecipient,
              text: { body: 'Hi' }
            }]
          }
        }]
      }]
    };

    const webhookResponse = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const webhookResult = await webhookResponse.json();
    if (!webhookResponse.ok) {
      throw new Error(`Webhook processing failed with ${webhookResponse.status}`);
    }
    if (!webhookResult.processed || !Array.isArray(webhookResult.replies) || webhookResult.replies.length === 0) {
      throw new Error('Webhook processing did not produce any replies');
    }

    console.log('verification:', verificationBody);
    console.log('processed:', webhookResult.processed);
    console.log('normalized recipient:', testRecipient);
    console.log('reply preview:', webhookResult.replies[0].reply.reply.split('\n')[0]);
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error('Meta WhatsApp smoke test failed:', error && error.message ? error.message : error);
  process.exit(1);
});