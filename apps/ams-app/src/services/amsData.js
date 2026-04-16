const { createAMSApp } = require('../../../../packages/ams-app/src');
const { auth, getHumanFacingDemoSeed } = require('@tfx/shared-logic');
const secureTokenStorage = require('../secureTokenStorage');

const runtime = {
  createAMSApp,
  auth,
  secureTokenStorage
};

const demoSeed = getHumanFacingDemoSeed();
const SAMPLE_OVERVIEW = demoSeed.admin.overview;
const SAMPLE_CONTRACTORS = demoSeed.admin.contractors;
const SAMPLE_ADMIN_ACCOUNTS = demoSeed.admin.accounts;
const SAMPLE_ADMIN_AUDIT_EVENTS = demoSeed.admin.auditEvents;
const SAMPLE_CONTRACTOR_DETAILS = demoSeed.admin.contractorDetails;

const ADMIN_ACTION_SUMMARIES = {
  'tier-review': 'Tier review queued',
  'compliance-review': 'Compliance review opened',
  'dispute-audit': 'Dispute audit opened'
};

function normalizeContractorDetail(professionalId, item) {
  const fallback = SAMPLE_CONTRACTOR_DETAILS[professionalId] || {
    id: professionalId,
    name: "Contractor Customer Management System (CCMS)",
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
