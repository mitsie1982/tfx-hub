const { createApp, createMemoryRepository } = require('../packages/api-server/src');

async function waitForMailpitMessage(baseUrl, expectedRecipient, timeoutMs = 15000) {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    const response = await fetch(`${baseUrl}/api/v1/messages`);
    if (!response.ok) {
      throw new Error(`Mailpit API returned ${response.status}`);
    }

    const payload = await response.json();
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const match = messages.find((message) => Array.isArray(message.To) && message.To.some((recipient) => recipient.Address === expectedRecipient));
    if (match) {
      return match;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for Mailpit message to ${expectedRecipient}`);
}

async function fetchMessageText(baseUrl, messageId) {
  const response = await fetch(`${baseUrl}/api/v1/message/${messageId}`);
  if (!response.ok) {
    throw new Error(`Unable to fetch Mailpit message ${messageId}: ${response.status}`);
  }

  const payload = await response.json();
  return payload.Text || '';
}

async function main() {
  const smtpHost = process.env.SMTP_HOST || '127.0.0.1';
  const smtpPort = process.env.SMTP_PORT || '1025';
  const smtpFrom = process.env.SMTP_FROM || 'no-reply@tfxhub.local';
  const mailpitBaseUrl = process.env.MAILPIT_BASE_URL || 'http://127.0.0.1:8025';
  const resetEmail = process.env.SMOKE_RESET_EMAIL || 'contractor@example.com';

  process.env.SMTP_HOST = smtpHost;
  process.env.SMTP_PORT = smtpPort;
  process.env.SMTP_FROM = smtpFrom;

  const repository = await createMemoryRepository();
  await repository.initialize();

  const app = createApp({ repository, logger: console });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const response = await fetch(`${baseUrl}/auth/password-reset/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: resetEmail })
    });

    if (!response.ok) {
      throw new Error(`Password reset request failed with ${response.status}`);
    }

    const result = await response.json();
    if (!result.delivery || result.delivery.channel !== 'email') {
      throw new Error(`Expected email delivery but received ${JSON.stringify(result.delivery)}`);
    }
    if (result.resetToken) {
      throw new Error('Expected reset token to stay out of the API response during SMTP delivery');
    }

    const message = await waitForMailpitMessage(mailpitBaseUrl, resetEmail);
    const text = await fetchMessageText(mailpitBaseUrl, message.ID);

    if (!text.includes('Use this password reset token:')) {
      throw new Error('Mailpit message does not include the password reset token text');
    }

    console.log('delivery:', result.delivery.channel);
    console.log('mailpit message:', message.ID);
    console.log('recipient:', resetEmail);
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error('SMTP smoke test failed:', error && error.message ? error.message : error);
  process.exit(1);
});
