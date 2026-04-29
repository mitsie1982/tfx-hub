/*
 packages/shared-auth/src/index.js
 Shared auth utilities:
 - signToken(payload, opts)
 - verifyToken(token, opts)
 - tenantMiddleware(opts)  -> Express middleware that enforces associationId
 - roleMiddleware(requiredRoles) -> Express middleware for role checks
*/
const jwt = require('jsonwebtoken');

const DEFAULT_SECRET = process.env.AUTH_SECRET || 'dev-secret-change-me';
const DEFAULT_ISSUER = process.env.AUTH_ISSUER || 'tfx-hub';

function signToken(payload, opts = {}) {
  const secret = opts.secret || DEFAULT_SECRET;
  const signOpts = { issuer: opts.issuer || DEFAULT_ISSUER, expiresIn: opts.expiresIn || '1h' };
  return jwt.sign(payload, secret, signOpts);
}

function verifyToken(token, opts = {}) {
  const secret = opts.secret || DEFAULT_SECRET;
  try {
    return jwt.verify(token, secret, { issuer: opts.issuer || DEFAULT_ISSUER });
  } catch (err) {
    const e = new Error('Invalid token');
    e.cause = err;
    throw e;
  }
}

/*
 Tenant middleware:
 - Expects Authorization: Bearer <token>
 - Requires token payload to include { associationId }
 - Attaches req.auth and req.association
*/
function tenantMiddleware(opts = {}) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'missing_token' });
    }
    try {
      const payload = verifyToken(token, opts);
      if (!payload.associationId) {
        return res.status(403).json({ error: 'tenant_context_required' });
      }
      req.auth = payload;
      req.association = { id: payload.associationId, slug: payload.associationSlug || null };
      next();
    } catch (err) {
      return res.status(401).json({ error: 'invalid_token' });
    }
  };
}

/*
 Role middleware:
 - requiredRoles: array of allowed roles (e.g., ['admin','owner'])
*/
function roleMiddleware(requiredRoles = []) {
  return (req, res, next) => {
    const role = (req.auth && req.auth.role) || null;
    if (!role) return res.status(403).json({ error: 'role_required' });
    if (requiredRoles.length > 0 && requiredRoles.indexOf(role) === -1) {
      return res.status(403).json({ error: 'insufficient_role' });
    }
    next();
  };
}

module.exports = {
  signToken,
  verifyToken,
  tenantMiddleware,
  roleMiddleware,
  _internal: { DEFAULT_SECRET, DEFAULT_ISSUER }
};
