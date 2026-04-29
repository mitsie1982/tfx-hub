#!/usr/bin/env bash
set -euo pipefail

# scripts/bootstrap_shared_auth.sh
# Step 5: Bootstrap a dedicated shared auth package with tenant-aware middleware,
# unit + integration tests, CI workflow, and VS Code tasks.
#
# Idempotent: safe to re-run. Will not overwrite existing non-placeholder files.
# Usage:
#   chmod +x scripts/bootstrap_shared_auth.sh
#   ./scripts/bootstrap_shared_auth.sh

ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

PKG_DIR="$ROOT/packages/shared-auth"
SRC_DIR="$PKG_DIR/src"
TESTS_DIR="$ROOT/tests/shared-auth"
UNIT_DIR="$TESTS_DIR/unit"
INTEG_DIR="$TESTS_DIR/integration"
CI_DIR="$ROOT/.github/workflows"
VSCODE_DIR="$ROOT/.vscode"
ARTIFACTS_DIR="$ROOT/artifacts"

mkdir -p "$SRC_DIR" "$UNIT_DIR" "$INTEG_DIR" "$CI_DIR" "$VSCODE_DIR" "$ARTIFACTS_DIR"

echo "Bootstrapping shared-auth package ($TS)"

# -------------------------
# 1) package.json for shared-auth
# -------------------------
if [ ! -f "$PKG_DIR/package.json" ]; then
  mkdir -p "$PKG_DIR"
  cat > "$PKG_DIR/package.json" <<JSON
{
  "name": "@tfx/shared-auth",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.js",
  "types": "src/index.d.ts",
  "scripts": {
    "build": "echo 'build @tfx/shared-auth (no-op)'",
    "test": "node ../../tests/shared-auth/unit/run_unit_tests.cjs",
    "test:integration": "node ../../tests/shared-auth/integration/run_integration_test.js"
  },
  "dependencies": {
    "jsonwebtoken": "^9.0.0",
    "express": "^4.18.2"
  }
}
JSON
  echo "Created $PKG_DIR/package.json"
else
  echo "$PKG_DIR/package.json exists (skipped)"
fi

# -------------------------
# 2) Shared auth implementation (JWT + tenant middleware + role middleware)
# -------------------------
if [ ! -f "$SRC_DIR/index.js" ]; then
  cat > "$SRC_DIR/index.js" <<'JS'
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
JS
  echo "Created shared auth implementation: $SRC_DIR/index.js"
else
  echo "Shared auth implementation exists (skipped)"
fi

# -------------------------
# 3) Unit tests for shared-auth
# -------------------------
if [ ! -f "$UNIT_DIR/test_sign_verify.js" ]; then
  cat > "$UNIT_DIR/test_sign_verify.js" <<'JS'
/*
 tests/shared-auth/unit/test_sign_verify.js
 Unit tests for signToken and verifyToken
*/
const assert = require('assert');
const auth = require('../../../packages/shared-auth/src');

function run() {
  const payload = { sub: 'user-1', associationId: 'assoc-1', role: 'member' };
  const token = auth.signToken(payload, { secret: 'unit-secret', expiresIn: '1h' });
  const decoded = auth.verifyToken(token, { secret: 'unit-secret' });
  assert.strictEqual(decoded.sub, payload.sub);
  assert.strictEqual(decoded.associationId, payload.associationId);
  console.log('unit:test_sign_verify OK');
}

if (require.main === module) run();
module.exports = run;
JS
  echo "Created unit test: $UNIT_DIR/test_sign_verify.js"
fi

if [ ! -f "$UNIT_DIR/test_role_middleware.js" ]; then
  cat > "$UNIT_DIR/test_role_middleware.js" <<'JS'
/*
 tests/shared-auth/unit/test_role_middleware.js
 Tests roleMiddleware by simulating req/res/next
*/
const assert = require('assert');
const auth = require('../../../packages/shared-auth/src');

function run() {
  const req = { auth: { role: 'admin' } };
  const res = { status: () => ({ json: () => {} }) };
  let called = false;
  const next = () => { called = true; };
  const mw = auth.roleMiddleware(['admin','owner']);
  mw(req, res, next);
  assert.strictEqual(called, true, 'admin should pass roleMiddleware');
  console.log('unit:test_role_middleware OK');
}

if (require.main === module) run();
module.exports = run;
JS
  echo "Created unit test: $UNIT_DIR/test_role_middleware.js"
fi

if [ ! -f "$UNIT_DIR/run_unit_tests.cjs" ]; then
  cat > "$UNIT_DIR/run_unit_tests.cjs" <<'JS'
/*
 tests/shared-auth/unit/run_unit_tests.cjs
 Runs all unit tests for shared-auth
*/
const path = require('path');
const tests = [
  'test_sign_verify.js',
  'test_role_middleware.js'
];
tests.forEach((t) => {
  console.log('Running', t);
  const run = require(path.join(__dirname, t));
  run();
});
console.log('All shared-auth unit tests completed');
JS
  echo "Created unit test runner: $UNIT_DIR/run_unit_tests.cjs"
fi

# -------------------------
# 4) Integration tests (Express server + middleware)
# -------------------------
if [ ! -f "$INTEG_DIR/server.js" ]; then
  cat > "$INTEG_DIR/server.js" <<'JS'
/*
 tests/shared-auth/integration/server.js
 Minimal express server to validate tenantMiddleware and roleMiddleware
*/
const express = require('express');
const auth = require('../../../packages/shared-auth/src');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/protected', auth.tenantMiddleware(), (req, res) => {
  res.json({ ok: true, association: req.association, auth: req.auth });
});

app.get('/admin', auth.tenantMiddleware(), auth.roleMiddleware(['admin']), (req, res) => {
  res.json({ ok: true, role: req.auth.role });
});

if (require.main === module) {
  const port = process.env.PORT || 5010;
  app.listen(port, () => console.log('Integration server listening on', port));
}
module.exports = app;
JS
  echo "Created integration server: $INTEG_DIR/server.js"
fi

if [ ! -f "$INTEG_DIR/run_integration_test.js" ]; then
  cat > "$INTEG_DIR/run_integration_test.js" <<'JS'
/*
 tests/shared-auth/integration/run_integration_test.js
 Starts the integration server and validates tenant and role enforcement.
*/
const child = require('child_process');
const path = require('path');
const { signToken } = require('../../../packages/shared-auth/src');

const serverPath = path.join(__dirname, 'server.js');
const proc = child.spawn(process.execPath, [serverPath], { stdio: ['ignore', 'pipe', 'pipe'] });

proc.stdout.on('data', d => process.stdout.write(d));
proc.stderr.on('data', d => process.stderr.write(d));

async function get(url, token) {
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
  const response = await fetch(url, { headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  return { status: response.status, data };
}

function stopServer() {
  return new Promise((resolve) => {
    if (proc.killed || proc.exitCode !== null) {
      resolve();
      return;
    }
    proc.once('exit', () => resolve());
    proc.kill();
  });
}

function fail(message, code = 2) {
  console.error(message);
  return code;
}

setTimeout(async () => {
  let code = 0;
  try {
    // 1) Missing token -> 401
    {
      const r = await get('http://localhost:5010/protected');
      if (r.status !== 401) {
        code = fail(`Unexpected status for missing token ${r.status}`);
        return;
      }
    }

    // 2) Token without associationId -> 403
    const tokenNoAssoc = signToken({ sub: 'u1', role: 'member' }, { expiresIn: '1h' });
    {
      const r = await get('http://localhost:5010/protected', tokenNoAssoc);
      if (r.status !== 403) {
        code = fail(`Unexpected status for token without associationId ${r.status}`);
        return;
      }
    }

    // 3) Member token -> protected OK, admin forbidden
    const tokenMember = signToken({ sub: 'u2', associationId: 'assoc-int', role: 'member' }, { expiresIn: '1h' });
    const r1 = await get('http://localhost:5010/protected', tokenMember);
    if (r1.status !== 200) {
      code = fail('Expected 200 for member protected');
      return;
    }
    {
      const r = await get('http://localhost:5010/admin', tokenMember);
      if (r.status !== 403) {
        code = fail(`Unexpected status for member to admin ${r.status}`);
        return;
      }
    }

    // 4) Admin token -> admin OK
    const tokenAdmin = signToken({ sub: 'u3', associationId: 'assoc-int', role: 'admin' }, { expiresIn: '1h' });
    const r2 = await get('http://localhost:5010/admin', tokenAdmin);
    if (r2.status !== 200) {
      code = fail('Expected 200 for admin access');
      return;
    }

    console.log('Integration tests passed');
  } catch (e) {
    code = fail(`Integration test error ${e && e.message}`);
  } finally {
    await stopServer();
    process.exitCode = code;
  }
}, 800);
JS
  echo "Created integration test runner: $INTEG_DIR/run_integration_test.js"
fi

# -------------------------
# 5) CI workflow to run unit + integration tests
# -------------------------
CI_FILE="$CI_DIR/ci_shared_auth.yml"
if [ ! -f "$CI_FILE" ]; then
  cat > "$CI_FILE" <<YAML
name: CI - Shared Auth

on:
  push:
    paths:
      - 'packages/shared-auth/**'
      - 'tests/shared-auth/**'
  pull_request:
    paths:
      - 'packages/shared-auth/**'
      - 'tests/shared-auth/**'

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install pnpm
        run: npm install -g pnpm
      - name: Install dependencies
        run: pnpm install
      - name: Run unit tests
        run: pnpm --filter @tfx/shared-auth test

  integration:
    needs: unit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install pnpm
        run: npm install -g pnpm
      - name: Install dependencies
        run: pnpm install
      - name: Run integration tests
        run: pnpm --filter @tfx/shared-auth test:integration
YAML
  echo "Created CI workflow: $CI_FILE"
else
  echo "CI workflow exists: $CI_FILE (skipped)"
fi

# -------------------------
# 6) VS Code tasks for shared-auth
# -------------------------
TASKS_FILE="$VSCODE_DIR/tasks.shared-auth.json"
cat > "$TASKS_FILE" <<JSON
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Shared-Auth: Run Unit Tests",
      "type": "shell",
      "command": "pnpm --filter @tfx/shared-auth test",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Shared-Auth: Run Integration Tests",
      "type": "shell",
      "command": "pnpm --filter @tfx/shared-auth test:integration",
      "presentation": { "reveal": "always" }
    }
  ]
}
JSON
echo "Created VS Code tasks at $TASKS_FILE"

# -------------------------
# 7) README for shared-auth
# -------------------------
README="$PKG_DIR/README.md"
if [ ! -f "$README" ]; then
  cat > "$README" <<MD
# @tfx/shared-auth

Shared authentication utilities and tenant middleware.

## Exports
- signToken(payload, opts)
- verifyToken(token, opts)
- tenantMiddleware(opts)  // Express middleware
- roleMiddleware(requiredRoles)

## Tests
- Unit: node tests/shared-auth/unit/run_unit_tests.cjs
- Integration: node tests/shared-auth/integration/run_integration_test.js
MD
  echo "Created README for shared-auth"
fi

# -------------------------
# 8) Install dependencies (best-effort)
# -------------------------
if command -v pnpm >/dev/null 2>&1; then
  echo "Installing workspace dependencies with pnpm..."
  pnpm install || true
else
  echo "pnpm not found. Run 'pnpm install' or use npm/yarn to install dependencies."
fi

# -------------------------
# 9) Commit created artifacts if inside git repo
# -------------------------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add "$PKG_DIR" "tests/shared-auth" "$CI_FILE" "$VSCODE_DIR" || true
  git commit -m "chore(shared-auth): add JWT tenant middleware, tests and CI ($TS)" || true
fi

echo "Shared-auth bootstrap complete."
echo " - Package: $PKG_DIR"
echo " - Unit tests: $UNIT_DIR"
echo " - Integration tests: $INTEG_DIR"
echo " - CI workflow: $CI_FILE"
echo
echo "Run locally:"
echo "  pnpm install"
echo "  pnpm --filter @tfx/shared-auth test"
echo "  pnpm --filter @tfx/shared-auth test:integration"
echo
echo "Acceptance criteria:"
echo " 1) Unit tests pass locally."
echo " 2) Integration test starts server and validates tenant and role enforcement."
echo " 3) CI workflow runs unit and integration tests on PRs touching packages/shared-auth or tests/shared-auth."
echo
echo "When ready, prompt 'Whats next' and I will render Step 6 script (Windows spike) or the next item you prefer."
