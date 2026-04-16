'use strict';

const bcrypt = require('bcryptjs');
const { normalizePhoneNumber } = require('./whatsappContractor');
const ACTION_PAGE_SIZE = 5;

function normalizeCommand(value) {
  return String(value || '').trim().toLowerCase();
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "Association Member Management System (AMMS)",
    lastName: parts.slice(1).join(' ') || 'User'
  };
}

function summarizeSession(session, user) {
  return {
    phoneNumber: session.phoneNumber,
    linked: Boolean(user),
    screen: session.screen,
    userId: session.userId || user?.id || null,
    activeProfessionalId: session.activeProfessionalId || null,
    activeActionPageOffset: Number.isFinite(session.actionPageOffset) ? session.actionPageOffset : 0,
    lastProfessionalIds: session.lastProfessionalIds || []
  };
}

function clampActionPageOffset(total, offset) {
  const normalizedOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0;
  if (total <= 0) {
    return 0;
  }
  if (normalizedOffset >= total) {
    return Math.max(0, Math.floor((total - 1) / ACTION_PAGE_SIZE) * ACTION_PAGE_SIZE);
  }
  return normalizedOffset;
}

function countBy(items, selector) {
  return items.reduce((accumulator, item) => {
    const key = selector(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function formatMenu(user, totals) {
  return [
    `Welcome back, ${user.firstName}.`,
    '',
    `Open jobs: ${totals.openJobs} | In progress: ${totals.inProgressJobs} | Completed: ${totals.completedJobs}`,
    `Visible professionals: ${totals.professionals}`,
    '',
    'Reply with a number:',
    '1. Association Overview',
    '2. Professional Directory',
    '3. Trade Breakdown',
    '4. Recent Actions',
    '5. Help'
  ].join('\n');
}

function formatOverview(totals) {
  return [
    'Association overview',
    '',
    `Open jobs: ${totals.openJobs}`,
    `In progress jobs: ${totals.inProgressJobs}`,
    `Completed jobs: ${totals.completedJobs}`,
    `Professionals: ${totals.professionals}`,
    '',
    'Reply M for menu.'
  ].join('\n');
}

function formatTradeBreakdown(openJobsByTrade, professionalsByTrade) {
  const rows = ['Trade breakdown', ''];
  rows.push('Open jobs by trade:');
  Object.entries(openJobsByTrade).forEach(([trade, count]) => {
    rows.push(`- ${trade}: ${count}`);
  });
  rows.push('');
  rows.push('Professionals by trade:');
  Object.entries(professionalsByTrade).forEach(([trade, count]) => {
    rows.push(`- ${trade}: ${count}`);
  });
  rows.push('');
  rows.push('Reply M for menu.');
  return rows.join('\n');
}

function formatDirectory(items) {
  if (!items.length) {
    return 'No professionals are available right now. Reply M for menu.';
  }
  const rows = ['Professional directory', ''];
  items.forEach((item, index) => {
    rows.push(`${index + 1}. ${item.name}`);
    rows.push(`${item.trade} | ${item.tier || 'ONBOARDED'} | ${item.rating || 'N/A'} rating`);
    rows.push('');
  });
  rows.push('Reply with a professional number to inspect.');
  rows.push('Reply M for menu.');
  return rows.join('\n');
}

function formatProfessionalDetail(item) {
  return [
    item.name,
    `ID: ${item.id || item.professionalId || 'Not set'}`,
    `Trade: ${item.trade}`,
    `Tier: ${item.tier || 'ONBOARDED'}`,
    `Rating: ${item.rating || 'N/A'}`,
    '',
    'Reply:',
    '1. Queue member review',
    '2. Queue trade outreach',
    '3. Back to directory',
    '4. Menu'
  ].join('\n');
}

function formatRecentActions(items, actionWindow = {}) {
  const pageOffset = Number.isFinite(actionWindow.pageOffset) ? actionWindow.pageOffset : 0;
  const totalItems = Number.isFinite(actionWindow.totalItems) ? actionWindow.totalItems : items.length;
  const hasMore = Boolean(actionWindow.hasMore);
  if (!items.length) {
    return 'No association actions recorded yet. Reply M for menu.';
  }
  const rows = ['Recent association actions', ''];
  rows.push(`Showing ${pageOffset + 1}-${pageOffset + items.length} of ${totalItems} actions`);
  rows.push('');
  items.forEach((item, index) => {
    rows.push(`${index + 1}. ${item.summary}`);
    rows.push(`${item.actionType} | ${item.createdAt || 'Recently'}`);
    rows.push('');
  });
  if (hasMore) {
    rows.push('Reply MORE for older actions.');
  }
  rows.push('Reply M for menu.');
  return rows.join('\n');
}

function formatHelp() {
  return [
    'Association help',
    '',
    '1. Association Overview shows job and professional totals.',
    '2. Professional Directory lists visible professionals.',
    '3. Trade Breakdown summarizes demand and supply by trade.',
    '4. Recent Actions shows queued member follow-ups.',
    '',
    'Reply M for menu.'
  ].join('\n');
}

function createWhatsappAssociationService({ repository, logger, createId }) {
  const log = logger || { info() {}, warn() {}, error() {} };

  async function loadSession(phoneNumber) {
    const normalized = normalizePhoneNumber(phoneNumber);
    const existing = await repository.getWhatsappAssociationSession(normalized);
    return existing || {
      phoneNumber: normalized,
      screen: 'unlinked_entry',
      userId: null,
      activeProfessionalId: null,
      actionPageOffset: 0,
      lastProfessionalIds: [],
      registrationDraft: null
    };
  }

  async function saveSession(session) {
    await repository.upsertWhatsappAssociationSession(session.phoneNumber, session);
    return session;
  }

  async function getLinkedUser(phoneNumber, session) {
    const byPhone = await repository.getUserByPhoneNumber(phoneNumber);
    if (byPhone && byPhone.role === 'association') {
      return byPhone;
    }
    if (session.userId) {
      const user = await repository.getUserById(session.userId);
      return user && user.role === 'association' ? user : null;
    }
    return null;
  }

  async function getOverviewData() {
    const [openJobs, inProgressJobs, completedJobs, professionals] = await Promise.all([
      repository.listJobs({ status: 'OPEN' }),
      repository.listJobs({ status: 'IN_PROGRESS' }),
      repository.listJobs({ status: 'COMPLETED' }),
      repository.listProfessionals({})
    ]);
    return {
      totals: {
        openJobs: openJobs.length,
        inProgressJobs: inProgressJobs.length,
        completedJobs: completedJobs.length,
        professionals: professionals.length
      },
      openJobsByTrade: countBy(openJobs, (item) => item.trade || 'unknown'),
      professionalsByTrade: countBy(professionals, (item) => item.trade || 'unknown')
    };
  }

  async function buildMenu(session, user) {
    const overview = await getOverviewData();
    session.screen = 'menu';
    session.userId = user.id;
    await saveSession(session);
    return { reply: formatMenu(user, overview.totals), options: ['1', '2', '3', '4', '5'], session: summarizeSession(session, user) };
  }

  async function buildRecentActions(session, user, options = {}) {
    const professionals = await repository.listProfessionals({});
    const actions = (await Promise.all(professionals.map((item) => repository.listOperationalActions(item.id)))).flat();
    actions.sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
    const pageOffset = options.resetPage === false
      ? clampActionPageOffset(actions.length, options.pageOffset ?? session.actionPageOffset)
      : 0;
    const pageItems = actions.slice(pageOffset, pageOffset + ACTION_PAGE_SIZE);
    session.actionPageOffset = pageOffset;
    session.screen = 'recent_actions';
    await saveSession(session);
    return {
      reply: formatRecentActions(pageItems, {
        pageOffset,
        totalItems: actions.length,
        hasMore: pageOffset + pageItems.length < actions.length
      }),
      options: pageOffset + pageItems.length < actions.length ? ['MORE', 'M'] : ['M'],
      session: summarizeSession(session, user)
    };
  }

  async function handleUnlinked(session, rawMessage) {
    const command = normalizeCommand(rawMessage);
    if (!command || ['hi', 'hello', 'menu', 'start'].includes(command)) {
      session.screen = 'unlinked_entry';
      await saveSession(session);
      return { reply: 'Welcome to TFX Hub association WhatsApp.\n\n1. Link existing association account\n2. Register new association account', options: ['1', '2'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'unlinked_entry' && command === '1') {
      session.screen = 'link_email';
      await saveSession(session);
      return { reply: 'Enter the email address on your association account.', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'unlinked_entry' && command === '2') {
      session.screen = 'register_name';
      session.registrationDraft = {};
      await saveSession(session);
      return { reply: 'What is your full name?', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'link_email') {
      const user = await repository.getUserByEmail(rawMessage.trim());
      if (!user || user.role !== 'association') {
        return { reply: 'No association account found for that email. Reply 1 to try again or 2 to register.', options: ['1', '2'], session: summarizeSession(session, null) };
      }
      const updated = await repository.updateUserPhoneNumber(user.id, session.phoneNumber);
      session.userId = updated.id;
      return buildMenu(session, updated);
    }
    if (session.screen === 'register_name') {
      session.registrationDraft = { name: rawMessage.trim() };
      session.screen = 'register_email';
      await saveSession(session);
      return { reply: 'Enter the email address for the association account.', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'register_email') {
      const email = rawMessage.trim().toLowerCase();
      const existing = await repository.getUserByEmail(email);
      if (existing) {
        return { reply: 'That email is already in use. Enter another email.', options: ['M'], session: summarizeSession(session, null) };
      }
      const { firstName, lastName } = splitName(session.registrationDraft.name);
      const user = await repository.createUser({
        id: createId('association'),
        associationId: 'assoc-members-demo',
        email,
        passwordHash: await bcrypt.hash(createId('pwd'), 10),
        firstName,
        lastName,
        role: 'association',
        professionalId: null,
        trade: null,
        tier: null,
        rating: null,
        completedJobs: 0,
        activeQuotes: 0,
        responseTime: 'N/A',
        phoneNumber: session.phoneNumber
      });
      session.userId = user.id;
      session.registrationDraft = null;
      return buildMenu(session, user);
    }
    return { reply: 'Reply HI to start association WhatsApp.', options: ['HI'], session: summarizeSession(session, null) };
  }

  async function handleLinked(session, user, rawMessage) {
    const command = normalizeCommand(rawMessage);
    if (!command || ['hi', 'hello', 'menu', 'm', 'start'].includes(command)) {
      return buildMenu(session, user);
    }
    if (session.screen === 'directory' && /^\d+$/.test(command)) {
      const professionalId = session.lastProfessionalIds[Number(command) - 1];
      const professional = await repository.getProfessionalById(professionalId);
      if (!professional) {
        return buildMenu(session, user);
      }
      session.screen = 'professional_detail';
      session.activeProfessionalId = professional.id;
      await saveSession(session);
      return { reply: formatProfessionalDetail(professional), options: ['1', '2', '3', '4'], session: summarizeSession(session, user) };
    }
    if (session.screen === 'professional_detail') {
      const professional = await repository.getProfessionalById(session.activeProfessionalId);
      if (!professional) {
        return buildMenu(session, user);
      }
      if (command === '1' || command === '2') {
        const actionType = command === '1' ? 'member-review' : 'trade-outreach';
        const summary = command === '1' ? 'Member review queued' : 'Trade outreach queued';
        const action = await repository.createOperationalAction({
          id: createId('association-action'),
          professionalId: professional.id,
          actionType,
          summary,
          note: `Created from association WhatsApp for ${professional.name}.`,
          createdBy: user.id
        });
        return { reply: `${action.summary} for ${professional.name}. Reply 3 to return or 4 for menu.`, options: ['3', '4'], session: summarizeSession(session, user) };
      }
      if (command === '3') {
        const professionals = (await repository.listProfessionals({})).slice(0, 3);
        session.screen = 'directory';
        session.lastProfessionalIds = professionals.map((item) => item.id);
        await saveSession(session);
        return { reply: formatDirectory(professionals), options: ['1', '2', '3', 'M'], session: summarizeSession(session, user) };
      }
      if (command === '4') {
        return buildMenu(session, user);
      }
    }
    if (session.screen === 'recent_actions' && (command === 'more' || command === 'next')) {
      return buildRecentActions(session, user, {
        resetPage: false,
        pageOffset: (session.actionPageOffset || 0) + ACTION_PAGE_SIZE
      });
    }
    if (command === '1') {
      const overview = await getOverviewData();
      session.screen = 'overview';
      await saveSession(session);
      return { reply: formatOverview(overview.totals), options: ['M'], session: summarizeSession(session, user) };
    }
    if (command === '2') {
      const professionals = (await repository.listProfessionals({})).slice(0, 3);
      session.screen = 'directory';
      session.lastProfessionalIds = professionals.map((item) => item.id);
      await saveSession(session);
      return { reply: formatDirectory(professionals), options: ['1', '2', '3', 'M'], session: summarizeSession(session, user) };
    }
    if (command === '3') {
      const overview = await getOverviewData();
      session.screen = 'trade_breakdown';
      await saveSession(session);
      return { reply: formatTradeBreakdown(overview.openJobsByTrade, overview.professionalsByTrade), options: ['M'], session: summarizeSession(session, user) };
    }
    if (command === '4') {
      return buildRecentActions(session, user);
    }
    if (command === '5') {
      session.screen = 'help';
      await saveSession(session);
      return { reply: formatHelp(), options: ['M'], session: summarizeSession(session, user) };
    }
    return buildMenu(session, user);
  }

  return {
    async getSession(phoneNumber) {
      const session = await loadSession(phoneNumber);
      const user = await getLinkedUser(session.phoneNumber, session);
      return summarizeSession(session, user);
    },
    async handleIncomingMessage({ phoneNumber, message }) {
      const session = await loadSession(phoneNumber);
      const user = await getLinkedUser(session.phoneNumber, session);
      log.info('association whatsapp message received', { phoneNumber: session.phoneNumber, linked: Boolean(user), screen: session.screen });
      if (!user) {
        return handleUnlinked(session, message);
      }
      return handleLinked(session, user, message);
    }
  };
}

module.exports = { createWhatsappAssociationService };
