// Omnichannel router: WhatsApp, SMS, Email, Web
const { sendSMS } = require('./smsGateway');
const { sendEmail } = require('./emailGateway');
// WhatsApp and Web handled elsewhere

async function sendNotification(user, message) {
  switch (user.channel) {
    case 'sms':
      return sendSMS(user.phone, message);
    case 'email':
      return sendEmail(user.email, 'TFX Hub Notification', message);
    case 'whatsapp':
      // WhatsApp logic (existing)
      break;
    case 'web':
      // Web notification logic (dashboard, etc.)
      break;
    default:
      throw new Error('Unknown channel');
  }
}

module.exports = { sendNotification };
