const { createSharedLogicClient, auth, JOB_STATUS } = require('@tfx/shared-logic');
const secureTokenStorage = require('./secureTokenStorage');

const runtime = {
  createSharedLogicClient,
  auth,
  secureTokenStorage
};

function applyTokenPersistence() {
  runtime.auth.tokenStore.setPersistence({
    get: runtime.secureTokenStorage.getToken,
    set: runtime.secureTokenStorage.setToken,
    clear: runtime.secureTokenStorage.clearToken
  });
}

applyTokenPersistence();

async function restoreContractorSession() {
  await runtime.auth.tokenStore.hydrate();

  if (!runtime.auth.tokenStore.get()) {
    return { authenticated: false, warning: null };
  }

  const client = createClient();

  try {
    const user = await client.session.getCurrentUser();
    return { authenticated: true, user, warning: null };
  } catch (error) {
    runtime.auth.tokenStore.clear();
    return { authenticated: false, warning: 'Saved session expired. Please sign in again.' };
  }
}

const SAMPLE_PROJECTS = [
  {
    id: 'job-101',
    title: 'Kitchen plumbing and leak repair',
    trade: 'Plumbing',
    location: 'Midrand',
    budget: 'R4,000 - R8,500',
    urgency: 'Urgent',
    posted: '15 min ago',
    description: 'Homeowner needs a contractor to repair a sink leak, replace two shutoff valves, and test water pressure before the weekend.',
    requirements: ['Own transport', 'Can start today', 'Photo updates required'],
    leadType: 'Verified homeowner',
    matchScore: 93,
    status: JOB_STATUS.OPEN,
    source: 'sample'
  },
  {
    id: 'job-102',
    title: 'Solar inverter and backup setup',
    trade: 'Solar',
    location: 'Centurion',
    budget: 'R18,000 - R30,000',
    urgency: 'This week',
    posted: '42 min ago',
    description: 'Client wants an installer to supply and fit a hybrid inverter with battery backup and issue a compliance handover pack.',
    requirements: ['Accreditation preferred', 'Site inspection first', 'Warranty documentation'],
    leadType: 'Repeat customer',
    matchScore: 88,
    status: JOB_STATUS.OPEN,
    source: 'sample'
  },
  {
    id: 'job-103',
    title: 'Warehouse lighting replacement',
    trade: 'Electrical',
    location: 'Kempton Park',
    budget: 'R35,000 - R55,000',
    urgency: 'Flexible',
    posted: '1 hour ago',
    description: 'Commercial client requires phased replacement of interior lighting with LED fittings and updated distribution labels.',
    requirements: ['Team of 2+', 'After-hours availability', 'Commercial references'],
    leadType: 'Commercial lead',
    matchScore: 81,
    status: JOB_STATUS.OPEN,
    source: 'sample'
  },
  {
    id: 'job-104',
    title: 'Roof waterproofing before winter',
    trade: 'Roofing',
    location: 'Randburg',
    budget: 'R12,000 - R19,000',
    urgency: 'This week',
    posted: '2 hours ago',
    description: 'Townhouse owner wants sealing of visible cracks, valley inspection, and a 12-month workmanship guarantee.',
    requirements: ['Ladder equipment', 'Weekend slot preferred', 'Written quote required'],
    leadType: 'Verified homeowner',
    matchScore: 79,
    status: JOB_STATUS.OPEN,
    source: 'sample'
  }
];

function createClient() {
  const baseURL = (process && process.env && process.env.TFX_API_BASE_URL) || 'http://localhost:5005';

  return runtime.createSharedLogicClient({
    baseURL,
    getToken: async () => runtime.auth.tokenStore.get(),
    context: {
      associationId: 'assoc-contractor-demo',
      platform: 'react-native',
      appVersion: '0.0.1'
    }
  });
}

const SAMPLE_PROFILE = {
  professionalId: 'pro-003',
  name: 'Naledi Khumalo',
  trade: 'general contractor',
  tier: 'TRUSTED',
  rating: 4.7,
  completedJobs: 67,
  activeQuotes: 5,
  responseTime: '12 min'
};

function normalizeProfile(item) {
  return {
    professionalId: item.professionalId || item.id || SAMPLE_PROFILE.professionalId,
    name: item.name || SAMPLE_PROFILE.name,
    trade: item.trade || SAMPLE_PROFILE.trade,
    tier: item.tier || SAMPLE_PROFILE.tier,
    rating: typeof item.rating === 'number' ? item.rating : SAMPLE_PROFILE.rating,
    completedJobs: item.completedJobs || SAMPLE_PROFILE.completedJobs,
    activeQuotes: item.activeQuotes || SAMPLE_PROFILE.activeQuotes,
    responseTime: item.responseTime || SAMPLE_PROFILE.responseTime
  };
}

async function ensureSession() {
  await runtime.auth.tokenStore.hydrate();
  if (runtime.auth.tokenStore.get()) {
    return { source: 'live' };
  }

  return { source: 'sample', warning: 'No active session. Please sign in.' };
}

async function loginContractor(credentials) {
  await runtime.auth.tokenStore.hydrate();
  const client = createClient();

  try {
    const response = await client.session.login({ identifier: credentials.identifier || credentials.email || credentials.username || credentials.phoneNumber, password: credentials.password });
    return { user: response.user, source: 'live', warning: null };
  } catch (error) {
    const message = error && error.response && error.response.status === 401
      ? 'Invalid username, email, RSA mobile number, or password.'
      : 'Unable to reach the API server.';
    throw new Error(message);
  }
}

async function registerContractor(payload) {
  const client = createClient();

  try {
    const response = await client.session.register({
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: 'contractor',
      trade: payload.trade
    });
    return { user: response.user, source: 'live' };
  } catch (error) {
    const status = error && error.response && error.response.status;
    if (status === 409) {
      throw new Error('An account already exists for this email.');
    }
    throw new Error('Unable to register contractor account.');
  }
}

async function requestPasswordReset(email) {
  const client = createClient();

  try {
    const response = await client.session.requestPasswordReset({ email });
    return response;
  } catch (error) {
    throw new Error('Unable to request a password reset.');
  }
}

async function confirmPasswordReset(token, password) {
  const client = createClient();

  try {
    const response = await client.session.confirmPasswordReset({ token, password });
    return response;
  } catch (error) {
    throw new Error('Unable to reset the password with this token.');
  }
}

async function logoutContractor() {
  runtime.auth.tokenStore.clear();
}

async function subscribeContractorWhatsapp(phoneNumber) {
  try {
    const session = await ensureSession();
    if (!runtime.auth.tokenStore.get()) {
      return {
        item: {
          role: 'contractor',
          phoneNumber,
          subscribed: false,
          nextStep: `Sign in first, then subscribe ${phoneNumber} to TFX Hub WhatsApp.`
        },
        source: 'sample',
        warning: session.warning
      };
    }
    const client = createClient();
    const response = await client.session.subscribeWhatsapp(phoneNumber);
    return { item: response.item, source: 'live', warning: null };
  } catch (error) {
    return {
      item: {
        role: 'contractor',
        phoneNumber,
        subscribed: false,
        nextStep: `Unable to subscribe ${phoneNumber} live. Retry after reconnecting.`
      },
      source: 'sample',
      warning: 'Unable to save the contractor WhatsApp subscription live.'
    };
  }
}

function normalizeHistoryItem(item, jobs = []) {
  const job = jobs.find((candidate) => candidate.id === item.jobId);
  return {
    id: item.id,
    jobId: item.jobId,
    jobTitle: job ? titleFromJob(job) : 'Project activity',
    type: item.type,
    summary: item.summary,
    createdAt: item.createdAt || 'Recently',
    status: item.status || 'sent',
    source: item.source || 'live'
  };
}

function titleFromJob(job) {
  const trade = job.trade ? `${capitalize(job.trade)} project` : 'Project';
  const description = job.description || 'Contractor opportunity';
  const firstSentence = String(description).split('.').find(Boolean);
  return firstSentence ? `${trade}: ${firstSentence}` : trade;
}

function toDisplayTrade(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'plumber' || normalized === 'plumbing') return 'Plumbing';
  if (normalized === 'electrician' || normalized === 'electrical') return 'Electrical';
  if (normalized === 'roofer' || normalized === 'roofing') return 'Roofing';
  if (normalized === 'solar' || normalized === 'solar installer' || normalized === 'solar-installer') return 'Solar';
  return capitalize(value || 'General');
}

function toApiTrade(value) {
  if (value === 'Plumbing') return 'plumber';
  if (value === 'Electrical') return 'electrician';
  if (value === 'Roofing') return 'roofer';
  if (value === 'Solar') return 'solar';
  return String(value || '').toLowerCase();
}

function normalizeLiveJob(job) {
  return {
    id: job.id,
    title: titleFromJob(job),
    trade: toDisplayTrade(job.trade || 'General'),
    location: job.location || 'Johannesburg',
    budget: job.budget || 'Budget to be confirmed',
    urgency: job.urgency || 'Flexible',
    posted: job.posted || 'Recently added',
    description: job.description || 'No scope description provided yet.',
    requirements: Array.isArray(job.requirements) && job.requirements.length > 0
      ? job.requirements
      : ['Review scope', 'Confirm site visit', 'Send final quote'],
    leadType: job.leadType || 'Verified homeowner',
    matchScore: typeof job.matchScore === 'number' ? job.matchScore : 76,
    status: job.status || JOB_STATUS.OPEN,
    source: 'live'
  };
}

function capitalize(value) {
  const input = String(value || '');
  return input ? `${input.charAt(0).toUpperCase()}${input.slice(1)}` : '';
}

function filterProjects(projects, filters = {}) {
  const search = String(filters.search || '').trim().toLowerCase();
  const trade = filters.trade && filters.trade !== 'All' ? String(filters.trade).toLowerCase() : null;

  return projects.filter((project) => {
    if (trade && project.trade.toLowerCase() !== trade) {
      return false;
    }

    if (!search) {
      return true;
    }

    return [project.title, project.location, project.description, project.trade]
      .some((field) => String(field).toLowerCase().includes(search));
  });
}

async function fetchProjects(filters = {}) {
  try {
    const session = await ensureSession();
    if (!runtime.auth.tokenStore.get()) {
      return { items: [], source: 'sample', warning: session.warning };
    }
    const client = createClient();
    const response = await client.jobs.listJobs({
      status: JOB_STATUS.OPEN,
      ...(filters.trade && filters.trade !== 'All' ? { trade: toApiTrade(filters.trade) } : {})
    });

    const liveItems = Array.isArray(response && response.items)
      ? response.items.map(normalizeLiveJob)
      : [];

    const items = liveItems.length > 0 ? liveItems : SAMPLE_PROJECTS;
    return {
      items: filterProjects(items, filters),
      source: liveItems.length > 0 && session.source === 'live' ? 'live' : 'sample',
      warning: session.warning || null
    };
  } catch (error) {
    return {
      items: filterProjects(SAMPLE_PROJECTS, filters),
      source: 'sample',
      warning: 'Unable to reach jobs API. Showing sample leads.'
    };
  }
}

async function fetchContractorProfile() {
  try {
    const session = await ensureSession();
    if (!runtime.auth.tokenStore.get()) {
      return { item: SAMPLE_PROFILE, source: 'sample', warning: session.warning };
    }
    const client = createClient();
    const response = await client.contractor.getProfile();
    return {
      item: normalizeProfile(response && response.item ? response.item : {}),
      source: session.source === 'live' ? 'live' : 'sample',
      warning: session.warning || null
    };
  } catch (error) {
    return { item: SAMPLE_PROFILE, source: 'sample', warning: 'Unable to reach contractor profile API. Showing sample profile.' };
  }
}

async function fetchLeadHistory() {
  try {
    const session = await ensureSession();
    if (!runtime.auth.tokenStore.get()) {
      return { items: [], source: 'sample', warning: session.warning };
    }
    const client = createClient();
    const [historyResponse, jobsResponse] = await Promise.all([
      client.contractor.listLeadHistory(),
      client.jobs.listJobs({ status: JOB_STATUS.OPEN })
    ]);
    const jobs = Array.isArray(jobsResponse && jobsResponse.items) ? jobsResponse.items : [];
    const items = Array.isArray(historyResponse && historyResponse.items)
      ? historyResponse.items.map((item) => normalizeHistoryItem(item, jobs))
      : [];
    return { items, source: session.source === 'live' ? 'live' : 'sample', warning: session.warning || null };
  } catch (error) {
    return { items: [], source: 'sample', warning: 'Unable to reach lead history API. History will be local for this session.' };
  }
}

async function expressInterest(jobId, professionalId = SAMPLE_PROFILE.professionalId) {
  try {
    const session = await ensureSession();
    if (!runtime.auth.tokenStore.get()) {
      return { id: `app-${Date.now()}`, source: 'sample', warning: session.warning };
    }
    const client = createClient();
    const response = await client.jobs.applyForJob(jobId, { professionalId });
    return {
      id: response && response.applicationId ? response.applicationId : `app-${Date.now()}`,
      source: 'live'
    };
  } catch (error) {
    return {
      id: `app-${Date.now()}`,
      source: 'sample'
    };
  }
}

async function submitQuote(jobId, quote) {
  try {
    const session = await ensureSession();
    if (!runtime.auth.tokenStore.get()) {
      return {
        id: `quote-${jobId}-${Date.now()}`,
        summary: `Quote ${quote.amount || 'TBC'} · ${quote.timeline || 'Timeline pending'}`,
        source: 'sample',
        warning: session.warning
      };
    }
    const client = createClient();
    const response = await client.contractor.submitQuote(jobId, quote);
    return {
      id: response && response.item && response.item.id ? response.item.id : `quote-${jobId}-${Date.now()}`,
      summary: response && response.item && response.item.summary
        ? response.item.summary
        : `Quote ${quote.amount || 'TBC'} · ${quote.timeline || 'Timeline pending'}`,
      source: 'live'
    };
  } catch (error) {
    return {
      id: `quote-${jobId}-${Date.now()}`,
      summary: `Quote ${quote.amount || 'TBC'} · ${quote.timeline || 'Timeline pending'}`,
      source: 'sample'
    };
  }
}

async function sendMessage(jobId, message) {
  try {
    const session = await ensureSession();
    if (!runtime.auth.tokenStore.get()) {
      return { id: `msg-${jobId}-${Date.now()}`, summary: message.body, source: 'sample', warning: session.warning };
    }
    const client = createClient();
    const response = await client.contractor.sendMessage(jobId, message);
    return {
      id: response && response.item && response.item.id ? response.item.id : `msg-${jobId}-${Date.now()}`,
      summary: response && response.item && response.item.summary ? response.item.summary : message.body,
      source: 'live'
    };
  } catch (error) {
    return {
      id: `msg-${jobId}-${Date.now()}`,
      summary: message.body,
      source: 'sample'
    };
  }
}

module.exports = {
  restoreContractorSession,
  loginContractor,
  registerContractor,
  requestPasswordReset,
  confirmPasswordReset,
  logoutContractor,
  subscribeContractorWhatsapp,
  fetchContractorProfile,
  fetchLeadHistory,
  fetchProjects,
  expressInterest,
  sendMessage,
  submitQuote,
  __setTestDependencies(overrides = {}) {
    if (overrides.createSharedLogicClient) {
      runtime.createSharedLogicClient = overrides.createSharedLogicClient;
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
    runtime.createSharedLogicClient = createSharedLogicClient;
    runtime.auth = auth;
    runtime.secureTokenStorage = secureTokenStorage;
    applyTokenPersistence();
  }
};
