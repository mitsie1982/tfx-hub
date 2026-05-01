// SMS Gateway integration (Twilio placeholder)
const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;
const client = twilio(accountSid, authToken);

async function sendSMS(to, message) {
  if (!accountSid || !authToken || !fromNumber) throw new Error('Twilio credentials missing');
  return client.messages.create({ body: message, from: fromNumber, to });
}

module.exports = { sendSMS };
