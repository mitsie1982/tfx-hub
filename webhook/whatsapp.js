// /webhook/whatsapp.js
const express = require("express");
const bodyParser = require("body-parser");
// TODO: Replace with actual service implementations
const { findOrCreateUser, advanceOnboarding, sendWhatsAppTemplate } = require("../services");

const app = express();
app.use(bodyParser.json());

/**
 * WhatsApp onboarding webhook endpoint
 * POST /webhook/whatsapp
 * Body: { from: "+10000000001", text: "Hi" }
 */
app.post("/webhook/whatsapp", async (req, res) => {
  try {
    const event = req.body;
    const phone = event.from;
    const text = event.text?.trim();
    const user = await findOrCreateUser({ phone });
    if (user.onboarding_state === "new") {
      await sendWhatsAppTemplate(phone, "welcome", [user.name || "there"]);
      user.onboarding_state = "awaiting_role";
      await user.save();
      return res.sendStatus(200);
    }
    const next = await advanceOnboarding(user, text);
    if (next.template) {
      await sendWhatsAppTemplate(phone, next.template.name, next.template.vars);
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

module.exports = app;

// Test stub (Jest)
// const request = require('supertest');
// describe('POST /webhook/whatsapp', () => {
//   it('should onboard new user', async () => {
//     // ...mock services and test onboarding flow
//   });
// });
