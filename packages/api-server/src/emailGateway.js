// Email Gateway integration (Nodemailer placeholder)
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendEmail(to, subject, text) {
  return transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}

module.exports = { sendEmail };
