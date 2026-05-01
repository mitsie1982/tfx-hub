// services/backend/src/routes/api_keys.js
// App registration and API key management (scaffold).
// Replace in-memory store with persistent DB and secure key generation.

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

let apps = {}; // { appId: { name, owner, apiKeyHash, createdAt, rateLimit } }

// Helper: hash API key for storage
function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Register application (public)
router.post('/developer/register', (req, res) => {
  const { name, ownerEmail } = req.body;
  if (!name || !ownerEmail) return res.status(400).json({ error: 'Missing fields' });
  const appId = 'app_' + crypto.randomBytes(6).toString('hex');
  const apiKey = 'sk_' + crypto.randomBytes(24).toString('hex');
  apps[appId] = { name, ownerEmail, apiKeyHash: hashKey(apiKey), createdAt: new Date().toISOString(), rateLimit: { window: 3600, limit: 1000 } };
  // In production: send API key to owner via secure channel and store only hash
  return res.json({ appId, apiKey });
});

// Rotate API key (owner authenticated)
router.post('/developer/:appId/rotate', (req, res) => {
  const appId = req.params.appId;
  if (!apps[appId]) return res.status(404).json({ error: 'App not found' });
  const newKey = 'sk_' + crypto.randomBytes(24).toString('hex');
  apps[appId].apiKeyHash = hashKey(newKey);
  return res.json({ appId, apiKey: newKey });
});

// List apps (admin)
router.get('/developer/apps', (req, res) => {
  return res.json({ apps });
});

module.exports = router;
