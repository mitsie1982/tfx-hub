'use strict';

const bcrypt = require('bcryptjs');
const { normalizePhoneNumber } = require('./whatsappContractor');
const REQUEST_PAGE_SIZE = 5;

function normalizeCommand(value) {
  return String(value || '').trim().toLowerCase();
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Professional',
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
    activeRequestPageOffset: Number.isFinite(session.requestPageOffset) ? session.requestPageOffset : 0,
    lastProfessionalIds: session.lastProfessionalIds || []
  };
}

function clampRequestPageOffset(total, offset) {
  const normalizedOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0;
  if (total <= 0) {
    return 0;
  }
  if (normalizedOffset >= total) {
    return Math.max(0, Math.floor((total - 1) / REQUEST_PAGE_SIZE) * REQUEST_PAGE_SIZE);
  }
  return normalizedOffset;
}

function formatMenu(user, directoryCount) {
  return [
    `Welcome back, ${user.firstName}.`,
    '',
    `You can review your profile and browse ${directoryCount} visible professionals.`,
    '',
    'Reply with a number:',
    '1. My Profile',
    '2. Professional Directory',
    '3. Check In Availability',
    '4. Request Tier Review',
    '5. Recent Requests',
    '6. Help'
  ].join('\n');
}

function formatProfile(user) {
  return [
    'Your professional profile',
    '',
    `Name: ${user.firstName} ${user.lastName}`.trim(),
    `Trade: ${user.trade || 'Not set'}`,
    `Tier: ${user.tier || 'ONBOARDED'}`,
    `Rating: ${user.rating || 'N/A'}`,
    '',
    'Reply:',
    '1. Professional Directory',
    '2. Menu'
  ].join('\n');
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

function formatDetail(item) {
  return [
    item.name,
    `ID: ${item.id || item.professionalId || 'Not set'}`,
    `Trade: ${item.trade}`,
    `Tier: ${item.tier || 'ONBOARDED'}`,
    `Rating: ${item.rating || 'N/A'}`,
    '',
    'Reply:',
    '1. Back to directory',
    '2. Menu'
  ].join('\n');
}

function formatHelp() {
  return [
    'Professional help',
    '',
    '1. My Profile shows your linked professional record.',
    '2. Professional Directory lists visible professionals.',
    '3. Check In Availability records that you are ready for work.',
    '4. Request Tier Review creates a follow-up request for your profile.',
    '5. Recent Requests shows your latest operational requests.',
    '',
    'Reply M for menu.'
  ].join('\n');
}

function formatRecentRequests(items, requestWindow = {}) {
  const pageOffset = Number.isFinite(requestWindow.pageOffset) ? requestWindow.pageOffset : 0;
  const totalItems = Number.isFinite(requestWindow.totalItems) ? requestWindow.totalItems : items.length;
  const hasMore = Boolean(requestWindow.hasMore);
  if (!items.length) {
    return 'No professional requests recorded yet. Reply M for menu.';
  }
  const rows = ['Recent professional requests', ''];
  rows.push(`Showing ${pageOffset + 1}-${pageOffset + items.length} of ${totalItems} requests`);
  rows.push('');
  items.forEach((item, index) => {
    rows.push(`${index + 1}. ${item.summary}`);
    rows.push(`${item.actionType} | ${item.createdAt || 'Recently'}`);
    rows.push('');
  });
  if (hasMore) {
    rows.push('Reply MORE for older requests.');
  }
  rows.push('Reply M for menu.');
  return rows.join('\n');
}

function createWhatsappProfessionalService({ repository, logger, createId }) {
  const log = logger || { info() {}, warn() {}, error() {} };

  async function loadSession(phoneNumber) {
    const normalized = normalizePhoneNumber(phoneNumber);
    const existing = await repository.getWhatsappProfessionalSession(normalized);
    return existing || {
      phoneNumber: normalized,
      screen: 'unlinked_entry',
      userId: null,
      activeProfessionalId: null,
      requestPageOffset: 0,
      lastProfessionalIds: [],
      registrationDraft: null
    };
  }

  async function saveSession(session) {
    await repository.upsertWhatsappProfessionalSession(session.phoneNumber, session);
    return session;
  }

  async function getLinkedUser(phoneNumber, session) {
    const byPhone = await repository.getUserByPhoneNumber(phoneNumber);
    if (byPhone && byPhone.role === 'professional') {
      return byPhone;
    }
    if (session.userId) {
      const user = await repository.getUserById(session.userId);
      return user && user.role === 'professional' ? user : null;
    }
    return null;
  }

  async function buildMenu(session, user) {
    const professionals = await repository.listProfessionals({});
    session.screen = 'menu';
    session.userId = user.id;
    await saveSession(session);
    return { reply: formatMenu(user, professionals.length), options: ['1', '2', '3', '4', '5', '6'], session: summarizeSession(session, user) };
  }

  async function buildRecentRequests(session, user, options = {}) {
    const items = await repository.listOperationalActions(user.professionalId || user.id);
    const pageOffset = options.resetPage === false
      ? clampRequestPageOffset(items.length, options.pageOffset ?? session.requestPageOffset)
      : 0;
    const pageItems = items.slice(pageOffset, pageOffset + REQUEST_PAGE_SIZE);
    session.requestPageOffset = pageOffset;
    session.screen = 'recent_requests';
    await saveSession(session);
    return {
      reply: formatRecentRequests(pageItems, {
        pageOffset,
        totalItems: items.length,
        hasMore: pageOffset + pageItems.length < items.length
      }),
      options: pageOffset + pageItems.length < items.length ? ['MORE', 'M'] : ['M'],
      session: summarizeSession(session, user)
    };
  }

  async function handleUnlinked(session, rawMessage) {
    const command = normalizeCommand(rawMessage);
    if (!command || ['hi', 'hello', 'menu', 'start'].includes(command)) {
      session.screen = 'unlinked_entry';
      await saveSession(session);
      return { reply: 'Welcome to TFX Hub professional WhatsApp.\n\n1. Link existing professional account\n2. Register new professional account', options: ['1', '2'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'unlinked_entry' && command === '1') {
      session.screen = 'link_email';
      await saveSession(session);
      return { reply: 'Enter the email address on your professional account.', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'unlinked_entry' && command === '2') {
      session.screen = 'register_name';
      session.registrationDraft = {};
      await saveSession(session);
      return { reply: 'What is your full name?', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'link_email') {
      const user = await repository.getUserByEmail(rawMessage.trim());
      if (!user || user.role !== 'professional') {
        return { reply: 'No professional account found for that email. Reply 1 to try again or 2 to register.', options: ['1', '2'], session: summarizeSession(session, null) };
      }
      const updated = await repository.updateUserPhoneNumber(user.id, session.phoneNumber);
      session.userId = updated.id;
      return buildMenu(session, updated);
    }
    if (session.screen === 'register_name') {
      session.registrationDraft = { name: rawMessage.trim() };
      session.screen = 'register_trade';
      await saveSession(session);
      return { reply: 'What trade do you practice? Example: electrician', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'register_trade') {
      session.registrationDraft = { ...session.registrationDraft, trade: rawMessage.trim() };
      session.screen = 'register_email';
      await saveSession(session);
      return { reply: 'Enter the email address for the professional account.', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'register_email') {
      const email = rawMessage.trim().toLowerCase();
      const existing = await repository.getUserByEmail(email);
      if (existing) {
        return { reply: 'That email is already in use. Enter another email.', options: ['M'], session: summarizeSession(session, null) };
      }
      const { firstName, lastName } = splitName(session.registrationDraft.name);
      const user = await repository.createUser({
        id: createId('professional-user'),
        associationId: 'assoc-members-demo',
        email,
        passwordHash: await bcrypt.hash(createId('pwd'), 10),
        firstName,
        lastName,
        role: 'professional',
        professionalId: createId('pro'),
        trade: session.registrationDraft.trade,
        tier: 'ONBOARDED',
        rating: 0,
        completedJobs: 0,
        activeQuotes: 0,
        responseTime: 'N/A',
        phoneNumber: session.phoneNumber
      });
      session.userId = user.id;
      session.registrationDraft = null;
      return buildMenu(session, user);
    }
    return { reply: 'Reply HI to start professional WhatsApp.', options: ['HI'], session: summarizeSession(session, null) };
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
      session.screen = 'detail';
      session.activeProfessionalId = professional.id;
      await saveSession(session);
      return { reply: formatDetail(professional), options: ['1', '2'], session: summarizeSession(session, user) };
    }
    if (session.screen === 'profile') {
      if (command === '1') {
        const professionals = (await repository.listProfessionals({})).slice(0, 3);
        session.screen = 'directory';
        session.lastProfessionalIds = professionals.map((item) => item.id);
        await saveSession(session);
        return { reply: formatDirectory(professionals), options: ['1', '2', '3', 'M'], session: summarizeSession(session, user) };
      }
      if (command === '2') {
        return buildMenu(session, user);
      }
    }
    if (session.screen === 'detail') {
      if (command === '1') {
        const professionals = (await repository.listProfessionals({})).slice(0, 3);
        session.screen = 'directory';
        session.lastProfessionalIds = professionals.map((item) => item.id);
        await saveSession(session);
        return { reply: formatDirectory(professionals), options: ['1', '2', '3', 'M'], session: summarizeSession(session, user) };
      }
      if (command === '2') {
        return buildMenu(session, user);
      }
    }
    if (session.screen === 'recent_requests' && (command === 'more' || command === 'next')) {
      return buildRecentRequests(session, user, {
        resetPage: false,
        pageOffset: (session.requestPageOffset || 0) + REQUEST_PAGE_SIZE
      });
    }
    if (command === '1') {
      session.screen = 'profile';
      await saveSession(session);
      return { reply: formatProfile(user), options: ['1', '2'], session: summarizeSession(session, user) };
    }
    if (command === '2') {
      const professionals = (await repository.listProfessionals({})).slice(0, 3);
      session.screen = 'directory';
      session.lastProfessionalIds = professionals.map((item) => item.id);
      await saveSession(session);
      return { reply: formatDirectory(professionals), options: ['1', '2', '3', 'M'], session: summarizeSession(session, user) };
    }
    if (command === '3') {
      const action = await repository.createOperationalAction({
        id: createId('professional-action'),
        professionalId: user.professionalId || user.id,
        actionType: 'availability-check-in',
        summary: 'Availability check-in recorded',
        note: 'Professional checked in as available via WhatsApp.',
        createdBy: user.id
      });
      return { reply: `${action.summary}. Reply 5 to review your recent requests or M for menu.`, options: ['5', 'M'], session: summarizeSession(session, user) };
    }
    if (command === '4') {
      const action = await repository.createOperationalAction({
        id: createId('professional-action'),
        professionalId: user.professionalId || user.id,
        actionType: 'tier-review-request',
        summary: 'Tier review requested',
        note: 'Professional requested a tier review via WhatsApp.',
        createdBy: user.id
      });
      return { reply: `${action.summary}. Reply 5 to review your recent requests or M for menu.`, options: ['5', 'M'], session: summarizeSession(session, user) };
    }
    if (command === '5') {
      return buildRecentRequests(session, user);
    }
    if (command === '6') {
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
      log.info('professional whatsapp message received', { phoneNumber: session.phoneNumber, linked: Boolean(user), screen: session.screen });
      if (!user) {
        return handleUnlinked(session, message);
      }
      return handleLinked(session, user, message);
    }
  };
}

module.exports = { createWhatsappProfessionalService };