const { createCustomerApp } = require('../../../../packages/customer-app/src');
const { auth, getHumanFacingDemoSeed } = require('@tfx/shared-logic');
const secureTokenStorage = require('../secureTokenStorage');

const runtime = {
  createCustomerApp,
  auth,
  secureTokenStorage
};

const demoSeed = getHumanFacingDemoSeed();
const SAMPLE_USER = demoSeed.customer.user;
const SAMPLE_JOBS = demoSeed.customer.jobs;
const SAMPLE_PROFESSIONALS = demoSeed.professionals.directory.map(({ id, name, trade, tier, rating }) => ({ id, name, trade, tier, rating }));
const SAMPLE_PROFESSIONAL_DETAILS = demoSeed.professionals.directory.reduce((accumulator, professional) => {
  accumulator[professional.id] = professional;
  return accumulator;
}, {});

const shortlistedProfessionalIds = new Set();

async function hasActiveSession() {
  await runtime.auth.tokenStore.hydrate();
  return Boolean(runtime.auth.tokenStore.get());
}

function normalizeProfessionalDetail(professionalId, item) {
  const fallback = SAMPLE_PROFESSIONAL_DETAILS[professionalId] || {
    id: professionalId,
    name: 'Professional',
    trade: 'trade not specified',
    tier: 'ONBOARDED',
    rating: null,
    completedJobs: null,
    responseTime: null,
    serviceArea: null,
    summary: null,
    availability: null,
    credentials: [],
    portfolioHighlights: [],
    reviewHighlights: []
  };

  return {
    ...fallback,
    ...(item || {}),
    credentials: Array.isArray(item && item.credentials) && item.credentials.length ? item.credentials : fallback.credentials,
    portfolioHighlights: Array.isArray(item && item.portfolioHighlights) && item.portfolioHighlights.length ? item.portfolioHighlights : fallback.portfolioHighlights,
    reviewHighlights: Array.isArray(item && item.reviewHighlights) && item.reviewHighlights.length ? item.reviewHighlights : fallback.reviewHighlights
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
  return runtime.createCustomerApp({
    baseURL: (process && process.env && process.env.TFX_API_BASE_URL) || 'http://localhost:5005',
    getToken: async () => runtime.auth.tokenStore.get(),
    context: {
      associationId: 'assoc-customer-demo',
      platform: 'react-native',
      appVersion: '0.0.1'
    }
  });
}

async function restoreCustomerSession() {
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
    return { authenticated: false, warning: 'Saved session expired. Please sign in again.' };
  }
}

async function loginCustomer(credentials) {
  const app = createApp();

  try {
    return await app.account.signIn(credentials);
  } catch (error) {
    throw new Error('Unable to sign in to the customer workspace.');
  }
}

async function registerCustomer(payload) {
  const app = createApp();

  try {
    return await app.account.register({
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phoneNumber: payload.phoneNumber,
      role: 'client'
    });
  } catch (error) {
    const status = error && error.response && error.response.status;
    if (status === 409) {
      const code = error && error.response && error.response.data && error.response.data.error;
      if (code === 'phone_number_in_use') {
        throw new Error('That phone number is already linked to another account.');
      }
      throw new Error('An account already exists for this email.');
    }
    if (status === 400) {
      const code = error && error.response && error.response.data && error.response.data.error;
      if (code === 'invalid_phone_number') {
        throw new Error('Enter a valid RSA mobile number, for example +27710000003.');
      }
    }
    throw new Error('Unable to register a customer account.');
  }
}

async function requestCustomerPasswordReset(email) {
  const app = createApp();
  return app.account.requestPasswordReset(email);
}

async function logoutCustomer() {
  runtime.auth.tokenStore.clear();
}

async function fetchCustomerOverview() {
  if (!(await hasActiveSession())) {
    return {
      user: SAMPLE_USER,
      jobs: SAMPLE_JOBS,
      professionals: SAMPLE_PROFESSIONALS,
      source: 'sample',
      warning: 'No active session. Showing sample customer data.'
    };
  }

  try {
    const app = createApp();
    const [user, jobs, professionals] = await Promise.all([
      app.account.getCurrentUser(),
      app.jobs.listOpenJobs({}),
      app.professionals.browse({})
    ]);

    // Always show demo data if live is empty
    const useDemo = (!jobs || jobs.length === 0) || (!professionals || professionals.length === 0);
    return {
      user: useDemo ? SAMPLE_USER : user,
      jobs: useDemo ? SAMPLE_JOBS : jobs,
      professionals: useDemo ? SAMPLE_PROFESSIONALS : professionals,
      source: !useDemo ? 'live' : 'sample',
      warning: useDemo ? 'No live jobs or professionals found. Showing demo data.' : null
    };
  } catch (error) {
    return {
      user: SAMPLE_USER,
      jobs: SAMPLE_JOBS,
      professionals: SAMPLE_PROFESSIONALS,
      source: 'sample',
      warning: 'Unable to reach the customer API. Showing sample data.'
    };
  }
}

async function createCustomerJobRequest(payload) {
  if (!(await hasActiveSession())) {
    return {
      item: {
        id: `job-${Date.now()}`,
        status: 'OPEN',
        ...payload,
        source: 'sample'
      },
      source: 'sample',
      warning: 'No active session. Job request recorded in sample mode.'
    };
  }

  try {
    const app = createApp();
    const result = await app.jobs.createJobRequest(payload);
    return { ...(result || {}), source: 'live', warning: null };
  } catch (error) {
    return {
      item: {
        id: `job-${Date.now()}`,
        status: 'OPEN',
        ...payload,
        source: 'sample'
      },
      source: 'sample',
      warning: 'Unable to submit the job request live. Saved in sample mode.'
    };
  }
}

async function fetchCustomerProfessionalDetail(professionalId) {
  if (!professionalId) {
    throw new Error('professionalId is required');
  }

  if (!(await hasActiveSession())) {
    return {
      item: normalizeProfessionalDetail(professionalId, SAMPLE_PROFESSIONAL_DETAILS[professionalId] || null),
      source: 'sample',
      warning: 'No active session. Showing sample professional detail.'
    };
  }

  try {
    const app = createApp();
    const item = await app.professionals.getProfile(professionalId);
    return { item: normalizeProfessionalDetail(professionalId, item), source: 'live', warning: null };
  } catch (error) {
    return {
      item: normalizeProfessionalDetail(professionalId, SAMPLE_PROFESSIONAL_DETAILS[professionalId] || null),
      source: 'sample',
      warning: 'Unable to load live professional detail. Showing sample detail.'
    };
  }
}

async function toggleCustomerProfessionalShortlist(professionalId) {
  if (!professionalId) {
    throw new Error('professionalId is required');
  }

  if (await hasActiveSession()) {
    try {
      const app = createApp();
      const existing = await app.professionals.listShortlist();
      const shortlisted = existing.includes(professionalId)
        ? await app.professionals.removeFromShortlist(professionalId)
        : await app.professionals.addToShortlist(professionalId);
      return {
        shortlisted,
        items: await app.professionals.listShortlist(),
        source: 'live',
        warning: null
      };
    } catch (error) {
      return {
        shortlisted: false,
        items: Array.from(shortlistedProfessionalIds),
        source: 'sample',
        warning: 'Unable to update shortlist live. Showing local browser-host state.'
      };
    }
  }

  if (shortlistedProfessionalIds.has(professionalId)) {
    shortlistedProfessionalIds.delete(professionalId);
  } else {
    shortlistedProfessionalIds.add(professionalId);
  }

  return {
    shortlisted: shortlistedProfessionalIds.has(professionalId),
    items: Array.from(shortlistedProfessionalIds),
    source: 'sample',
    warning: null
  };
}

async function getCustomerProfessionalShortlist() {
  if (await hasActiveSession()) {
    try {
      const app = createApp();
      return await app.professionals.listShortlist();
    } catch (error) {
      return Array.from(shortlistedProfessionalIds);
    }
  }

  return Array.from(shortlistedProfessionalIds);
}

function buildCustomerContactRequest(professional) {
  if (!professional) {
    throw new Error('professional is required');
  }

  const normalizedTrade = String(professional.trade || '').toLowerCase();
  const defaultBudget = normalizedTrade.includes('electric')
    ? 'R8,500 - R18,000'
    : normalizedTrade.includes('plumb')
      ? 'R6,000 - R14,000'
      : 'R15,000 - R28,000';

  return {
    title: `Request ${professional.trade} consultation with ${professional.name}`,
    trade: professional.trade || '',
    description: `Please help me connect with ${professional.name}. ${professional.summary || ''}`.trim(),
    budget: defaultBudget,
    location: professional.serviceArea || '',
    urgency: professional.availability || ''
  };
}

function __setTestDependencies(overrides = {}) {
  if (overrides.createCustomerApp) {
    runtime.createCustomerApp = overrides.createCustomerApp;
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
  runtime.createCustomerApp = createCustomerApp;
  runtime.auth = auth;
  runtime.secureTokenStorage = secureTokenStorage;
  applyTokenPersistence();
}

module.exports = {
  __resetTestDependencies,
  __setTestDependencies,
  buildCustomerContactRequest,
  createCustomerJobRequest,
  fetchCustomerOverview,
  fetchCustomerProfessionalDetail,
  getCustomerProfessionalShortlist,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  requestCustomerPasswordReset,
  restoreCustomerSession,
  toggleCustomerProfessionalShortlist
};
