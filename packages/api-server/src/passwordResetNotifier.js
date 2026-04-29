let nodemailer = null;

try {
  nodemailer = require('nodemailer');
} catch (error) {
  nodemailer = null;
}

function hasSmtpConfig(options = {}) {
  return Boolean(
    options.host || process.env.SMTP_HOST
  );
}

function createPasswordResetNotifier(options = {}) {
  const logger = options.logger || { info() {}, warn() {}, error() {} };
  const smtpHost = options.host || process.env.SMTP_HOST;
  const smtpPort = Number(options.port || process.env.SMTP_PORT || 587);
  const smtpUser = options.user || process.env.SMTP_USER;
  const smtpPass = options.password || process.env.SMTP_PASS;
  const fromEmail = options.fromEmail || process.env.SMTP_FROM || 'no-reply@tfxhub.local';
  const transportFactory = options.transportFactory || ((config) => nodemailer.createTransport(config));

  async function sendViaLogger(payload) {
    logger.info('password reset token issued', {
      email: payload.email,
      resetToken: payload.token,
      expiresAt: payload.expiresAt
    });

    return {
      channel: 'log',
      resetToken: payload.token
    };
  }

  async function sendViaEmail(payload) {
    if (!nodemailer || !hasSmtpConfig({ host: smtpHost })) {
      return sendViaLogger(payload);
    }

    const transporter = transportFactory({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined
    });

    await transporter.sendMail({
      from: fromEmail,
      to: payload.email,
      subject: 'TFX Hub password reset',
      text: `Use this password reset token: ${payload.token}\nIt expires at ${payload.expiresAt}.`
    });

    logger.info('password reset email sent', { email: payload.email, expiresAt: payload.expiresAt });
    return {
      channel: 'email'
    };
  }

  return {
    async sendPasswordReset(payload) {
      try {
        return await sendViaEmail(payload);
      } catch (error) {
        logger.warn('password reset delivery fell back to log', { email: payload.email, message: error.message });
        return sendViaLogger(payload);
      }
    }
  };
}

module.exports = {
  createPasswordResetNotifier
};
