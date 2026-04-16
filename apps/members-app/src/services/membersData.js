const { createMembersApp } = require('../../../../packages/members-app/src');
const { auth, getHumanFacingDemoSeed } = require('@tfx/shared-logic');
const secureTokenStorage = require('../secureTokenStorage');

const runtime = {
  createMembersApp,
  auth,
  secureTokenStorage
};

const demoSeed = getHumanFacingDemoSeed();
const SAMPLE_OVERVIEW = demoSeed.members.overview;
const SAMPLE_PROFESSIONALS = demoSeed.members.professionals;
const SAMPLE_PROFESSIONAL_DETAILS = demoSeed.professionals.directory.reduce((accumulator, professional) => {
  accumulator[professional.id] = professional;
  return accumulator;
}, {});
const SAMPLE_ASSOCIATION_ACTIONS = demoSeed.members.associationActions;
const SAMPLE_PROFESSIONAL_REQUESTS = demoSeed.members.professionalRequests;
const SAMPLE_PROFESSIONAL = SAMPLE_PROFESSIONAL_DETAILS['pro-003'];

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
    return { item: SAMPLE_PROFESSIONAL_DETAILS[professionalId] || SAMPLE_PROFESSIONAL, source: 'sample', warning: 'No active members session. Showing seeded professional profile.' };
  }

  try {
    const app = createApp();
    const item = await app.professionals.getProfile(professionalId);
    return { item: item || SAMPLE_PROFESSIONAL_DETAILS[professionalId] || SAMPLE_PROFESSIONAL, source: 'live', warning: null };
  } catch (error) {
    return { item: SAMPLE_PROFESSIONAL_DETAILS[professionalId] || SAMPLE_PROFESSIONAL, source: 'sample', warning: 'Unable to load live professional profile. Showing seeded sample data.' };
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
    return { items: SAMPLE_PROFESSIONAL_REQUESTS[professionalId] || [], source: 'sample', warning: 'No active members session. Showing seeded request history.' };
  }

  try {
    const app = createApp();
    const items = await app.professionals.listOperationalRequests(professionalId);
    return { items, source: 'live', warning: null };
  } catch (error) {
    return { items: SAMPLE_PROFESSIONAL_REQUESTS[professionalId] || [], source: 'sample', warning: 'Unable to load live professional request history. Showing seeded request history.' };
  }
}

function getSampleMembersProfessionals() {
  return SAMPLE_PROFESSIONALS;
}

function getSampleMembersAssociationActions(professionalId = SAMPLE_PROFESSIONAL.id) {
  return SAMPLE_ASSOCIATION_ACTIONS[professionalId] || [];
}

module.exports = {
  fetchAssociationMobileOverview,
  fetchProfessionalMobileProfile,
  fetchProfessionalOperationalRequests,
  getSampleMembersAssociationActions,
  getSampleMembersProfessionals,
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
