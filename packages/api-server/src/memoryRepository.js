const bcrypt = require('bcryptjs');
const { getAdminBootstrapConfig, normalizeUsername } = require('./adminAccess');

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

async function createMemoryRepository(options = {}) {
  const users = [...(options.users || [])];
  const jobs = [...(options.jobs || [])];
  const applications = [...(options.applications || [])];
  const events = [...(options.events || [])];
  const adminActions = [...(options.adminActions || [])];
  const adminAuditEvents = [...(options.adminAuditEvents || [])];
  const customerShortlist = new Map(Object.entries(options.customerShortlist || {}));
  const onboarding = { ...(options.onboarding || {}) };
  const resetTokens = { ...(options.resetTokens || {}) };
  const whatsappSessions = { ...(options.whatsappSessions || {}) };

  async function initialize() {
    const adminBootstrap = getAdminBootstrapConfig();
    if (users.length === 0) {
      users.push(
        {
          id: 'user-contractor-001',
          associationId: 'assoc-contractor-demo',
          email: 'contractor@example.com',
          username: 'naledi.khumalo',
          passwordHash: await bcrypt.hash('password123', 10),
          firstName: 'Naledi',
          lastName: 'Khumalo',
          role: 'contractor',
          professionalId: 'pro-003',
          trade: 'general contractor',
          tier: 'TRUSTED',
          rating: 4.7,
          completedJobs: 67,
          activeQuotes: 5,
          responseTime: '12 min',
          phoneNumber: '+27710000001',
          createdAt: new Date().toISOString()
        },
        {
          id: 'user-contractor-002',
          associationId: 'assoc-contractor-demo',
          email: 'plumber@example.com',
          username: 'john.smit',
          passwordHash: await bcrypt.hash('password123', 10),
          firstName: 'John',
          lastName: 'Smit',
          role: 'contractor',
          professionalId: 'pro-001',
          trade: 'plumber',
          tier: 'PREMIUM',
          rating: 4.8,
          completedJobs: 247,
          activeQuotes: 11,
          responseTime: '9 min',
          phoneNumber: '+27710000002',
          createdAt: new Date().toISOString()
        },
        {
          id: 'client-001',
          associationId: 'assoc-customer-demo',
          email: 'client@example.com',
          username: 'ayanda.mokoena',
          passwordHash: await bcrypt.hash('password123', 10),
          firstName: 'Ayanda',
          lastName: 'Mokoena',
          role: 'client',
          professionalId: null,
          trade: null,
          tier: null,
          rating: null,
          completedJobs: 0,
          activeQuotes: 0,
          responseTime: 'N/A',
          phoneNumber: '+27710000003',
          createdAt: new Date().toISOString()
        },
        {
          id: 'admin-001',
          associationId: 'assoc-admin-demo',
          email: adminBootstrap.email,
          username: adminBootstrap.username,
          passwordHash: await bcrypt.hash(adminBootstrap.password, 10),
          isBootstrapAdmin: true,
          firstName: 'Platform',
          lastName: 'Admin',
          role: 'admin',
          professionalId: null,
          trade: null,
          tier: null,
          rating: null,
          completedJobs: 0,
          activeQuotes: 0,
          responseTime: 'N/A',
          phoneNumber: '+27710000004',
          createdAt: new Date().toISOString()
        },
        {
          id: 'association-001',
          associationId: 'assoc-members-demo',
          email: 'association@example.com',
          username: 'tfx.association',
          passwordHash: await bcrypt.hash('password123', 10),
          firstName: 'TFX',
          lastName: 'Association',
          role: 'association',
          professionalId: null,
          trade: null,
          tier: null,
          rating: null,
          completedJobs: 0,
          activeQuotes: 0,
          responseTime: 'N/A',
          phoneNumber: '+27710000005',
          createdAt: new Date().toISOString()
        },
        {
          id: 'professional-001',
          associationId: 'assoc-members-demo',
          email: 'professional@example.com',
          username: 'lerato.ndlovu',
          passwordHash: await bcrypt.hash('password123', 10),
          firstName: 'Lerato',
          lastName: 'Ndlovu',
          role: 'professional',
          professionalId: 'pro-101',
          trade: 'electrician',
          tier: 'VERIFIED',
          rating: 4.6,
          completedJobs: 34,
          activeQuotes: 0,
          responseTime: 'N/A',
          phoneNumber: '+27710000006',
          createdAt: new Date().toISOString()
        }
      );
    }

    if (jobs.length === 0) {
      jobs.push(
        {
          id: 'job-001',
          title: 'Kitchen plumbing and leak repair',
          description: 'Homeowner needs a contractor to repair a sink leak, replace two shutoff valves, and test water pressure before the weekend.',
          trade: 'plumber',
          status: 'OPEN',
          budget: 'R4,000 - R8,500',
          location: 'Midrand',
          urgency: 'Urgent',
          posted: '15 min ago',
          leadType: 'Verified homeowner',
          matchScore: 93,
          clientId: 'client-001',
          createdAt: new Date().toISOString()
        },
        {
          id: 'job-002',
          title: 'Build garden wall',
          description: 'Client needs a boundary wall completed over the next week.',
          trade: 'builder',
          status: 'OPEN',
          budget: 'R15,000 - R25,000',
          location: 'Centurion',
          urgency: 'This week',
          posted: '42 min ago',
          leadType: 'Repeat customer',
          matchScore: 81,
          clientId: 'client-002',
          createdAt: new Date().toISOString()
        }
      );
    }
  }

  function normalizeUser(user) {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      associationId: user.associationId,
      email: user.email,
      username: normalizeUsername(user.username),
      passwordHash: user.passwordHash,
      isBootstrapAdmin: Boolean(user.isBootstrapAdmin),
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      professionalId: user.professionalId,
      trade: user.trade,
      tier: user.tier,
      rating: Number(user.rating || 4.5),
      completedJobs: Number(user.completedJobs || 0),
      activeQuotes: Number(user.activeQuotes || 0),
      responseTime: user.responseTime || '12 min',
      phoneNumber: user.phoneNumber || null,
      createdAt: toIso(user.createdAt)
    };
  }

  function toProfessional(user) {
    if (!user || user.role !== 'contractor') {
      return null;
    }

    return {
      id: user.professionalId || user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      trade: user.trade,
      tier: user.tier,
      rating: Number(user.rating || 4.5)
    };
  }

  function normalizeJob(job) {
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      title: job.title,
      description: job.description,
      trade: job.trade,
      status: job.status,
      budget: job.budget,
      location: job.location,
      urgency: job.urgency,
      posted: job.posted,
      leadType: job.leadType,
      matchScore: Number(job.matchScore || 75),
      clientId: job.clientId,
      createdAt: toIso(job.createdAt)
    };
  }

  return {
    async initialize() {
      await initialize();
    },

    async getUserByEmail(email) {
      return normalizeUser(users.find((user) => user.email.toLowerCase() === String(email).toLowerCase()));
    },

    async getUserByUsername(username) {
      return normalizeUser(users.find((user) => normalizeUsername(user.username) === normalizeUsername(username)));
    },

    async getUserById(userId) {
      return normalizeUser(users.find((user) => user.id === userId));
    },

    async createUser(user) {
      const item = {
        id: user.id,
        associationId: user.associationId,
        email: user.email,
        username: normalizeUsername(user.username),
        passwordHash: user.passwordHash,
        isBootstrapAdmin: Boolean(user.isBootstrapAdmin),
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        professionalId: user.professionalId,
        trade: user.trade,
        tier: user.tier,
        rating: user.rating,
        completedJobs: user.completedJobs,
        activeQuotes: user.activeQuotes,
        responseTime: user.responseTime,
        phoneNumber: user.phoneNumber || null,
        createdAt: new Date().toISOString()
      };
      users.push(item);
      return normalizeUser(item);
    },

    async getUserByPhoneNumber(phoneNumber) {
      return normalizeUser(users.find((user) => user.phoneNumber === phoneNumber));
    },

    async listAdminUsers() {
      return users
        .filter((user) => user.role === 'admin')
        .map(normalizeUser)
        .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
    },

    async updateUserPhoneNumber(userId, phoneNumber) {
      const user = users.find((candidate) => candidate.id === userId);
      if (!user) {
        return null;
      }
      user.phoneNumber = phoneNumber;
      return normalizeUser(user);
    },

    async listProfessionals(filters = {}) {
      return users
        .map(toProfessional)
        .filter(Boolean)
        .filter((professional) => !filters.trade || professional.trade === filters.trade);
    },

    async getProfessionalById(professionalId) {
      return users.map(toProfessional).find((professional) => professional && professional.id === professionalId) || null;
    },

    async listCustomerShortlist(customerUserId) {
      return [...(customerShortlist.get(customerUserId) || [])];
    },

    async addCustomerShortlistItem(customerUserId, professionalId) {
      const items = new Set(customerShortlist.get(customerUserId) || []);
      items.add(professionalId);
      customerShortlist.set(customerUserId, items);
      return true;
    },

    async removeCustomerShortlistItem(customerUserId, professionalId) {
      const items = new Set(customerShortlist.get(customerUserId) || []);
      const existed = items.delete(professionalId);
      customerShortlist.set(customerUserId, items);
      return existed;
    },

    async listJobs(filters = {}) {
      return jobs
        .filter((job) => (!filters.status || job.status === filters.status) && (!filters.trade || job.trade === filters.trade))
        .map(normalizeJob);
    },

    async getJobById(jobId) {
      return normalizeJob(jobs.find((job) => job.id === jobId));
    },

    async createJob(job) {
      const item = {
        id: job.id,
        title: job.title,
        description: job.description,
        trade: job.trade,
        status: job.status,
        budget: job.budget,
        location: job.location,
        urgency: job.urgency,
        posted: job.posted,
        leadType: job.leadType,
        matchScore: job.matchScore,
        clientId: job.clientId,
        createdAt: new Date().toISOString()
      };
      jobs.push(item);
      return normalizeJob(item);
    },

    async createJobApplication(application) {
      const item = {
        id: application.id,
        jobId: application.jobId,
        professionalId: application.professionalId,
        message: application.message || '',
        createdAt: new Date().toISOString()
      };
      applications.push(item);
      return { ...item };
    },

    async appendContractorEvent(event) {
      const item = {
        id: event.id,
        professionalId: event.professionalId,
        jobId: event.jobId,
        type: event.type,
        summary: event.summary,
        status: event.status,
        note: event.note || '',
        createdAt: new Date().toISOString(),
        source: 'live'
      };
      events.unshift(item);
      return { ...item };
    },

    async createAdminAction(action) {
      const item = {
        id: action.id,
        professionalId: action.professionalId,
        actionType: action.actionType,
        summary: action.summary,
        note: action.note || '',
        createdBy: action.createdBy,
        createdAt: new Date().toISOString(),
        source: 'live'
      };
      adminActions.unshift(item);
      return { ...item };
    },

    async createOperationalAction(action) {
      return this.createAdminAction(action);
    },

    async listAdminActions(professionalId) {
      return adminActions
        .filter((action) => action.professionalId === professionalId)
        .map((action) => ({ ...action }));
    },

    async listOperationalActions(professionalId) {
      return this.listAdminActions(professionalId);
    },

    async getContractorHistory(professionalId) {
      return events.filter((event) => event.professionalId === professionalId).map((event) => ({ ...event }));
    },

    async getOnboardingStatus(userId) {
      return { completedStages: [...(onboarding[userId] || [])] };
    },

    async submitOnboardingStage(userId, stage) {
      if (!onboarding[userId]) {
        onboarding[userId] = [];
      }
      if (!onboarding[userId].includes(stage)) {
        onboarding[userId].push(stage);
      }
      return { completedStages: [...onboarding[userId]] };
    },

    async createPasswordResetToken(entry) {
      resetTokens[entry.token] = {
        token: entry.token,
        userId: entry.userId,
        expiresAt: entry.expiresAt,
        consumedAt: null
      };
      return { ...resetTokens[entry.token] };
    },

    async getPasswordResetToken(token) {
      const item = resetTokens[token];
      return item ? { ...item } : null;
    },

    async consumePasswordResetToken(token) {
      if (resetTokens[token]) {
        resetTokens[token].consumedAt = new Date().toISOString();
      }
      return resetTokens[token] ? { ...resetTokens[token] } : null;
    },

    async updateUserPassword(userId, passwordHash) {
      const user = users.find((candidate) => candidate.id === userId);
      if (!user) {
        return null;
      }
      user.passwordHash = passwordHash;
      return normalizeUser(user);
    },

    async updateAdminUserCredentials(userId, updates = {}) {
      const user = users.find((candidate) => candidate.id === userId && candidate.role === 'admin');
      if (!user) {
        return null;
      }
      if (typeof updates.username !== 'undefined') {
        user.username = normalizeUsername(updates.username);
      }
      if (typeof updates.passwordHash !== 'undefined') {
        user.passwordHash = updates.passwordHash;
      }
      if (typeof updates.email !== 'undefined') {
        user.email = updates.email;
      }
      return normalizeUser(user);
    },

    async createAdminAuditEvent(event) {
      const item = {
        id: event.id,
        adminUserId: event.adminUserId || null,
        eventType: event.eventType,
        outcome: event.outcome,
        reason: event.reason || '',
        identifier: event.identifier || null,
        requestPath: event.requestPath || null,
        requestMethod: event.requestMethod || null,
        targetUserId: event.targetUserId || null,
        ipAddress: event.ipAddress || null,
        createdAt: event.createdAt || new Date().toISOString()
      };
      adminAuditEvents.unshift(item);
      return { ...item };
    },

    async listAdminAuditEvents(filters = {}) {
      const limit = Number(filters.limit || 50);
      return adminAuditEvents
        .filter((item) => !filters.adminUserId || item.adminUserId === filters.adminUserId)
        .filter((item) => !filters.eventType || item.eventType === filters.eventType)
        .filter((item) => !filters.outcome || item.outcome === filters.outcome)
        .filter((item) => !filters.targetUserId || item.targetUserId === filters.targetUserId)
        .slice(0, limit)
        .map((item) => ({ ...item }));
    },

    async getWhatsappContractorSession(phoneNumber) {
      return whatsappSessions[phoneNumber] ? { ...whatsappSessions[phoneNumber] } : null;
    },

    async upsertWhatsappContractorSession(phoneNumber, session) {
      whatsappSessions[phoneNumber] = {
        ...session,
        phoneNumber,
        updatedAt: new Date().toISOString()
      };
      return { ...whatsappSessions[phoneNumber] };
    },

    async clearWhatsappContractorSession(phoneNumber) {
      delete whatsappSessions[phoneNumber];
      return { ok: true };
    },

    async getWhatsappCustomerSession(phoneNumber) {
      return whatsappSessions[`customer:${phoneNumber}`] ? { ...whatsappSessions[`customer:${phoneNumber}`] } : null;
    },

    async upsertWhatsappCustomerSession(phoneNumber, session) {
      whatsappSessions[`customer:${phoneNumber}`] = {
        ...session,
        phoneNumber,
        updatedAt: new Date().toISOString()
      };
      return { ...whatsappSessions[`customer:${phoneNumber}`] };
    },

    async getWhatsappAdminSession(phoneNumber) {
      return whatsappSessions[`admin:${phoneNumber}`] ? { ...whatsappSessions[`admin:${phoneNumber}`] } : null;
    },

    async upsertWhatsappAdminSession(phoneNumber, session) {
      whatsappSessions[`admin:${phoneNumber}`] = {
        ...session,
        phoneNumber,
        updatedAt: new Date().toISOString()
      };
      return { ...whatsappSessions[`admin:${phoneNumber}`] };
    },

    async getWhatsappAssociationSession(phoneNumber) {
      return whatsappSessions[`association:${phoneNumber}`] ? { ...whatsappSessions[`association:${phoneNumber}`] } : null;
    },

    async upsertWhatsappAssociationSession(phoneNumber, session) {
      whatsappSessions[`association:${phoneNumber}`] = {
        ...session,
        phoneNumber,
        updatedAt: new Date().toISOString()
      };
      return { ...whatsappSessions[`association:${phoneNumber}`] };
    },

    async getWhatsappProfessionalSession(phoneNumber) {
      return whatsappSessions[`professional:${phoneNumber}`] ? { ...whatsappSessions[`professional:${phoneNumber}`] } : null;
    },

    async upsertWhatsappProfessionalSession(phoneNumber, session) {
      whatsappSessions[`professional:${phoneNumber}`] = {
        ...session,
        phoneNumber,
        updatedAt: new Date().toISOString()
      };
      return { ...whatsappSessions[`professional:${phoneNumber}`] };
    },

    async getWhatsappMetaRouterSession(phoneNumber) {
      return whatsappSessions[`meta:${phoneNumber}`] ? { ...whatsappSessions[`meta:${phoneNumber}`] } : null;
    },

    async upsertWhatsappMetaRouterSession(phoneNumber, session) {
      whatsappSessions[`meta:${phoneNumber}`] = {
        ...session,
        phoneNumber,
        updatedAt: new Date().toISOString()
      };
      return { ...whatsappSessions[`meta:${phoneNumber}`] };
    },

    async clearWhatsappMetaRouterSession(phoneNumber) {
      delete whatsappSessions[`meta:${phoneNumber}`];
      return { ok: true };
    }
  };
}

module.exports = {
  createMemoryRepository
};