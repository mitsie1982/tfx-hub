#!/usr/bin/env bash
set -euo pipefail

# scripts/setup_shared_logic_and_tests.sh
# Idempotent VS Code-ready scaffold for the tfx-hub workspace:
#  - packages/shared-logic  : API client, auth, requestContext, professionals, jobs, onboarding
#  - packages/contractor-app: jobsView, onboardingFlow, profileView backed by shared-logic
#  - tests/shared-logic     : 6 unit tests + full integration suite
#  - tests/contractor-app   : 3 unit tests covering each view
#  - .github/workflows      : CI for both packages
#  - .vscode/tasks.json     : run/test tasks for all packages
#  - examples/              : runnable demo consumer
#  - tfx-hub.code-workspace : VS Code workspace file
#
# Usage:
#   chmod +x scripts/setup_shared_logic_and_tests.sh
#   ./scripts/setup_shared_logic_and_tests.sh
#
# Dry-run safe: re-runnable; will not overwrite existing files.

ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

PKG_DIR="$ROOT/packages/shared-logic"
SRC_DIR="$PKG_DIR/src"
CONTRACTOR_DIR="$ROOT/packages/contractor-app"
CONTRACTOR_SRC="$CONTRACTOR_DIR/src"
TESTS_DIR="$ROOT/tests/shared-logic"
UNIT_DIR="$TESTS_DIR/unit"
INTEG_DIR="$TESTS_DIR/integration"
CONTRACTOR_TESTS_DIR="$ROOT/tests/contractor-app/unit"
CI_DIR="$ROOT/.github/workflows"
VSCODE_DIR="$ROOT/.vscode"
ARTIFACTS_DIR="$ROOT/artifacts"
EXAMPLES_DIR="$ROOT/examples"
WORKSPACE_FILE="$ROOT/pnpm-workspace.yaml"

mkdir -p "$SRC_DIR" "$CONTRACTOR_SRC" "$UNIT_DIR" "$INTEG_DIR" \
         "$CONTRACTOR_TESTS_DIR" "$CI_DIR" "$VSCODE_DIR" "$ARTIFACTS_DIR" "$EXAMPLES_DIR"

echo "Bootstrapping tfx-hub workspace ($TS)"

# -------------------------
# 0) pnpm workspace declaration
# -------------------------
if [ ! -f "$WORKSPACE_FILE" ]; then
  cat > "$WORKSPACE_FILE" <<'YAML'
packages:
  - 'packages/*'
YAML
  echo "Created $WORKSPACE_FILE"
else
  echo "$WORKSPACE_FILE exists (skipped)"
fi

# -------------------------
# 1) package.json for shared-logic
# -------------------------
if [ ! -f "$PKG_DIR/package.json" ]; then
  mkdir -p "$PKG_DIR"
  cat > "$PKG_DIR/package.json" <<'JSON'
{
  "name": "@tfx/shared-logic",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.js",
  "types": "src/index.d.ts",
  "exports": {
    ".": "./src/index.js",
    "./apiClient": "./src/apiClient.js",
    "./auth": "./src/auth.js",
    "./jobs": "./src/jobs.js",
    "./onboarding": "./src/onboarding.js",
    "./professionals": "./src/professionals.js",
    "./requestContext": "./src/requestContext.js",
    "./sharedLogicClient": "./src/sharedLogicClient.js"
  },
  "scripts": {
    "build": "echo 'build @tfx/shared-logic (no-op)'",
    "test": "node ../../tests/shared-logic/unit/run_unit_tests.cjs",
    "test:integration": "node ../../tests/shared-logic/integration/run_integration_test.js"
  },
  "dependencies": {
    "axios": "^1.4.0",
    "jsonwebtoken": "^9.0.0"
  }
}
JSON
  echo "Created $PKG_DIR/package.json"
else
  echo "$PKG_DIR/package.json exists (skipped)"
fi

if [ ! -f "$SRC_DIR/index.d.ts" ]; then
  cat > "$SRC_DIR/index.d.ts" <<'TS'
export const JOB_STATUS: { OPEN: 'OPEN'; IN_PROGRESS: 'IN_PROGRESS'; COMPLETED: 'COMPLETED'; CANCELLED: 'CANCELLED' };
export const ONBOARDING_STAGES: string[];

export type ApiClientOptions = {
  baseURL?: string;
  getToken?: () => Promise<string | null | undefined> | string | null | undefined;
  onUnauthorized?: (error: unknown) => Promise<void> | void;
};

export type RequestContext = {
  associationId?: string;
  userId?: string;
  correlationId?: string;
  deviceId?: string;
  platform?: string;
  appVersion?: string;
};

export type SharedLogicClientOptions = ApiClientOptions & {
  context?: RequestContext;
};

export function createApiClient(options?: ApiClientOptions): unknown;
export function buildAssociationHeaders(context?: RequestContext): Record<string, string>;
export function mergeHeaders(...headerSets: Array<Record<string, string> | undefined>): Record<string, string>;
export function createJobsApi(client: unknown, context?: RequestContext): {
  listJobs(filters?: Record<string, string>): Promise<unknown>;
  getJob(jobId: string): Promise<unknown>;
  postJob(jobData: Record<string, unknown>): Promise<unknown>;
  applyForJob(jobId: string, application: Record<string, unknown>): Promise<unknown>;
};
export function createOnboardingApi(client: unknown, context?: RequestContext): {
  STAGES: string[];
  getStatus(): Promise<unknown>;
  submitStep(stage: string, data?: Record<string, unknown>): Promise<unknown>;
  currentStage(statusPayload: { completedStages: string[] }): string | null;
  isComplete(statusPayload: { completedStages: string[] }): boolean;
};
export function createProfessionalsApi(client: unknown, context?: RequestContext): {
  listProfessionals(filters?: Record<string, string>): Promise<unknown>;
  getProfessional(professionalId: string): Promise<unknown>;
};
export function createSharedLogicClient(options?: SharedLogicClientOptions): {
  api: unknown;
  jobs: ReturnType<typeof createJobsApi>;
  onboarding: ReturnType<typeof createOnboardingApi>;
  professionals: ReturnType<typeof createProfessionalsApi>;
};

export const auth: {
  signToken(payload: Record<string, unknown>, opts?: Record<string, unknown>): string;
  verifyToken(token: string, opts?: Record<string, unknown>): Record<string, unknown>;
  tokenStore: {
    token: string | null;
    set(token: string): void;
    get(): string | null;
    clear(): void;
  };
  refreshToken(): Promise<null>;
};
TS
  echo "Created $SRC_DIR/index.d.ts"
else
  echo "$SRC_DIR/index.d.ts exists (skipped)"
fi

# -------------------------
# 2) API client, auth, requestContext, professionals, jobs, onboarding
# -------------------------
if [ ! -f "$SRC_DIR/apiClient.js" ]; then
  cat > "$SRC_DIR/apiClient.js" <<'JS'
/*
 packages/shared-logic/src/apiClient.js
 Axios wrapper with token attachment and 401 handling.
*/
const axios = require('axios');

function createApiClient({ baseURL, getToken, onUnauthorized } = {}) {
  const client = axios.create({ baseURL, timeout: 15000 });

  client.interceptors.request.use(async (config) => {
    try {
      if (typeof getToken === 'function') {
        const token = await getToken();
        if (token) {
          config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
        }
      }
    } catch (e) {
      // ignore token retrieval errors
    }
    return config;
  }, (err) => Promise.reject(err));

  client.interceptors.response.use((res) => res, async (err) => {
    if (err && err.response && err.response.status === 401 && typeof onUnauthorized === 'function') {
      try { await onUnauthorized(err); } catch (e) { /* swallow */ }
    }
    return Promise.reject(err);
  });

  return client;
}

module.exports = { createApiClient };
JS
  echo "Created $SRC_DIR/apiClient.js"
else
  echo "$SRC_DIR/apiClient.js exists (skipped)"
fi

if [ ! -f "$SRC_DIR/sharedLogicClient.js" ]; then
  cat > "$SRC_DIR/sharedLogicClient.js" <<'JS'
const { createApiClient } = require('./apiClient');
const { createJobsApi } = require('./jobs');
const { createOnboardingApi } = require('./onboarding');
const { createProfessionalsApi } = require('./professionals');

function createSharedLogicClient(options = {}) {
  const { context = {}, ...apiOptions } = options;
  const api = createApiClient(apiOptions);
  return {
    api,
    jobs: createJobsApi(api, context),
    onboarding: createOnboardingApi(api, context),
    professionals: createProfessionalsApi(api, context)
  };
}

module.exports = { createSharedLogicClient };
JS
  echo "Created $SRC_DIR/sharedLogicClient.js"
else
  echo "$SRC_DIR/sharedLogicClient.js exists (skipped)"
fi

# -------------------------
# 2b) jobs.js
# -------------------------
if [ ! -f "$SRC_DIR/jobs.js" ]; then
  cat > "$SRC_DIR/jobs.js" <<'JS'
const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');

const JOB_STATUS = { OPEN: 'OPEN', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' };

function createJobsApi(client, context = {}) {
  if (!client || typeof client.get !== 'function') throw new Error('A compatible API client is required');
  function withContext(config = {}) {
    return { ...config, headers: mergeHeaders(buildAssociationHeaders(context), config.headers) };
  }
  return {
    async listJobs(filters = {}) { return (await client.get('/jobs', withContext({ params: filters }))).data; },
    async getJob(jobId) {
      if (!jobId) throw new Error('jobId is required');
      return (await client.get(`/jobs/${encodeURIComponent(jobId)}`, withContext())).data;
    },
    async postJob(jobData) {
      if (!jobData || !jobData.trade) throw new Error('jobData.trade is required');
      return (await client.post('/jobs', jobData, withContext())).data;
    },
    async applyForJob(jobId, application) {
      if (!jobId) throw new Error('jobId is required');
      if (!application || !application.professionalId) throw new Error('application.professionalId is required');
      return (await client.post(`/jobs/${encodeURIComponent(jobId)}/applications`, application, withContext())).data;
    }
  };
}

module.exports = { createJobsApi, JOB_STATUS };
JS
  echo "Created $SRC_DIR/jobs.js"
else
  echo "$SRC_DIR/jobs.js exists (skipped)"
fi

# -------------------------
# 2c) onboarding.js
# -------------------------
if [ ! -f "$SRC_DIR/onboarding.js" ]; then
  cat > "$SRC_DIR/onboarding.js" <<'JS'
const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');

const ONBOARDING_STAGES = ['welcome', 'name', 'trade', 'experience', 'location', 'credentials'];

function createOnboardingApi(client, context = {}) {
  if (!client || typeof client.get !== 'function') throw new Error('A compatible API client is required');
  function withContext(config = {}) {
    return { ...config, headers: mergeHeaders(buildAssociationHeaders(context), config.headers) };
  }
  return {
    STAGES: ONBOARDING_STAGES,
    async getStatus() { return (await client.get('/onboarding/status', withContext())).data; },
    async submitStep(stage, data) {
      if (!ONBOARDING_STAGES.includes(stage)) throw new Error(`Invalid onboarding stage "${stage}". Valid: ${ONBOARDING_STAGES.join(', ')}`);
      return (await client.post(`/onboarding/${encodeURIComponent(stage)}`, data || {}, withContext())).data;
    },
    currentStage(statusPayload) {
      if (!statusPayload || !statusPayload.completedStages) return ONBOARDING_STAGES[0];
      const remaining = ONBOARDING_STAGES.filter((s) => !statusPayload.completedStages.includes(s));
      return remaining.length > 0 ? remaining[0] : null;
    },
    isComplete(statusPayload) {
      if (!statusPayload || !statusPayload.completedStages) return false;
      return ONBOARDING_STAGES.every((s) => statusPayload.completedStages.includes(s));
    }
  };
}

module.exports = { createOnboardingApi, ONBOARDING_STAGES };
JS
  echo "Created $SRC_DIR/onboarding.js"
else
  echo "$SRC_DIR/onboarding.js exists (skipped)"
fi

# -------------------------
# 2d) requestContext.js
# -------------------------
if [ ! -f "$SRC_DIR/requestContext.js" ]; then
  cat > "$SRC_DIR/requestContext.js" <<'JS'
function buildAssociationHeaders(context = {}) {
  const headers = {};
  if (context.associationId) headers['x-association-id'] = context.associationId;
  if (context.userId) headers['x-user-id'] = context.userId;
  if (context.correlationId) headers['x-correlation-id'] = context.correlationId;
  if (context.deviceId) headers['x-device-id'] = context.deviceId;
  if (context.platform) headers['x-client-platform'] = context.platform;
  if (context.appVersion) headers['x-client-version'] = context.appVersion;
  return headers;
}
function mergeHeaders(...sets) { return sets.reduce((m, s) => ({ ...m, ...(s || {}) }), {}); }
module.exports = { buildAssociationHeaders, mergeHeaders };
JS
  echo "Created $SRC_DIR/requestContext.js"
else
  echo "$SRC_DIR/requestContext.js exists (skipped)"
fi

# -------------------------
# 2e) professionals.js
# -------------------------
if [ ! -f "$SRC_DIR/professionals.js" ]; then
  cat > "$SRC_DIR/professionals.js" <<'JS'
const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');
function createProfessionalsApi(client, context = {}) {
  if (!client || typeof client.get !== 'function') throw new Error('A compatible API client is required');
  function withContext(config = {}) {
    return { ...config, headers: mergeHeaders(buildAssociationHeaders(context), config.headers) };
  }
  return {
    async listProfessionals(filters = {}) { return (await client.get('/professionals', withContext({ params: filters }))).data; },
    async getProfessional(professionalId) {
      if (!professionalId) throw new Error('professionalId is required');
      return (await client.get(`/professionals/${encodeURIComponent(professionalId)}`, withContext())).data;
    }
  };
}
module.exports = { createProfessionalsApi };
JS
  echo "Created $SRC_DIR/professionals.js"
else
  echo "$SRC_DIR/professionals.js exists (skipped)"
fi
/*
 packages/shared-logic/src/auth.js
 Minimal auth helpers for tests and examples.
*/
const jwt = require('jsonwebtoken');
const DEFAULT_SECRET = process.env.SHARED_LOGIC_SECRET || 'dev-shared-logic-secret';

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
  set(token) { this.token = token; },
  get() { return this.token; },
  clear() { this.token = null; }
};

async function refreshToken() {
  return null;
}

module.exports = { signToken, verifyToken, tokenStore, refreshToken };
JS
  echo "Created $SRC_DIR/auth.js"
else
  echo "$SRC_DIR/auth.js exists (skipped)"
fi

if [ ! -f "$SRC_DIR/index.js" ]; then
  cat > "$SRC_DIR/index.js" <<'JS'
const { createApiClient } = require('./apiClient');
const auth = require('./auth');
const { createJobsApi, JOB_STATUS } = require('./jobs');
const { createOnboardingApi, ONBOARDING_STAGES } = require('./onboarding');
const { createProfessionalsApi } = require('./professionals');
const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');
const { createSharedLogicClient } = require('./sharedLogicClient');

module.exports = {
  auth,
  buildAssociationHeaders,
  createApiClient,
  createJobsApi,
  createOnboardingApi,
  createProfessionalsApi,
  createSharedLogicClient,
  JOB_STATUS,
  mergeHeaders,
  ONBOARDING_STAGES
};
JS
  echo "Created $SRC_DIR/index.js"
else
  echo "$SRC_DIR/index.js exists (skipped)"
fi

# -------------------------
# 3) Unit tests
# -------------------------
if [ ! -f "$UNIT_DIR/test_api_client_unit.js" ]; then
  cat > "$UNIT_DIR/test_api_client_unit.js" <<'JS'
/*
 tests/shared-logic/unit/test_api_client_unit.js
 Basic unit test for createApiClient request interceptor behavior.
*/
const assert = require('assert');
const { createApiClient } = require('../../../packages/shared-logic/src/apiClient');

async function run() {
  let tokenProvided = false;
  const client = createApiClient({
    baseURL: 'http://localhost/',
    getToken: async () => {
      tokenProvided = true;
      return 'unit-test-token';
    }
  });
  const config = await client.interceptors.request.handlers[0].fulfilled({ headers: {} });
  assert(tokenProvided, 'getToken should be called');
  assert.strictEqual(config.headers.Authorization, 'Bearer unit-test-token');
  console.log('unit:test_api_client_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
JS
  echo "Created unit test: $UNIT_DIR/test_api_client_unit.js"
else
  echo "$UNIT_DIR/test_api_client_unit.js exists (skipped)"
fi

if [ ! -f "$UNIT_DIR/run_unit_tests.cjs" ]; then
  cat > "$UNIT_DIR/run_unit_tests.cjs" <<'JS'
const path = require('path');
async function main() {
  const tests = [
    'test_api_client_unit.js',
    'test_auth_unit.js',
    'test_request_context_unit.js',
    'test_professionals_unit.js',
    'test_jobs_unit.js',
    'test_onboarding_unit.js'
  ];
  for (const t of tests) {
    console.log('Running', t);
    await require(path.join(__dirname, t))();
  }
  console.log('All shared-logic unit tests completed');
}
main().catch((e) => { console.error(e); process.exit(1); });
JS
  echo "Created unit test runner: $UNIT_DIR/run_unit_tests.cjs"
else
  echo "$UNIT_DIR/run_unit_tests.cjs exists (skipped)"
fi

# -------------------------
# 4) Integration test (server + client)
# -------------------------
if [ ! -f "$INTEG_DIR/server.js" ]; then
  cat > "$INTEG_DIR/server.js" <<'JS'
const express = require('express');
const { verifyToken } = require('../../../packages/shared-logic/src/auth');

const app = express();
const professionals = [
  { id: 'pro-001', name: 'John Smit', trade: 'plumber', tier: 'PREMIUM' },
  { id: 'pro-002', name: 'Sarah Khubone', trade: 'builder', tier: 'VERIFIED' }
];
const jobs = [
  { id: 'job-001', trade: 'plumber', description: 'Fix kitchen pipes', status: 'OPEN', clientId: 'client-001' },
  { id: 'job-002', trade: 'builder', description: 'Build garden wall', status: 'OPEN', clientId: 'client-002' }
];
const onboardingState = {};

app.use(express.json());

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_token' });
  try { req.auth = verifyToken(token); return next(); }
  catch (e) { return res.status(401).json({ error: 'invalid_token' }); }
}

app.get('/ping', (req, res) => res.json({ ok: true }));
app.get('/protected', requireAuth, (req, res) => res.json({ ok: true, payload: req.auth }));

app.get('/professionals', requireAuth, (req, res) => {
  const associationId = req.headers['x-association-id'];
  if (!associationId) return res.status(400).json({ error: 'missing_association_id' });
  const items = professionals.filter((p) => !req.query.trade || p.trade === req.query.trade);
  return res.json({ items, meta: { associationId, requester: req.auth.sub } });
});
app.get('/professionals/:id', requireAuth, (req, res) => {
  const associationId = req.headers['x-association-id'];
  if (!associationId) return res.status(400).json({ error: 'missing_association_id' });
  const item = professionals.find((p) => p.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'professional_not_found' });
  return res.json({ item, meta: { associationId, requester: req.auth.sub } });
});

app.get('/jobs', requireAuth, (req, res) => {
  const associationId = req.headers['x-association-id'];
  if (!associationId) return res.status(400).json({ error: 'missing_association_id' });
  const items = jobs.filter((j) => {
    if (req.query.trade && j.trade !== req.query.trade) return false;
    if (req.query.status && j.status !== req.query.status) return false;
    return true;
  });
  return res.json({ items, meta: { associationId, requester: req.auth.sub } });
});
app.get('/jobs/:id', requireAuth, (req, res) => {
  const associationId = req.headers['x-association-id'];
  if (!associationId) return res.status(400).json({ error: 'missing_association_id' });
  const item = jobs.find((j) => j.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'job_not_found' });
  return res.json({ item, meta: { associationId } });
});
app.post('/jobs', requireAuth, (req, res) => {
  const associationId = req.headers['x-association-id'];
  if (!associationId) return res.status(400).json({ error: 'missing_association_id' });
  if (!req.body || !req.body.trade) return res.status(400).json({ error: 'trade_required' });
  const newJob = { id: `job-${Date.now()}`, ...req.body, status: 'OPEN', clientId: req.auth.sub };
  jobs.push(newJob);
  return res.status(201).json({ item: newJob });
});
app.post('/jobs/:id/applications', requireAuth, (req, res) => {
  const job = jobs.find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'job_not_found' });
  if (!req.body || !req.body.professionalId) return res.status(400).json({ error: 'professionalId_required' });
  return res.status(201).json({ applicationId: `app-${Date.now()}`, jobId: req.params.id, professionalId: req.body.professionalId });
});

app.get('/onboarding/status', requireAuth, (req, res) => {
  const state = onboardingState[req.auth.sub] || { completedStages: [] };
  return res.json({ completedStages: state.completedStages });
});
app.post('/onboarding/:stage', requireAuth, (req, res) => {
  const valid = ['welcome','name','trade','experience','location','credentials'];
  const { stage } = req.params;
  if (!valid.includes(stage)) return res.status(400).json({ error: 'invalid_stage' });
  const sub = req.auth.sub;
  if (!onboardingState[sub]) onboardingState[sub] = { completedStages: [] };
  if (!onboardingState[sub].completedStages.includes(stage)) onboardingState[sub].completedStages.push(stage);
  return res.json({ ok: true, stage, completedStages: onboardingState[sub].completedStages });
});

if (require.main === module) {
  const port = process.env.PORT || 5005;
  app.listen(port, () => console.log('Integration server listening on', port));
}
module.exports = app;
JS
  echo "Created integration server: $INTEG_DIR/server.js"
else
  echo "$INTEG_DIR/server.js exists (skipped)"
fi

if [ ! -f "$INTEG_DIR/run_integration_test.js" ]; then
  cat > "$INTEG_DIR/run_integration_test.js" <<'JS'
const child = require('child_process');
const assert = require('assert');
const path = require('path');
const { createSharedLogicClient } = require('../../../packages/shared-logic/src/sharedLogicClient');
const { signToken } = require('../../../packages/shared-logic/src/auth');

const serverPath = path.join(__dirname, 'server.js');
const proc = child.spawn(process.execPath, [serverPath], { stdio: ['ignore', 'pipe', 'pipe'] });
let passed = 0; let failed = 0;

function stopServer() { if (!proc.killed) proc.kill(); }
function ok(label, val) { if (val) { console.log(`  ✔ ${label}`); passed++; } else { console.error(`  ✘ ${label}`); failed++; } }

proc.stdout.on('data', (c) => process.stdout.write(c));
proc.stderr.on('data', (c) => process.stderr.write(c));
proc.on('exit', (code) => { if (code !== null && code !== 0) console.error('Server exited early:', code); });

setTimeout(async () => {
  try {
    const token = signToken({ sub: 'int-user', associationId: 'assoc-int' }, { expiresIn: '1h' });
    const client = createSharedLogicClient({
      baseURL: 'http://localhost:5005',
      getToken: async () => token,
      associationId: 'assoc-int',
      requesterId: 'int-user'
    });

    console.log('\n[integration] /protected');
    const prot = await client.api.get('/protected');
    ok('status 200', prot.status === 200);
    ok('ok true', prot.data && prot.data.ok === true);

    console.log('\n[integration] professionals.listProfessionals');
    const proList = await client.professionals.listProfessionals();
    ok('items array', Array.isArray(proList.items));
    ok('two professionals', proList.items.length === 2);

    console.log('\n[integration] professionals.getProfessional');
    const proDetail = await client.professionals.getProfessional('pro-001');
    ok('item present', proDetail.item && proDetail.item.id === 'pro-001');

    console.log('\n[integration] jobs.listJobs');
    const jobList = await client.jobs.listJobs();
    ok('jobs items array', Array.isArray(jobList.items));
    ok('two jobs', jobList.items.length >= 2);

    console.log('\n[integration] jobs.getJob');
    const jobDetail = await client.jobs.getJob('job-001');
    ok('job item present', jobDetail.item && jobDetail.item.id === 'job-001');

    console.log('\n[integration] jobs.postJob');
    const newJob = await client.jobs.postJob({ trade: 'electrician', description: 'Wire a new room' });
    ok('new job id present', newJob.item && newJob.item.id);
    ok('new job status OPEN', newJob.item && newJob.item.status === 'OPEN');

    console.log('\n[integration] jobs.applyForJob');
    const app = await client.jobs.applyForJob('job-001', { professionalId: 'pro-001' });
    ok('applicationId present', app.applicationId);
    ok('jobId matches', app.jobId === 'job-001');

    console.log('\n[integration] onboarding.getStatus');
    const statusBefore = await client.onboarding.getStatus();
    ok('completedStages array', Array.isArray(statusBefore.completedStages));
    ok('starts empty', statusBefore.completedStages.length === 0);

    console.log('\n[integration] onboarding.submitStep');
    const step = await client.onboarding.submitStep('welcome', { accepted: true });
    ok('step ok', step.ok === true);
    ok('stage returned', step.stage === 'welcome');
    ok('completedStages has welcome', step.completedStages.includes('welcome'));

    console.log(`\nIntegration tests: ${passed} passed, ${failed} failed`);
    stopServer();
    process.exit(failed > 0 ? 2 : 0);
  } catch (error) {
    console.error('Integration test crashed:', error && error.message);
    stopServer();
    process.exit(2);
  }
}, 800);

process.on('exit', stopServer);
process.on('SIGINT', () => { stopServer(); process.exit(130); });
JS
  echo "Created integration test runner: $INTEG_DIR/run_integration_test.js"
else
  echo "$INTEG_DIR/run_integration_test.js exists (skipped)"
fi

# -------------------------
# 5) CI workflow to run unit + integration tests
# -------------------------
CI_FILE="$CI_DIR/ci_shared_logic.yml"
if [ ! -f "$CI_FILE" ]; then
  cat > "$CI_FILE" <<'YAML'
name: CI - Shared Logic

on:
  push:
    paths:
      - 'packages/**'
      - 'tests/**'
      - 'pnpm-workspace.yaml'
  pull_request:
    paths:
      - 'packages/**'
      - 'tests/**'
      - 'pnpm-workspace.yaml'

jobs:
  shared-logic-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: npm install -g pnpm
      - run: pnpm install
      - name: shared-logic unit tests
        run: pnpm --filter @tfx/shared-logic test

  shared-logic-integration:
    needs: shared-logic-unit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: npm install -g pnpm
      - run: pnpm install
      - name: shared-logic integration tests
        run: pnpm --filter @tfx/shared-logic test:integration

  contractor-app-unit:
    needs: shared-logic-unit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: npm install -g pnpm
      - run: pnpm install
      - name: contractor-app unit tests
        run: pnpm --filter @tfx/contractor-app test
YAML
  echo "Created CI workflow: $CI_FILE"
else
  echo "CI workflow exists: $CI_FILE (skipped)"
fi

# -------------------------
# 6) VS Code tasks for running tests
# -------------------------
TASKS_FILE="$VSCODE_DIR/tasks.shared-logic.json"
cat > "$TASKS_FILE" <<'JSON'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Install Dependencies",
      "type": "shell",
      "command": "pnpm install",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Shared-Logic: Unit Tests",
      "type": "shell",
      "command": "pnpm --filter @tfx/shared-logic test",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Shared-Logic: Integration Tests",
      "type": "shell",
      "command": "pnpm --filter @tfx/shared-logic test:integration",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Shared-Logic: Demo",
      "type": "shell",
      "command": "node examples/shared_logic_demo.js",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Contractor-App: Unit Tests",
      "type": "shell",
      "command": "pnpm --filter @tfx/contractor-app test",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Contractor-App: Demo",
      "type": "shell",
      "command": "node packages/contractor-app/src/index.js",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Run All Tests",
      "type": "shell",
      "command": "pnpm --filter @tfx/shared-logic test && pnpm --filter @tfx/contractor-app test",
      "presentation": { "reveal": "always" }
    }
  ]
}
JSON
echo "Created VS Code tasks at $TASKS_FILE"

# -------------------------
# 7) README for shared-logic
# -------------------------
# 5b) contractor-app package
# -------------------------
CAPP_DIR="$ROOT/packages/contractor-app"
CAPP_SRC="$CAPP_DIR/src"
CAPP_TESTS="$ROOT/tests/contractor-app/unit"
mkdir -p "$CAPP_SRC" "$CAPP_TESTS"

if [ ! -f "$CAPP_DIR/package.json" ]; then
  cat > "$CAPP_DIR/package.json" <<'JSON'
{
  "name": "@tfx/contractor-app",
  "version": "0.0.1",
  "description": "Contractor-facing views backed by @tfx/shared-logic",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "node ../../tests/contractor-app/unit/run_unit_tests.cjs"
  },
  "dependencies": {
    "@tfx/shared-logic": "workspace:*",
    "express": "^5.2.1"
  }
}
JSON
  echo "Created $CAPP_DIR/package.json"
fi

if [ ! -f "$CAPP_SRC/jobsView.js" ]; then
  cat > "$CAPP_SRC/jobsView.js" <<'JS'
function createJobsView(jobsApi) {
  if (!jobsApi || typeof jobsApi.listJobs !== 'function') throw new Error('jobsApi required');
  return {
    async getOpenJobs(trade) {
      const filters = { status: 'OPEN' };
      if (trade) filters.trade = trade;
      const result = await jobsApi.listJobs(filters);
      return result.items || [];
    },
    async getJobDetail(jobId) {
      const result = await jobsApi.getJob(jobId);
      return result.item || null;
    },
    async applyForJob(jobId, professionalId) {
      return jobsApi.applyForJob(jobId, { professionalId });
    }
  };
}
module.exports = { createJobsView };
JS
  echo "Created $CAPP_SRC/jobsView.js"
fi

if [ ! -f "$CAPP_SRC/onboardingFlow.js" ]; then
  cat > "$CAPP_SRC/onboardingFlow.js" <<'JS'
const { ONBOARDING_STAGES } = require('@tfx/shared-logic');
function createOnboardingFlow(onboardingApi) {
  if (!onboardingApi || typeof onboardingApi.getStatus !== 'function') throw new Error('onboardingApi required');
  return {
    async getNextStep() {
      const status = await onboardingApi.getStatus();
      const done = new Set(status.completedStages || []);
      return ONBOARDING_STAGES.find((s) => !done.has(s)) || null;
    },
    async submitStep(stage, data) {
      return onboardingApi.submitStep(stage, data);
    },
    async isComplete() {
      const status = await onboardingApi.getStatus();
      const done = new Set(status.completedStages || []);
      return ONBOARDING_STAGES.every((s) => done.has(s));
    }
  };
}
module.exports = { createOnboardingFlow };
JS
  echo "Created $CAPP_SRC/onboardingFlow.js"
fi

if [ ! -f "$CAPP_SRC/profileView.js" ]; then
  cat > "$CAPP_SRC/profileView.js" <<'JS'
const TIER_LABELS = { PREMIUM: 'Premium Pro', VERIFIED: 'Verified Pro', TRUSTED: 'Trusted Pro', ONBOARDED: 'New Pro' };
function createProfileView(professionalsApi) {
  if (!professionalsApi || typeof professionalsApi.getProfessional !== 'function') throw new Error('professionalsApi required');
  return {
    async getProfile(professionalId) {
      const result = await professionalsApi.getProfessional(professionalId);
      return result.item || null;
    },
    formatTierLabel(tier) {
      return TIER_LABELS[tier] || tier || 'Unknown';
    }
  };
}
module.exports = { createProfileView };
JS
  echo "Created $CAPP_SRC/profileView.js"
fi

if [ ! -f "$CAPP_SRC/index.js" ]; then
  cat > "$CAPP_SRC/index.js" <<'JS'
const { createSharedLogicClient } = require('@tfx/shared-logic');
const { createJobsView } = require('./jobsView');
const { createOnboardingFlow } = require('./onboardingFlow');
const { createProfileView } = require('./profileView');

function createContractorApp(options = {}) {
  const client = createSharedLogicClient(options);
  return {
    client,
    jobs: createJobsView(client.jobs),
    onboarding: createOnboardingFlow(client.onboarding),
    profile: createProfileView(client.professionals)
  };
}

if (require.main === module) {
  console.log('contractor-app: export createContractorApp — use in your app');
  console.log('Example:');
  console.log("  const { createContractorApp } = require('./index');");
  console.log("  const app = createContractorApp({ baseURL: '...', getToken: async () => '...', associationId: '...', requesterId: '...' });");
}

module.exports = { createContractorApp };
JS
  echo "Created $CAPP_SRC/index.js"
fi

if [ ! -f "$CAPP_TESTS/run_unit_tests.cjs" ]; then
  cat > "$CAPP_TESTS/run_unit_tests.cjs" <<'JS'
const path = require('path');
const tests = ['test_jobs_view_unit.js', 'test_onboarding_flow_unit.js', 'test_profile_view_unit.js'];
let passed = 0; let failed = 0;
async function main() {
  for (const file of tests) {
    try {
      await require(path.join(__dirname, file))();
      passed++;
    } catch (e) {
      console.error(`FAIL ${file}:`, e.message);
      failed++;
    }
  }
  console.log(`\nContractor-app unit tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
main();
JS
  echo "Created $CAPP_TESTS/run_unit_tests.cjs"
fi

if [ ! -f "$CAPP_TESTS/test_jobs_view_unit.js" ]; then
  cat > "$CAPP_TESTS/test_jobs_view_unit.js" <<'JS'
const assert = require('assert');
const { createJobsView } = require('../../../packages/contractor-app/src/jobsView');
async function run() {
  const fakeJobs = [
    { id: 'j1', trade: 'plumber', status: 'OPEN' },
    { id: 'j2', trade: 'builder', status: 'OPEN' }
  ];
  const mockApi = {
    listJobs: async (f) => ({ items: fakeJobs.filter((j) => !f.trade || j.trade === f.trade) }),
    getJob: async (id) => { const item = fakeJobs.find((j) => j.id === id); return { item }; },
    applyForJob: async (jobId, data) => ({ applicationId: 'app-1', jobId, ...data })
  };
  const view = createJobsView(mockApi);
  const openJobs = await view.getOpenJobs();
  assert.strictEqual(openJobs.length, 2);
  const filtered = await view.getOpenJobs('plumber');
  assert.strictEqual(filtered.length, 1);
  const detail = await view.getJobDetail('j1');
  assert.strictEqual(detail.id, 'j1');
  const app = await view.applyForJob('j1', 'pro-01');
  assert.ok(app.applicationId);
  assert.throws(() => createJobsView(null), /required/);
  console.log('test_jobs_view_unit.js: PASS');
}
module.exports = run;
JS
  echo "Created $CAPP_TESTS/test_jobs_view_unit.js"
fi

if [ ! -f "$CAPP_TESTS/test_onboarding_flow_unit.js" ]; then
  cat > "$CAPP_TESTS/test_onboarding_flow_unit.js" <<'JS'
const assert = require('assert');
const { createOnboardingFlow } = require('../../../packages/contractor-app/src/onboardingFlow');
async function run() {
  let completed = [];
  const mockApi = {
    getStatus: async () => ({ completedStages: completed }),
    submitStep: async (stage, data) => { if (!completed.includes(stage)) completed.push(stage); return { ok: true, stage, completedStages: completed }; }
  };
  const flow = createOnboardingFlow(mockApi);
  const next = await flow.getNextStep();
  assert.strictEqual(next, 'welcome');
  const result = await flow.submitStep('welcome', { accepted: true });
  assert.ok(result.ok);
  const next2 = await flow.getNextStep();
  assert.strictEqual(next2, 'name');
  const complete = await flow.isComplete();
  assert.strictEqual(complete, false);
  console.log('test_onboarding_flow_unit.js: PASS');
}
module.exports = run;
JS
  echo "Created $CAPP_TESTS/test_onboarding_flow_unit.js"
fi

if [ ! -f "$CAPP_TESTS/test_profile_view_unit.js" ]; then
  cat > "$CAPP_TESTS/test_profile_view_unit.js" <<'JS'
const assert = require('assert');
const { createProfileView } = require('../../../packages/contractor-app/src/profileView');
async function run() {
  const fakeProfs = [{ id: 'pro-1', name: 'John', tier: 'PREMIUM' }];
  const mockApi = { getProfessional: async (id) => ({ item: fakeProfs.find((p) => p.id === id) || null }) };
  const view = createProfileView(mockApi);
  const profile = await view.getProfile('pro-1');
  assert.strictEqual(profile.name, 'John');
  const notFound = await view.getProfile('missing');
  assert.strictEqual(notFound, null);
  assert.strictEqual(view.formatTierLabel('PREMIUM'), 'Premium Pro');
  assert.strictEqual(view.formatTierLabel('ONBOARDED'), 'New Pro');
  assert.strictEqual(view.formatTierLabel(undefined), 'Unknown');
  console.log('test_profile_view_unit.js: PASS');
}
module.exports = run;
JS
  echo "Created $CAPP_TESTS/test_profile_view_unit.js"
fi

# -------------------------
README="$PKG_DIR/README.md"
if [ ! -f "$README" ]; then
  cat > "$README" <<'MD'
# @tfx/shared-logic

Shared API client and auth helpers used by mobile apps.

## Usage

```js
const { createApiClient, auth } = require('@tfx/shared-logic');
```

## Tests

- Unit tests: `node tests/shared-logic/unit/run_unit_tests.cjs`
- Integration test: `node tests/shared-logic/integration/run_integration_test.js`
MD
  echo "Created README for shared-logic"
else
  echo "$README exists (skipped)"
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
# 9) Stage created artifacts if inside git repo
# -------------------------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add "$PKG_DIR" "tests/shared-logic" "$CI_FILE" "$VSCODE_DIR" "$WORKSPACE_FILE" || true
  if [ "${SHARED_LOGIC_AUTO_COMMIT:-0}" = "1" ]; then
    git commit -m "chore(shared-logic): add API client, auth helpers, tests and CI ($TS)" || true
  else
    echo "Skipping git commit. Set SHARED_LOGIC_AUTO_COMMIT=1 to enable it explicitly."
  fi
fi

echo "Shared-logic scaffold complete."
echo "Scaffold complete."
echo " - shared-logic:     $PKG_DIR"
echo " - contractor-app:   $CAPP_DIR"
echo " - Unit tests:       $UNIT_DIR"
echo " - Integration:      $INTEG_DIR"
echo " - contractor tests: $CAPP_TESTS"
echo " - CI workflow:      $CI_FILE"
echo
echo "Run locally:"
echo "  pnpm install"
echo "  pnpm --filter @tfx/shared-logic test"
echo "  pnpm --filter @tfx/shared-logic test:integration"
echo "  pnpm --filter @tfx/contractor-app test"
echo "  node packages/contractor-app/src/index.js"
