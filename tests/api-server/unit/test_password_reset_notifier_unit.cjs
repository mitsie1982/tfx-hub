const assert = require('assert');
const { createPasswordResetNotifier } = require('../../../packages/api-server/src/passwordResetNotifier');

async function run() {
  const loggerCalls = [];
  const logger = {
    info(message, payload) {
      loggerCalls.push({ level: 'info', message, payload });
    },
    warn(message, payload) {
      loggerCalls.push({ level: 'warn', message, payload });
    },
    error() {}
  };

  const fallbackNotifier = createPasswordResetNotifier({ logger });
  const fallbackResult = await fallbackNotifier.sendPasswordReset({
    email: 'contractor@example.com',
    token: 'reset-001',
    expiresAt: '2026-04-02T15:30:00.000Z'
  });

  assert.deepStrictEqual(fallbackResult, { channel: 'log', resetToken: 'reset-001' });
  assert.strictEqual(loggerCalls[0].message, 'password reset token issued');
  assert.strictEqual(loggerCalls[0].payload.email, 'contractor@example.com');

  const sentMessages = [];
  const emailNotifier = createPasswordResetNotifier({
    logger,
    host: 'smtp.example.com',
    port: 465,
    user: 'mailer',
    password: 'secret',
    fromEmail: 'support@example.com',
    transportFactory(config) {
      assert.strictEqual(config.host, 'smtp.example.com');
      assert.strictEqual(config.port, 465);
      assert.strictEqual(config.secure, true);
      return {
        async sendMail(message) {
          sentMessages.push(message);
        }
      };
    }
  });

  const emailResult = await emailNotifier.sendPasswordReset({
    email: 'pro@example.com',
    token: 'reset-002',
    expiresAt: '2026-04-02T16:00:00.000Z'
  });

  assert.deepStrictEqual(emailResult, { channel: 'email' });
  assert.strictEqual(sentMessages.length, 1);
  assert.strictEqual(sentMessages[0].to, 'pro@example.com');
  assert.ok(sentMessages[0].text.includes('reset-002'));

  const warningCalls = [];
  const flakyNotifier = createPasswordResetNotifier({
    logger: {
      info() {},
      warn(message, payload) {
        warningCalls.push({ message, payload });
      },
      error() {}
    },
    host: 'smtp.example.com',
    transportFactory() {
      throw new Error('SMTP unavailable');
    }
  });

  const flakyResult = await flakyNotifier.sendPasswordReset({
    email: 'fallback@example.com',
    token: 'reset-003',
    expiresAt: '2026-04-02T17:00:00.000Z'
  });

  assert.deepStrictEqual(flakyResult, { channel: 'log', resetToken: 'reset-003' });
  assert.strictEqual(warningCalls.length, 1);
  assert.strictEqual(warningCalls[0].message, 'password reset delivery fell back to log');

  console.log('unit:test_password_reset_notifier_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
