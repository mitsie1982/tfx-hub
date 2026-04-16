// src/whatsapp/webhook.js
// WhatsApp Webhook Handler for TFX Hub
// Uses Meta Cloud API (recommended for production)

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Replace with your WhatsApp API credentials
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_URL = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

// Helper to send WhatsApp message
async function sendWhatsAppMessage(to, text) {
  await axios.post(API_URL, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  }, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
  });
}

// Webhook endpoint
router.post('/webhook', async (req, res) => {
  const body = req.body;
  // Parse WhatsApp message
  const entry = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!entry) return res.sendStatus(200);

  const from = entry.from;
  const text = entry.text?.body?.toLowerCase() || '';

  // Simple intent parsing
  // For demo, assume jobId is 'demo-job-1' and provider is 'stripe'. In production, extract from session or message.
  const jobId = 'demo-job-1';
  const provider = 'stripe';
  const apiBase = process.env.TFX_API_BASE_URL || 'http://localhost:4000/api';

  if (text.includes('contract')) {
    // Digital contract flow
    if (text.includes('initiate')) {
      // Initiate contract
      try {
        const resp = await axios.post(`${apiBase}/jobs/${jobId}/contract/initiate`, {});
        await sendWhatsAppMessage(from, `Contract initiated for job ${jobId}. Reply 'sign as client' or 'sign as contractor' to sign.`);
      } catch (e) {
        await sendWhatsAppMessage(from, 'Failed to initiate contract.');
      }
    } else if (text.includes('sign as client')) {
      try {
        await axios.post(`${apiBase}/jobs/${jobId}/contract/sign`, { role: 'client' });
        await sendWhatsAppMessage(from, 'You (client) have signed the contract.');
      } catch (e) {
        await sendWhatsAppMessage(from, 'Failed to sign contract as client.');
      }
    } else if (text.includes('sign as contractor')) {
      try {
        await axios.post(`${apiBase}/jobs/${jobId}/contract/sign`, { role: 'contractor' });
        await sendWhatsAppMessage(from, 'You (contractor) have signed the contract.');
      } catch (e) {
        await sendWhatsAppMessage(from, 'Failed to sign contract as contractor.');
      }
    } else if (text.includes('status')) {
      try {
        const resp = await axios.get(`${apiBase}/jobs/${jobId}/contract`);
        const c = resp.data.contract;
        await sendWhatsAppMessage(from, `Contract status: ${c.status}. Client signed: ${c.clientSigned}. Contractor signed: ${c.contractorSigned}.`);
      } catch (e) {
        await sendWhatsAppMessage(from, 'Failed to get contract status.');
      }
    } else {
      await sendWhatsAppMessage(from, 'Contract commands: "contract initiate", "contract sign as client", "contract sign as contractor", "contract status".');
    }
  } else if (text.includes('pay')) {
    // Call /api/jobs/:id/payment-link
    try {
      const resp = await axios.post(`${apiBase}/jobs/${jobId}/payment-link`, {
        provider,
        amount: 1000,
        currency: 'ZAR',
        clientId: from,
        description: 'Job payment via WhatsApp'
      });
      await sendWhatsAppMessage(from, `Payment link: ${resp.data.link}`);
    } catch (e) {
      await sendWhatsAppMessage(from, 'Failed to generate payment link.');
    }
  } else if (text.includes('confirm')) {
    // Call /api/jobs/:id/confirm-client
    try {
      await axios.post(`${apiBase}/jobs/${jobId}/confirm-client`, {});
      await sendWhatsAppMessage(from, 'Thank you for confirming job completion.');
    } catch (e) {
      await sendWhatsAppMessage(from, 'Failed to confirm completion.');
    }
  } else if (text.includes('status')) {
    // Query job/payment status (stub)
    await sendWhatsAppMessage(from, 'Your payment is in escrow.');
  } else {
    await sendWhatsAppMessage(from, 'Welcome to TFX Hub! Reply with "pay" to get a payment link, "confirm" to confirm completion, or "status" for updates.');
  }

  res.sendStatus(200);
});

module.exports = router;
