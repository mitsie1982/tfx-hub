const { createAMSApp } = require('../../../../packages/ams-app/src');
const { auth } = require('@tfx/shared-logic');
const secureTokenStorage = require('../secureTokenStorage');

const runtime = {
  createAMSApp,
  auth,
  secureTokenStorage
};

const SAMPLE_OVERVIEW = {
  totals: { openJobs: 6, inProgressJobs: 3, completedJobs: 12, cancelledJobs: 1, professionals: 24 },
  professionalsByTier: { PREMIUM: 5, VERIFIED: 6, TRUSTED: 9, ONBOARDED: 4 },
  openJobsByTrade: { plumber: 2, builder: 2, electrician: 1, roofer: 1 },
  recentOpenJobs: [
    { id: 'job-301', title: 'Kitchen leak repair', trade: 'plumber' },
    { id: 'job-302', title: 'Boundary wall extension', trade: 'builder' }
  ],
  totalJobsTracked: 22
};

const SAMPLE_CONTRACTORS = [
  { id: 'pro-001', name: 'John Smit', trade: 'plumber', tier: 'PREMIUM', rating: 4.8 },
  { id: 'pro-002', name: 'Naledi Khumalo', trade: 'general contractor', tier: 'TRUSTED', rating: 4.7 }
];

const SAMPLE_ADMIN_ACCOUNTS = [
  { id: 'admin-001', email: 'admin@example.com', username: 'local-admin-secret', firstName: 'Platform', lastName: 'Admin', role: 'admin', isBootstrapAdmin: true, createdAt: '2026-04-02T07:00:00.000Z' },
  { id: 'admin-ops-001', email: 'ops-admin@example.com', username: 'ops.admin', firstName: 'Ops', lastName: 'Admin', role: 'admin', isBootstrapAdmin: false, createdAt: '2026-04-02T08:30:00.000Z' }
];

const SAMPLE_ADMIN_AUDIT_EVENTS = [
  { id: 'audit-001', adminUserId: 'admin-001', eventType: 'admin_login', outcome: 'success', reason: 'authenticated', identifier: 'local-admin-secret', requestPath: '/auth/login', requestMethod: 'POST', targetUserId: null, ipAddress: '127.0.0.1', createdAt: '2026-04-02T08:00:00.000Z' },
  { id: 'audit-002', adminUserId: 'admin-001', eventType: 'admin_password_reset_request', outcome: 'denied', reason: 'bootstrap_admin_reset_forbidden', identifier: 'admin@example.com', requestPath: '/auth/password-reset/request', requestMethod: 'POST', targetUserId: 'admin-001', ipAddress: '127.0.0.1', createdAt: '2026-04-02T08:05:00.000Z' },
  { id: 'audit-003', adminUserId: 'admin-001', eventType: 'admin_account_create', outcome: 'success', reason: 'created_admin_account', identifier: null, requestPath: '/admin/accounts', requestMethod: 'POST', targetUserId: 'admin-ops-001', ipAddress: '127.0.0.1', createdAt: '2026-04-02T08:30:00.000Z' }
];

const SAMPLE_CONTRACTOR_DETAILS = {
  'pro-001': {
    id: 'pro-001',
    name: 'John Smit',
    trade: 'plumber',
    tier: 'PREMIUM',
    rating: 4.8,
    completedJobs: 247,
    responseTime: '9 min',
    activeQuotes: 11,
    summary: 'High-volume plumbing contractor with strong response times and premium tier performance.',
    tierReview: { status: 'Eligible for retention review', reason: 'Premium performance sustained for 90 days', recommendedAction: 'Queue for monthly tier audit' },
    compliance: { status: 'Healthy', lastCheck: '2026-03-29', notes: ['No recent violations', 'Credential renewal due in 42 days'] },
    disputes: [{ id: 'disp-101', status: 'Resolved', summary: 'Minor callout timing dispute closed within SLA' }],
    adminActions: [{ id: 'admin-action-sample-001', actionType: 'tier-review', summary: 'Tier review queued', note: 'Monthly premium retention check', createdBy: 'admin-sample', createdAt: '2026-04-02T08:00:00.000Z', source: 'sample' }]
  },
  'pro-002': {
    id: 'pro-002',
    name: 'Naledi Khumalo',
    trade: 'general contractor',
    tier: 'TRUSTED',
    rating: 4.7,
    completedJobs: 67,
    responseTime: '12 min',
    activeQuotes: 5,
    summary: 'Trusted general contractor with steady quote flow and strong homeowner satisfaction.',
    tierReview: { status: 'Watchlist for promotion', reason: 'Approaching VERIFIED threshold', recommendedAction: 'Review after next 5 completed jobs' },
    compliance: { status: 'Attention needed', lastCheck: '2026-03-30', notes: ['Insurance certificate pending upload', 'One warning acknowledged'] },
    disputes: [{ id: 'disp-102', status: 'Open', summary: 'Scope clarification mediation in progress' }],
    adminActions: [{ id: 'admin-action-sample-002', actionType: 'compliance-review', summary: 'Compliance review opened', note: 'Insurance certificate follow-up', createdBy: 'admin-sample', createdAt: '2026-04-02T09:15:00.000Z', source: 'sample' }]
  }
};

const ADMIN_ACTION_SUMMARIES = {
  'tier-review': 'Tier review queued',
  'compliance-review': 'Compliance review opened',
  'dispute-audit': 'Dispute audit opened'
};

function normalizeContractorDetail(professionalId, item) {
  const fallback = SAMPLE_CONTRACTOR_DETAILS[professionalId] || {
    id: professionalId,
    name: 'Contractor',
    trade: 'trade not specified',
    tier: 'ONBOARDED',
    rating: null,
    completedJobs: null,
    responseTime: null,
    activeQuotes: null,
    summary: null,
    tierReview: { status: 'Not available', reason: 'No tier review data available', recommendedAction: 'Open contractor record in operations tools' },
    compliance: { status: 'Unknown', lastCheck: 'N/A', notes: [] },
    disputes: [],
    adminActions: []
  };

  return {
    ...fallback,
    ...(item || {}),
    tierReview: { ...fallback.tierReview, ...((item && item.tierReview) || {}) },
    compliance: { ...fallback.compliance, ...((item && item.compliance) || {}) },
    disputes: Array.isArray(item && item.disputes) ? item.disputes : fallback.disputes,
    adminActions: Array.isArray(item && item.adminActions) ? item.adminActions : fallback.adminActions
  };
}

function applyTokenPersistence() {
  runtime.auth.tokenStore.setPersistence({
    get: runtime.secureTokenStorage.getToken,
    set: runtime.secureTokenStorage.setToken,
    clear: runtime.secureTokenStorage.clearToken
  });
}

applyTokenPersistence();

function createApp() {
  return runtime.createAMSApp({
    baseURL: (process && process.env && process.env.TFX_API_BASE_URL) || 'http://localhost:5005',
    getToken: async () => runtime.auth.tokenStore.get(),
    context: {
      associationId: 'assoc-admin-demo',
      platform: 'react-native',
      appVersion: '0.0.1'
    }
  });
}

async function restoreAdminSession() {
  await runtime.auth.tokenStore.hydrate();

  if (!runtime.auth.tokenStore.get()) {
    return { authenticated: false, warning: null };
  }

  try {
    const app = createApp();
    const user = await app.account.getCurrentUser();
    return { authenticated: true, user, warning: null };
  } catch (error) {
    runtime.auth.tokenStore.clear();
    return { authenticated: false, warning: 'Saved admin session expired. Please sign in again.' };
  }
}

async function loginAdmin(credentials) {
  const app = createApp();

  try {
    return await app.account.signIn({ identifier: credentials.identifier || credentials.username, password: credentials.password });
  } catch (error) {
    const apiMessage = error && error.response && error.response.data && error.response.data.message;
    throw new Error(apiMessage || 'Unable to sign in to the admin workspace. Use the secret admin username and admin password.');
  }
}

async function logoutAdmin() {
  runtime.auth.tokenStore.clear();
}

async function subscribeAdminWhatsapp(phoneNumber) {
  return {
    item: {
      role: 'admin',
      phoneNumber,
      subscribed: false,
      nextStep: 'Admin WhatsApp access is disabled. Use the admin browser or mobile workspace during business hours.'
    },
    source: 'sample',
    warning: 'Admin WhatsApp access is disabled.'
  };
}

async function fetchAdminOverview() {
  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
    return { overview: SAMPLE_OVERVIEW, contractors: SAMPLE_CONTRACTORS, source: 'sample', warning: 'No active session. Showing sample admin data.' };
  }

  try {
    const app = createApp();
    const [overview, contractors] = await Promise.all([
      app.operations.getOverview(),
      app.contractors.list({})
    ]);
    return { overview, contractors, source: 'live', warning: null };
  } catch (error) {
    return { overview: SAMPLE_OVERVIEW, contractors: SAMPLE_CONTRACTORS, source: 'sample', warning: 'Unable to reach the admin API. Showing sample data.' };
  }
}

async function fetchAdminContractorDetail(professionalId) {
  if (!professionalId) {
    throw new Error('professionalId is required');
  }

  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
    return {
      item: normalizeContractorDetail(professionalId, SAMPLE_CONTRACTOR_DETAILS[professionalId] || null),
      source: 'sample',
      warning: 'No active session. Showing sample contractor detail.'
    };
  }

  try {
    const app = createApp();
    const [item, adminActions] = await Promise.all([
      app.contractors.getContractor(professionalId),
      app.contractors.listAdminActions(professionalId)
    ]);
    return { item: normalizeContractorDetail(professionalId, { ...(item || {}), adminActions }), source: 'live', warning: null };
  } catch (error) {
    return {
      item: normalizeContractorDetail(professionalId, SAMPLE_CONTRACTOR_DETAILS[professionalId] || null),
      source: 'sample',
      warning: 'Unable to load live contractor detail. Showing sample detail.'
    };
  }
}

async function performAdminContractorAction(professionalId, actionType) {
  if (!professionalId) {
    throw new Error('professionalId is required');
  }
  if (!actionType) {
    throw new Error('actionType is required');
  }

  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
    return {
      item: {
        id: `admin-action-${Date.now()}`,
        actionType,
        summary: ADMIN_ACTION_SUMMARIES[actionType] || 'Admin action queued',
        note: 'Saved in sample mode until a live admin session is available.',
        createdBy: 'sample-admin',
        createdAt: new Date().toISOString(),
        source: 'sample'
      },
      source: 'sample',
      warning: 'No active session. Action recorded locally as sample data.'
    };
  }

  try {
    const app = createApp();
    const item = await app.contractors.runAdminAction(professionalId, actionType, { summary: ADMIN_ACTION_SUMMARIES[actionType] });
    return { item, source: 'live', warning: null };
  } catch (error) {
    return {
      item: {
        id: `admin-action-${Date.now()}`,
        actionType,
        summary: ADMIN_ACTION_SUMMARIES[actionType] || 'Admin action queued',
        note: 'Fallback sample action after API failure.',
        createdBy: 'sample-admin',
        createdAt: new Date().toISOString(),
        source: 'sample'
      },
      source: 'sample',
      warning: 'Unable to save the admin action live. Showing sample action result.'
    };
  }
}

function createSampleAdminManagementResult(filters = {}) {
  const outcome = filters.outcome || 'all';
  const auditEvents = SAMPLE_ADMIN_AUDIT_EVENTS.filter((item) => outcome === 'all' || item.outcome === outcome);
  return {
    accounts: SAMPLE_ADMIN_ACCOUNTS,
    auditEvents,
    source: 'sample',
    warning: 'No active session. Showing sample admin management data.',
    csvPreview: ['id,eventType,outcome,targetUserId,createdAt', ...auditEvents.slice(0, 3).map((item) => `${item.id},${item.eventType},${item.outcome},${item.targetUserId || ''},${item.createdAt}`)].join('\n')
  };
}

async function fetchAdminManagement(filters = {}) {
  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
    return createSampleAdminManagementResult(filters);
  }

  try {
    const app = createApp();
    const normalizedFilters = {
      outcome: filters.outcome && filters.outcome !== 'all' ? filters.outcome : undefined,
      eventType: filters.eventType || undefined,
      limit: filters.limit || 25
    };
    const [accounts, auditEvents, csvPreview] = await Promise.all([
      app.admin.listAccounts(),
      app.admin.listAuditEvents(normalizedFilters),
      app.admin.exportAuditEvents(normalizedFilters)
    ]);
    return { accounts, auditEvents, source: 'live', warning: null, csvPreview };
  } catch (error) {
    return createSampleAdminManagementResult(filters);
  }
}

async function createManagedAdminAccount(payload) {
  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
    return {
      item: {
        id: `admin-sample-${Date.now()}`,
        ...payload,
        role: 'admin',
        isBootstrapAdmin: false,
        createdAt: new Date().toISOString(),
        source: 'sample'
      },
      source: 'sample',
      warning: 'No active session. Managed admin created only in sample mode.'
    };
  }

  try {
    const app = createApp();
    const item = await app.admin.createAccount(payload);
    return { item, source: 'live', warning: null };
  } catch (error) {
    const apiMessage = error && error.response && error.response.data && error.response.data.message;
    throw new Error(apiMessage || 'Unable to create the managed admin account.');
  }
}

async function requestManagedAdminPasswordReset(adminUserId) {
  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
    return {
      item: { ok: true, targetUserId: adminUserId, resetToken: `sample-reset-${Date.now()}` },
      source: 'sample',
      warning: 'No active session. Password reset generated only in sample mode.'
    };
  }

  try {
    const app = createApp();
    const item = await app.admin.requestPasswordReset(adminUserId);
    return { item, source: 'live', warning: null };
  } catch (error) {
    const apiMessage = error && error.response && error.response.data && error.response.data.message;
    throw new Error(apiMessage || 'Unable to issue the admin password reset.');
  }
}

async function rotateManagedAdminCredentials(adminUserId, payload) {
  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
    return {
      item: { id: adminUserId, username: payload.username || 'sample.admin', email: payload.email || 'sample@example.com', isBootstrapAdmin: false, source: 'sample' },
      source: 'sample',
      warning: 'No active session. Credential rotation recorded only in sample mode.'
    };
  }

  try {
    const app = createApp();
    const item = await app.admin.rotateCredentials(adminUserId, payload);
    return { item, source: 'live', warning: null };
  } catch (error) {
    const apiMessage = error && error.response && error.response.data && error.response.data.message;
    throw new Error(apiMessage || 'Unable to rotate managed admin credentials.');
  }
}

function __setTestDependencies(overrides = {}) {
  if (overrides.createAMSApp) {
    runtime.createAMSApp = overrides.createAMSApp;
  }
  if (overrides.auth) {
    runtime.auth = overrides.auth;
  }
  if (overrides.secureTokenStorage) {
    runtime.secureTokenStorage = overrides.secureTokenStorage;
  }
  applyTokenPersistence();
}

function __resetTestDependencies() {
  runtime.createAMSApp = createAMSApp;
  runtime.auth = auth;
  runtime.secureTokenStorage = secureTokenStorage;
  applyTokenPersistence();
}

module.exports = {
  __resetTestDependencies,
  __setTestDependencies,
  fetchAdminContractorDetail,
  fetchAdminManagement,
  fetchAdminOverview,
  loginAdmin,
  logoutAdmin,
  createManagedAdminAccount,
  performAdminContractorAction,
  requestManagedAdminPasswordReset,
  rotateManagedAdminCredentials,
  subscribeAdminWhatsapp,
  restoreAdminSession
};