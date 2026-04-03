/*
 packages/shared-logic/src/auth.js
 Minimal auth helpers for tests and examples.
*/
const jwt = require('jsonwebtoken');
const DEFAULT_SECRET = process.env.SHARED_LOGIC_SECRET || 'dev-shared-logic-secret';

let persistenceAdapter = null;

function signToken(payload, opts = {}) {
  const secret = opts.secret || DEFAULT_SECRET;
  return jwt.sign(payload, secret, { issuer: opts.issuer || 'tfx-hub', expiresIn: opts.expiresIn || '1h' });
}

function verifyToken(token, opts = {}) {
  const secret = opts.secret || DEFAULT_SECRET;
  return jwt.verify(token, secret, { issuer: opts.issuer || 'tfx-hub' });
}

const tokenStore = {
  token: null,
  set(token) {
    this.token = token;
    if (persistenceAdapter && typeof persistenceAdapter.set === 'function') {
      Promise.resolve(persistenceAdapter.set(token)).catch(() => undefined);
    }
  },
  get() { return this.token; },
  clear() {
    this.token = null;
    if (persistenceAdapter && typeof persistenceAdapter.clear === 'function') {
      Promise.resolve(persistenceAdapter.clear()).catch(() => undefined);
    }
  },
  async hydrate() {
    if (!persistenceAdapter || typeof persistenceAdapter.get !== 'function') {
      return this.token;
    }
    try {
      const token = await persistenceAdapter.get();
      this.token = token || null;
      return this.token;
    } catch (error) {
      return this.token;
    }
  },
  setPersistence(adapter) {
    persistenceAdapter = adapter || null;
  }
};

async function refreshToken() {
  return null;
}

module.exports = { signToken, verifyToken, tokenStore, refreshToken };
