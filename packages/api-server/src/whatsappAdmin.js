'use strict';

const bcrypt = require('bcryptjs');
const { normalizePhoneNumber } = require('./whatsappContractor');

function normalizeCommand(value) {
  return String(value || '').trim().toLowerCase();
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Admin',
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
    lastProfessionalIds: session.lastProfessionalIds || []
  };
}

function formatMenu(user) {
  return [
    `Welcome back, ${user.firstName}.`,
    '',
    'Reply with a number:',
    '1. Operations Overview',
    '2. Contractor Directory',
    '3. Recent Actions',
    '4. Help'
  ].join('\n');
}

function formatOverview(overview) {
  return [
    'Operations overview',
    '',
    `Open jobs: ${overview.openJobs}`,
    `In progress jobs: ${overview.inProgressJobs}`,
    `Completed jobs: ${overview.completedJobs}`,
    `Professionals: ${overview.professionals}`,
    '',
    'Reply M for menu.'
  ].join('\n');
}

function formatDirectory(items) {
  if (!items.length) {
    return 'No contractors are available. Reply M for menu.';
  }
  const rows = ['Contractor directory', ''];
  items.forEach((item, index) => {
    rows.push(`${index + 1}. ${item.name}`);
    rows.push(`${item.trade} | ${item.tier} | ${item.rating || 'N/A'} rating`);
    rows.push('');
  });
  rows.push('Reply with a contractor number to inspect.');
  rows.push('Reply M for menu.');
  return rows.join('\n');
}

function formatContractorDetail(item) {
  return [
    item.name,
    `Trade: ${item.trade}`,
    `Tier: ${item.tier}`,
    `Rating: ${item.rating || 'N/A'}`,
    '',
    'Reply:',
    '1. Tier review',
    '2. Compliance review',
    '3. Dispute audit',
    '4. Back to directory'
  ].join('\n');
}

function formatActions(items) {
  if (!items.length) {
    return 'No admin actions recorded yet. Reply M for menu.';
  }
  const rows = ['Recent admin actions', ''];
  items.slice(0, 5).forEach((item, index) => {
    rows.push(`${index + 1}. ${item.summary}`);
    rows.push(`${item.actionType} | ${item.createdAt || 'Recently'}`);
    rows.push('');
  });
  rows.push('Reply M for menu.');
  return rows.join('\n');
}

function createWhatsappAdminService({ repository, logger, createId }) {
  const log = logger || { info() {}, warn() {}, error() {} };

  async function loadSession(phoneNumber) {
    const normalized = normalizePhoneNumber(phoneNumber);
    const existing = await repository.getWhatsappAdminSession(normalized);
    return existing || {
      phoneNumber: normalized,
      screen: 'unlinked_entry',
      userId: null,
      activeProfessionalId: null,
      lastProfessionalIds: [],
      registrationDraft: null
    };
  }

  async function saveSession(session) {
    await repository.upsertWhatsappAdminSession(session.phoneNumber, session);
    return session;
  }

  async function getLinkedUser(phoneNumber, session) {
    const byPhone = await repository.getUserByPhoneNumber(phoneNumber);
    if (byPhone && byPhone.role === 'admin') {
      return byPhone;
    }
    if (session.userId) {
      const user = await repository.getUserById(session.userId);
      return user && user.role === 'admin' ? user : null;
    }
    return null;
  }

  async function buildMenu(session, user) {
    session.screen = 'menu';
    session.userId = user.id;
    await saveSession(session);
    return { reply: formatMenu(user), options: ['1', '2', '3', '4'], session: summarizeSession(session, user) };
  }

  async function buildRecentActions(session, user) {
    const professionals = await repository.listProfessionals({});
    const actions = (await Promise.all(professionals.map((item) => repository.listAdminActions(item.id)))).flat();
    actions.sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
    session.screen = 'actions';
    await saveSession(session);
    return { reply: formatActions(actions), options: ['M'], session: summarizeSession(session, user) };
  }

  async function handleUnlinked(session, rawMessage) {
    const command = normalizeCommand(rawMessage);
    if (!command || ['hi', 'hello', 'menu', 'start'].includes(command)) {
      session.screen = 'unlinked_entry';
      await saveSession(session);
      return { reply: 'Welcome to TFX Hub admin WhatsApp.\n\n1. Link existing admin account\n2. Register new admin account', options: ['1', '2'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'unlinked_entry' && command === '1') {
      session.screen = 'link_email';
      await saveSession(session);
      return { reply: 'Enter the email address on your admin account.', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'unlinked_entry' && command === '2') {
      session.screen = 'register_name';
      session.registrationDraft = {};
      await saveSession(session);
      return { reply: 'What is your full name?', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'link_email') {
      const user = await repository.getUserByEmail(rawMessage.trim());
      if (!user || user.role !== 'admin') {
        return { reply: 'No admin account found for that email. Reply 1 to try again or 2 to register.', options: ['1', '2'], session: summarizeSession(session, null) };
      }
      const updated = await repository.updateUserPhoneNumber(user.id, session.phoneNumber);
      session.userId = updated.id;
      return buildMenu(session, updated);
    }
    if (session.screen === 'register_name') {
      session.registrationDraft = { name: rawMessage.trim() };
      session.screen = 'register_email';
      await saveSession(session);
      return { reply: 'Enter the email address for the admin account.', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'register_email') {
      const email = rawMessage.trim().toLowerCase();
      const existing = await repository.getUserByEmail(email);
      if (existing) {
        return { reply: 'That email is already in use. Enter another email.', options: ['M'], session: summarizeSession(session, null) };
      }
      session.registrationDraft = { ...session.registrationDraft, email };
      session.screen = 'register_code';
      await saveSession(session);
      return { reply: 'Enter the admin access code. Use TFX-AMS for the demo environment.', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'register_code') {
      if (String(rawMessage || '').trim().toUpperCase() !== 'TFX-AMS') {
        return { reply: 'Invalid admin access code. Enter TFX-AMS to continue.', options: ['M'], session: summarizeSession(session, null) };
      }
      const { firstName, lastName } = splitName(session.registrationDraft.name);
      const user = await repository.createUser({
        id: createId('admin'),
        associationId: 'assoc-admin-demo',
        email: session.registrationDraft.email,
        passwordHash: await bcrypt.hash(createId('pwd'), 10),
        firstName,
        lastName,
        role: 'admin',
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
    return { reply: 'Reply HI to start admin WhatsApp.', options: ['HI'], session: summarizeSession(session, null) };
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
      session.screen = 'contractor_detail';
      session.activeProfessionalId = professional.id;
      await saveSession(session);
      return { reply: formatContractorDetail(professional), options: ['1', '2', '3', '4'], session: summarizeSession(session, user) };
    }
    if (session.screen === 'contractor_detail') {
      const actionType = command === '1' ? 'tier-review' : command === '2' ? 'compliance-review' : command === '3' ? 'dispute-audit' : null;
      if (actionType) {
        const action = await repository.createAdminAction({
          id: createId('admin-action'),
          professionalId: session.activeProfessionalId,
          actionType,
          summary: actionType === 'tier-review' ? 'Tier review queued' : actionType === 'compliance-review' ? 'Compliance review opened' : 'Dispute audit opened',
          note: 'Created from admin WhatsApp flow.',
          createdBy: user.id
        });
        return { reply: `${action.summary}. Reply 4 to return or M for menu.`, options: ['4', 'M'], session: summarizeSession(session, user) };
      }
      if (command === '4') {
        const professionals = (await repository.listProfessionals({})).slice(0, 3);
        session.screen = 'directory';
        session.lastProfessionalIds = professionals.map((item) => item.id);
        await saveSession(session);
        return { reply: formatDirectory(professionals), options: ['1', '2', '3', 'M'], session: summarizeSession(session, user) };
      }
    }
    if (command === '1') {
      const professionals = await repository.listProfessionals({});
      const jobsOpen = await repository.listJobs({ status: 'OPEN' });
      const jobsProgress = await repository.listJobs({ status: 'IN_PROGRESS' });
      const jobsCompleted = await repository.listJobs({ status: 'COMPLETED' });
      session.screen = 'overview';
      await saveSession(session);
      return { reply: formatOverview({ openJobs: jobsOpen.length, inProgressJobs: jobsProgress.length, completedJobs: jobsCompleted.length, professionals: professionals.length }), options: ['M'], session: summarizeSession(session, user) };
    }
    if (command === '2') {
      const professionals = (await repository.listProfessionals({})).slice(0, 3);
      session.screen = 'directory';
      session.lastProfessionalIds = professionals.map((item) => item.id);
      await saveSession(session);
      return { reply: formatDirectory(professionals), options: ['1', '2', '3', 'M'], session: summarizeSession(session, user) };
    }
    if (command === '3') {
      return buildRecentActions(session, user);
    }
    if (command === '4') {
      session.screen = 'help';
      await saveSession(session);
      return { reply: 'Admin help\n\n1. Operations Overview shows platform totals.\n2. Contractor Directory lets you open contractors.\n3. Recent Actions shows the latest admin actions.\n\nReply M for menu.', options: ['M'], session: summarizeSession(session, user) };
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
      log.info('admin whatsapp message received', { phoneNumber: session.phoneNumber, linked: Boolean(user), screen: session.screen });
      if (!user) {
        return handleUnlinked(session, message);
      }
      return handleLinked(session, user, message);
    }
  };
}

module.exports = { createWhatsappAdminService };