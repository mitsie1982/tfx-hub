// Admin authentication middleware (JWT or session-based)
const jwt = require('jsonwebtoken');
const ADMIN_SECRET = process.env.TFX_ADMIN_SECRET || 'local-admin-secret';

function requireAdminAuth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing admin token' });
  try {
    const decoded = jwt.verify(token, ADMIN_SECRET);
    if (!decoded.admin) throw new Error('Not admin');
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid admin token' });
  }
}

module.exports = { requireAdminAuth };
