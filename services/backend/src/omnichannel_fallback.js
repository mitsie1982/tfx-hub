// services/backend/src/omnichannel_fallback.js
// Scaffold: Omnichannel fallback endpoints for non-WhatsApp Members.
// Replace placeholders with production provider SDKs and secure secret retrieval.

const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.json());

// Feature flag check (simple file-based)
const flags = require('../config/feature_flags.json');

// Utility: send SMS (placeholder)
async function sendSms(phoneNumber, message) {
  // TODO: integrate with SMS provider (e.g., Twilio). Use secrets manager for credentials.
  console.log(`SMS to ${phoneNumber}: ${message}`);
  return { success: true };
}

// Utility: send Email (placeholder)
async function sendEmail(email, subject, body) {
  // TODO: integrate with email provider (SMTP, SendGrid, SES). Use secrets manager for credentials.
  console.log(`Email to ${email}: ${subject}\n${body}`);
  return { success: true };
}

// Endpoint: notify member via preferred channel (SMS/Email) when they lack WhatsApp
router.post('/notify-member', async (req, res) => {
  if (!flags.omnichannel_fallback) return res.status(403).json({ error: 'Feature disabled' });
  const { memberId, channel, contact, taskId } = req.body;
  if (!memberId || !channel || !contact || !taskId) return res.status(400).json({ error: 'Missing fields' });

  const message = `You have a new Task (${taskId}). Visit the web dashboard to view and accept.`;

  try {
    if (channel === 'sms' && flags.omnichannel_fallback_sms) {
      await sendSms(contact, message);
    } else if (channel === 'email' && flags.omnichannel_fallback_email) {
      await sendEmail(contact, 'New Task Notification', message);
    } else {
      return res.status(400).json({ error: 'Unsupported channel or disabled' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Notify error', err);
    return res.status(500).json({ error: 'Notification failed' });
  }
});

// Endpoint: web session token for member (one-time login link)
router.post('/request-web-login', async (req, res) => {
  if (!flags.omnichannel_fallback_web) return res.status(403).json({ error: 'Feature disabled' });
  const { memberId, contact } = req.body;
  if (!memberId || !contact) return res.status(400).json({ error: 'Missing fields' });

  // TODO: generate secure, short-lived token and persist with expiry
  const token = 'PLACEHOLDER_TOKEN_' + Date.now();
  const loginUrl = `${process.env.WEB_BASE_URL || 'https://app.example.com'}/omnichannel/login?token=${token}`;

  // Send via SMS or Email depending on contact format
  if (contact.includes('@')) {
    await sendEmail(contact, 'Your web login link', `Use this link to access your dashboard: ${loginUrl}`);
  } else {
    await sendSms(contact, `Access your dashboard: ${loginUrl}`);
  }

  return res.json({ success: true, loginUrl });
});

// Endpoint: accept task via web (requires auth middleware in production)
router.post('/tasks/:taskId/accept', async (req, res) => {
  const { taskId } = req.params;
  const { memberId } = req.body;
  if (!taskId || !memberId) return res.status(400).json({ error: 'Missing fields' });

  // TODO: implement DB update to mark task accepted by member
  console.log(`Member ${memberId} accepted task ${taskId}`);
  return res.json({ success: true, taskId, memberId });
});

// Endpoint: upload file for task (multipart handling recommended)
router.post('/tasks/:taskId/upload', async (req, res) => {
  const { taskId } = req.params;
  // TODO: integrate multer or cloud storage SDK; validate file types and sizes
  console.log(`Upload placeholder for task ${taskId}`);
  return res.json({ success: true });
});

// Endpoint: payment webhook stub
router.post('/payments/webhook', async (req, res) => {
  // TODO: validate signature, update payment status in DB
  console.log('Payment webhook received', req.body);
  return res.status(200).send('OK');
});

module.exports = router;
