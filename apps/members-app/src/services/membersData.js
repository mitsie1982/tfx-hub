const { createMembersApp } = require('../../../../packages/members-app/src');
const { auth } = require('@tfx/shared-logic');
const secureTokenStorage = require('../secureTokenStorage');

const runtime = {
  createMembersApp,
  auth,
  secureTokenStorage
};

const SAMPLE_OVERVIEW = {
  totals: { openJobs: 4, inProgressJobs: 2, completedJobs: 13, professionals: 9 },
  openJobsByTrade: { plumber: 2, electrician: 1, builder: 1 },
  professionalsByTrade: { plumber: 3, builder: 2, electrician: 2, roofer: 2 }
};

const SAMPLE_PROFESSIONAL = {
  id: 'pro-101',
  name: 'Lerato Ndlovu',
  trade: 'electrician',
  tier: 'VERIFIED',
  rating: 4.6
};

function applyTokenPersistence() {
  runtime.auth.tokenStore.setPersistence({
    get: runtime.secureTokenStorage.getToken,
    set: runtime.secureTokenStorage.setToken,
    clear: runtime.secureTokenStorage.clearToken
  });
}

applyTokenPersistence();

function createApp() {
  return runtime.createMembersApp({
    baseURL: (process && process.env && process.env.TFX_API_BASE_URL) || 'http://localhost:5005',
    getToken: async () => runtime.auth.tokenStore.get(),
    context: {
      associationId: 'assoc-members-demo',
      platform: 'react-native',
      appVersion: '0.0.1'
    }
  });
}

async function fetchAssociationMobileOverview() {
  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
    return { overview: SAMPLE_OVERVIEW, source: 'sample', warning: 'No active members session. Showing sample association data.' };
  }

  try {
    const app = createApp();
    const overview = await app.association.getOverview();
    return { overview, source: 'live', warning: null };
  } catch (error) {
    return { overview: SAMPLE_OVERVIEW, source: 'sample', warning: 'Unable to load live association overview. Showing sample data.' };
  }
}

async function performAssociationOperationalAction(professionalId, actionType) {
  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
    return {
      item: {
        id: `association-action-${Date.now()}`,
        professionalId,
        actionType,
        summary: actionType === 'trade-outreach' ? 'Trade outreach queued' : 'Member review queued',
        source: 'sample'
      },
      source: 'sample',
      warning: 'No active members session. Action recorded locally as sample data.'
    };
  }

  try {
    const app = createApp();
    const item = await app.association.runOperationalAction(professionalId, actionType, {});
    return { item, source: 'live', warning: null };
  } catch (error) {
    return {
      item: {
        id: `association-action-${Date.now()}`,
        professionalId,
        actionType,
        summary: actionType === 'trade-outreach' ? 'Trade outreach queued' : 'Member review queued',
        source: 'sample'
      },
      source: 'sample',
      warning: 'Unable to save the association action live.'
    };
  }
}

async function fetchProfessionalMobileProfile(professionalId = SAMPLE_PROFESSIONAL.id) {
  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
    return { item: SAMPLE_PROFESSIONAL, source: 'sample', warning: 'No active members session. Showing sample professional profile.' };
  }

  try {
    const app = createApp();
    const item = await app.professionals.getProfile(professionalId);
    return { item: item || SAMPLE_PROFESSIONAL, source: 'live', warning: null };
  } catch (error) {
    return { item: SAMPLE_PROFESSIONAL, source: 'sample', warning: 'Unable to load live professional profile. Showing sample data.' };
  }
}

async function performProfessionalOperationalAction(actionType, professionalId = SAMPLE_PROFESSIONAL.id) {
  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
    return {
      item: {
        id: `professional-action-${Date.now()}`,
        professionalId,
        actionType,
        summary: actionType === 'tier-review-request' ? 'Tier review requested' : 'Availability check-in recorded',
        source: 'sample'
      },
      source: 'sample',
      warning: 'No active members session. Request recorded locally as sample data.'
    };
  }

  try {
    const app = createApp();
    const item = await app.professionals.submitOperationalRequest(actionType, {}, professionalId);
    return { item, source: 'live', warning: null };
  } catch (error) {
    return {
      item: {
        id: `professional-action-${Date.now()}`,
        professionalId,
        actionType,
        summary: actionType === 'tier-review-request' ? 'Tier review requested' : 'Availability check-in recorded',
        source: 'sample'
      },
      source: 'sample',
      warning: 'Unable to save the professional request live.'
    };
  }
}

async function fetchProfessionalOperationalRequests(professionalId = SAMPLE_PROFESSIONAL.id) {
  await runtime.auth.tokenStore.hydrate();
  if (!runtime.auth.tokenStore.get()) {
    return { items: [], source: 'sample', warning: 'No active members session. Showing sample request history.' };
  }

  try {
    const app = createApp();
    const items = await app.professionals.listOperationalRequests(professionalId);
    return { items, source: 'live', warning: null };
  } catch (error) {
    return { items: [], source: 'sample', warning: 'Unable to load live professional request history.' };
  }
}

module.exports = {
  fetchAssociationMobileOverview,
  fetchProfessionalMobileProfile,
  fetchProfessionalOperationalRequests,
  performAssociationOperationalAction,
  performProfessionalOperationalAction,
  __setTestDependencies(overrides = {}) {
    if (overrides.createMembersApp) {
      runtime.createMembersApp = overrides.createMembersApp;
    }
    if (overrides.auth) {
      runtime.auth = overrides.auth;
    }
    if (overrides.secureTokenStorage) {
      runtime.secureTokenStorage = overrides.secureTokenStorage;
    }
    applyTokenPersistence();
  },
  __resetTestDependencies() {
    runtime.createMembersApp = createMembersApp;
    runtime.auth = auth;
    runtime.secureTokenStorage = secureTokenStorage;
    applyTokenPersistence();
  }
};