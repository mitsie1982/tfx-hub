const { createCustomerApp } = require('../../../../packages/customer-app/src');
const { auth } = require('@tfx/shared-logic');
const secureTokenStorage = require('../secureTokenStorage');

const runtime = {
  createCustomerApp,
  auth,
  secureTokenStorage
};

const SAMPLE_USER = {
  id: 'client-001',
  firstName: 'Ayanda',
  lastName: 'Mokoena',
  email: 'client@example.com',
  role: 'client'
};

const SAMPLE_JOBS = [
  {
    id: 'job-201',
    title: 'Bathroom plumbing repair',
    trade: 'plumber',
    location: 'Sandton',
    budget: 'R2,500 - R5,000',
    urgency: 'Urgent',
    description: 'Repair a leaking shower mixer and replace two broken taps.',
    status: 'OPEN'
  },
  {
    id: 'job-202',
    title: 'Boundary wall extension',
    trade: 'builder',
    location: 'Midrand',
    budget: 'R12,000 - R20,000',
    urgency: 'This week',
    description: 'Extend an existing wall by 8 meters and plaster both sides.',
    status: 'OPEN'
  }
];

const SAMPLE_PROFESSIONALS = [
  { id: 'pro-001', name: 'John Smit', trade: 'plumber', tier: 'PREMIUM', rating: 4.8 },
  { id: 'pro-002', name: 'Sarah Khubone', trade: 'builder', tier: 'TRUSTED', rating: 4.6 }
];

const SAMPLE_PROFESSIONAL_DETAILS = {
  'pro-001': {
    id: 'pro-001',
    name: 'John Smit',
    trade: 'plumber',
    tier: 'PREMIUM',
    rating: 4.8,
    completedJobs: 247,
    responseTime: '9 min',
    serviceArea: 'Johannesburg North',
    summary: 'Specializes in residential plumbing repairs, leak detection, and bathroom upgrades.',
    availability: 'Available this afternoon',
    credentials: ['NHBRC registered', 'PIRB compliant', 'Background checked'],
    portfolioHighlights: ['Rebuilt guest bathroom plumbing line', 'Completed leak tracing for townhouse complex', 'Installed pressure-balancing shower mixers'],
    reviewHighlights: ['Arrived on time and explained the repair clearly.', 'Left the site clean and shared photo updates before departure.']
  },
  'pro-002': {
    id: 'pro-002',
    name: 'Sarah Khubone',
    trade: 'builder',
    tier: 'TRUSTED',
    rating: 4.6,
    completedJobs: 81,
    responseTime: '18 min',
    serviceArea: 'Midrand and Centurion',
    summary: 'Handles boundary walls, extensions, and general building projects for homeowners.',
    availability: 'Next site opening in 2 days',
    credentials: ['MBSA member', 'Safety file ready', 'References verified'],
    portfolioHighlights: ['Completed 8m boundary wall extension', 'Managed small garage conversion', 'Delivered paving and plaster finish bundle'],
    reviewHighlights: ['Kept the project on schedule and communicated material delays early.', 'Quality of plaster finish was better than expected.']
  }
};

const shortlistedProfessionalIds = new Set();

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
      role: 'client'
    });
  } catch (error) {
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
  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
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

    return { user, jobs, professionals, source: 'live', warning: null };
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
  await runtime.auth.tokenStore.hydrate();

  if (!runtime.auth.tokenStore.get()) {
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

  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
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

function toggleCustomerProfessionalShortlist(professionalId) {
  if (!professionalId) {
    throw new Error('professionalId is required');
  }

  if (shortlistedProfessionalIds.has(professionalId)) {
    shortlistedProfessionalIds.delete(professionalId);
  } else {
    shortlistedProfessionalIds.add(professionalId);
  }

  return { shortlisted: shortlistedProfessionalIds.has(professionalId), items: Array.from(shortlistedProfessionalIds) };
}

function getCustomerProfessionalShortlist() {
  return Array.from(shortlistedProfessionalIds);
}

function buildCustomerContactRequest(professional) {
  if (!professional) {
    throw new Error('professional is required');
  }

  return {
    title: `Request ${professional.trade} consultation with ${professional.name}`,
    trade: professional.trade || '',
    description: `Please help me connect with ${professional.name}. ${professional.summary || ''}`.trim(),
    budget: '',
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