// Public API authentication middleware (API key based)
const API_KEYS = (process.env.TFX_PUBLIC_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || !API_KEYS.includes(key)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

module.exports = { requireApiKey };
