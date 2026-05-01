// Simple rate limiter middleware (per API key)
const rateLimitWindowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 60;
const usage = new Map();

function rateLimiter(req, res, next) {
  const key = req.headers['x-api-key'] || req.ip;
  const now = Date.now();
  if (!usage.has(key)) usage.set(key, []);
  const timestamps = usage.get(key).filter(ts => now - ts < rateLimitWindowMs);
  if (timestamps.length >= maxRequestsPerWindow) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  timestamps.push(now);
  usage.set(key, timestamps);
  next();
}

module.exports = { rateLimiter };
