// services/backend/src/middleware/api_gateway.js
// Simple API gateway middleware: API key auth, basic in-memory rate limiting and request logging.
// Replace in-memory stores with Redis or a dedicated gateway for production.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load apps store (for scaffold only)
let apps = {};
try {
  const reg = require('../routes/api_keys');
  // Access internal apps store if available (scaffold)
  apps = reg.apps || {};
} catch (e) { apps = {}; }

const rateWindows = {}; // { apiKeyHash: { windowStart, count } }

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

module.exports = function apiGateway(req, res, next) {
  // Allow public docs
  if (req.path.startsWith('/docs') || req.path.startsWith('/developer')) return next();

  const apiKey = req.header('X-API-Key') || '';
  if (!apiKey) return res.status(401).json({ error: 'Missing API key' });

  const keyHash = hashKey(apiKey);
  // Find app by hash
  const appEntry = Object.entries(apps).find(([k,v]) => v.apiKeyHash === keyHash);
  if (!appEntry) return res.status(401).json({ error: 'Invalid API key' });

  const appId = appEntry[0];
  const app = appEntry[1];

  // Rate limiting (simple fixed window)
  const now = Math.floor(Date.now() / 1000);
  const windowSize = app.rateLimit?.window || 3600;
  const limit = app.rateLimit?.limit || 1000;
  const state = rateWindows[keyHash] || { windowStart: now, count: 0 };
  if (now - state.windowStart >= windowSize) {
    state.windowStart = now;
    state.count = 0;
  }
  state.count += 1;
  rateWindows[keyHash] = state;
  if (state.count > limit) return res.status(429).json({ error: 'Rate limit exceeded' });

  // Attach app info to request
  req.apiApp = { appId, name: app.name, ownerEmail: app.ownerEmail };
  // Basic request logging
  console.log(`[API] ${req.method} ${req.path} app=${appId} ip=${req.ip}`);
  next();
};
