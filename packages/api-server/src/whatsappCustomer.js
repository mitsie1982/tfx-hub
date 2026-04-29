'use strict';

const bcrypt = require('bcryptjs');
const { normalizePhoneNumber } = require('./whatsappContractor');

function normalizeCommand(value) {
  return String(value || '').trim().toLowerCase();
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Customer',
    lastName: parts.slice(1).join(' ') || 'User'
  };
}

function summarizeSession(session, user) {
  return {
    phoneNumber: session.phoneNumber,
    linked: Boolean(user),
    screen: session.screen,
    userId: session.userId || user?.id || null,
    activeJobId: session.activeJobId || null,
    activeProfessionalId: session.activeProfessionalId || null,
    lastJobIds: Array.isArray(session.lastJobIds) ? session.lastJobIds : [],
    shortlistIds: Array.isArray(session.shortlistIds) ? session.shortlistIds : []
  };
}

function formatMenu(user, jobCount, professionalCount) {
  return [
    `Welcome back, ${user.firstName}.`,
    '',
    `You have ${jobCount} open jobs and ${professionalCount} visible professionals.`,
    '',
    'Reply with a number:',
    '1. My Jobs',
    '2. Browse Professionals',
    '3. Request a Job',
    '4. Help'
  ].join('\n');
}

function formatJobs(jobs) {
  if (!jobs.length) {
    return 'No open jobs linked to your customer account yet. Reply 3 to request a new job or M for menu.';
  }

  const rows = ['Your open jobs', ''];
  jobs.slice(0, 4).forEach((job, index) => {
    rows.push(`${index + 1}. ${job.title}`);
    rows.push(`${job.trade} | ${job.location || 'TBC'} | ${job.budget || 'Budget TBC'}`);
    rows.push('');
  });
  rows.push('Reply with a job number to open it.');
  rows.push('Reply M for menu.');
  return rows.join('\n');
}

function formatJobDetail(job) {
  return [
    job.title,
    `Trade: ${job.trade || 'General request'}`,
    `Location: ${job.location || 'TBC'}`,
    `Budget: ${job.budget || 'Budget TBC'}`,
    `Urgency: ${job.urgency || 'Flexible'}`,
    '',
    'Description:',
    job.description || 'No description provided.',
    '',
    'Reply:',
    '1. Browse Professionals',
    '2. Request Another Job',
    '3. Back to Jobs'
  ].join('\n');
}

function formatProfessionals(professionals) {
  if (!professionals.length) {
    return 'No professionals are available right now. Reply M for menu.';
  }

  const rows = ['Top professionals', ''];
  professionals.forEach((professional, index) => {
    rows.push(`${index + 1}. ${professional.name}`);
    rows.push(`${professional.trade} | ${professional.tier || 'ONBOARDED'} | ${professional.rating || 'N/A'} rating`);
    rows.push('');
  });
  rows.push('Reply with a professional number to open the profile.');
  rows.push('Reply M for menu.');
  return rows.join('\n');
}

function formatProfessionalDetail(professional, shortlisted) {
  return [
    professional.name,
    `Trade: ${professional.trade}`,
    `Tier: ${professional.tier || 'ONBOARDED'}`,
    `Rating: ${professional.rating || 'N/A'}`,
    '',
    `Shortlisted: ${shortlisted ? 'Yes' : 'No'}`,
    '',
    'Reply:',
    '1. Toggle shortlist',
    '2. Request a job with this professional',
    '3. Back to professionals'
  ].join('\n');
}

function formatHelp() {
  return [
    'Customer help',
    '',
    '1. My Jobs shows your open customer requests.',
    '2. Browse Professionals lets you inspect available professionals.',
    '3. Request a Job starts a guided job request flow.',
    '',
    'Reply M for menu.'
  ].join('\n');
}

function formatRequestConfirm(draft) {
  return [
    'Confirm job request',
    '',
    `Title: ${draft.title}`,
    `Trade: ${draft.trade}`,
    `Location: ${draft.location}`,
    `Budget: ${draft.budget || 'Budget TBC'}`,
    `Urgency: ${draft.urgency || 'Flexible'}`,
    `Description: ${draft.description}`,
    '',
    'Reply YES to submit or NO to cancel.'
  ].join('\n');
}

function createWhatsappCustomerService({ repository, logger, createId, createResetToken, passwordResetNotifier, now }) {
  const log = logger || { info() {}, warn() {}, error() {} };
  const createPasswordResetTokenValue = typeof createResetToken === 'function'
    ? createResetToken
    : () => `reset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const resetNotifier = passwordResetNotifier || { async sendPasswordReset(payload) { return { channel: 'log', resetToken: payload.token }; } };
  const resolveNow = typeof now === 'function' ? now : () => new Date();

  async function loadSession(phoneNumber) {
    const normalized = normalizePhoneNumber(phoneNumber);
    const existing = await repository.getWhatsappCustomerSession(normalized);
    return existing || {
      phoneNumber: normalized,
      screen: 'unlinked_entry',
      userId: null,
      activeJobId: null,
      activeProfessionalId: null,
      lastJobIds: [],
      lastProfessionalIds: [],
      shortlistIds: [],
      resetPasswordDraft: null,
      requestDraft: null,
      registrationDraft: null
    };
  }

  async function saveSession(session) {
    await repository.upsertWhatsappCustomerSession(session.phoneNumber, session);
    return session;
  }

  async function getLinkedUser(phoneNumber, session) {
    const byPhone = await repository.getUserByPhoneNumber(phoneNumber);
    if (byPhone && byPhone.role === 'client') {
      return byPhone;
    }
    if (session.userId) {
      const user = await repository.getUserById(session.userId);
      return user && user.role === 'client' ? user : null;
    }
    return null;
  }

  async function buildMenu(session, user) {
    const jobs = (await repository.listJobs({ status: 'OPEN' })).filter((job) => job.clientId === user.id);
    const professionals = await repository.listProfessionals({});
    session.screen = 'menu';
    session.userId = user.id;
    await saveSession(session);
    return {
      reply: formatMenu(user, jobs.length, professionals.length),
      options: ['1', '2', '3', '4'],
      session: summarizeSession(session, user)
    };
  }

  async function handleRequestFlow(session, user, rawMessage) {
    const command = normalizeCommand(rawMessage);
    const draft = session.requestDraft || {};

    if (session.screen === 'request_trade') {
      session.requestDraft = { ...draft, trade: rawMessage.trim(), title: draft.title || `${rawMessage.trim()} request` };
      session.screen = 'request_location';
      await saveSession(session);
      return { reply: 'Which location should the professional service?', options: ['M'], session: summarizeSession(session, user) };
    }
    if (session.screen === 'request_location') {
      session.requestDraft = { ...draft, trade: draft.trade, title: draft.title, location: rawMessage.trim() };
      session.screen = 'request_description';
      await saveSession(session);
      return { reply: 'Describe the work that needs to be done.', options: ['M'], session: summarizeSession(session, user) };
    }
    if (session.screen === 'request_description') {
      session.requestDraft = { ...session.requestDraft, description: rawMessage.trim() };
      session.screen = 'request_budget';
      await saveSession(session);
      return { reply: 'What is the budget range? Reply SKIP if unknown.', options: ['SKIP', 'M'], session: summarizeSession(session, user) };
    }
    if (session.screen === 'request_budget') {
      session.requestDraft = { ...session.requestDraft, budget: command === 'skip' ? '' : rawMessage.trim() };
      session.screen = 'request_urgency';
      await saveSession(session);
      return { reply: 'What is the urgency? Example: Urgent, This week, Flexible.', options: ['M'], session: summarizeSession(session, user) };
    }
    if (session.screen === 'request_urgency') {
      session.requestDraft = { ...session.requestDraft, urgency: rawMessage.trim() || 'Flexible' };
      session.screen = 'request_confirm';
      await saveSession(session);
      return { reply: formatRequestConfirm(session.requestDraft), options: ['YES', 'NO', 'M'], session: summarizeSession(session, user) };
    }
    if (session.screen === 'request_confirm') {
      if (command === 'yes') {
        const item = await repository.createJob({
          id: createId('job'),
          title: session.requestDraft.title,
          description: session.requestDraft.description,
          trade: session.requestDraft.trade,
          status: 'OPEN',
          budget: session.requestDraft.budget || 'Budget to be confirmed',
          location: session.requestDraft.location,
          urgency: session.requestDraft.urgency || 'Flexible',
          posted: 'Just now',
          leadType: 'WhatsApp customer request',
          matchScore: 75,
          clientId: user.id
        });
        session.requestDraft = null;
        session.screen = 'menu';
        await saveSession(session);
        return { reply: `Job request submitted successfully as ${item.title}. Reply M for menu.`, options: ['M'], session: summarizeSession(session, user) };
      }
      session.requestDraft = null;
      return buildMenu(session, user);
    }

    const activeProfessional = session.activeProfessionalId ? await repository.getProfessionalById(session.activeProfessionalId) : null;
    session.requestDraft = {
      title: activeProfessional ? `Request ${activeProfessional.trade} consultation with ${activeProfessional.name}` : '',
      trade: activeProfessional ? activeProfessional.trade : '',
      location: '',
      description: activeProfessional ? `Please help me connect with ${activeProfessional.name}.` : '',
      budget: '',
      urgency: ''
    };
    if (session.requestDraft.trade) {
      session.screen = 'request_location';
      await saveSession(session);
      return { reply: 'Which location should the professional service?', options: ['M'], session: summarizeSession(session, user) };
    }
    session.screen = 'request_trade';
    await saveSession(session);
    return { reply: 'What trade do you need? Example: plumber', options: ['M'], session: summarizeSession(session, user) };
  }

  async function beginPasswordResetFlow(session) {
    session.screen = 'reset_email';
    session.resetPasswordDraft = null;
    await saveSession(session);
    return {
      reply: 'Enter the email address on your customer account to reset your password.',
      options: ['M'],
      session: summarizeSession(session, null)
    };
  }

  async function issuePasswordReset(session, rawMessage) {
    const email = rawMessage.trim().toLowerCase();
    const user = await repository.getUserByEmail(email);
    if (!user || user.role !== 'client') {
      return {
        reply: 'No customer account was found for that email. Reply 1 to link an account, 2 to register, or 3 to reset another email.',
        options: ['1', '2', '3'],
        session: summarizeSession(session, null)
      };
    }

    const token = createPasswordResetTokenValue();
    const expiresAt = new Date(resolveNow().getTime() + (60 * 60 * 1000)).toISOString();
    await repository.createPasswordResetToken({ token, userId: user.id, expiresAt });
    const delivery = await resetNotifier.sendPasswordReset({ email: user.email, token, expiresAt });

    session.screen = 'reset_token';
    session.resetPasswordDraft = {
      userId: user.id,
      email: user.email,
      issuedToken: delivery.resetToken || null,
      channel: delivery.channel || 'log'
    };
    await saveSession(session);

    const deliveryLine = delivery.resetToken
      ? `Token: ${delivery.resetToken}`
      : 'Check your email for the reset token.';

    return {
      reply: [
        `Password reset requested for ${user.email}.`,
        `Delivery: ${delivery.channel || 'log'}`,
        deliveryLine,
        '',
        'Reply with the reset token to continue, or M for menu.'
      ].join('\n'),
      options: ['M'],
      session: summarizeSession(session, null)
    };
  }

  async function handlePasswordResetToken(session, rawMessage) {
    const token = rawMessage.trim();
    const entry = await repository.getPasswordResetToken(token);
    const expectedUserId = session.resetPasswordDraft?.userId;
    if (!entry || (expectedUserId && entry.userId !== expectedUserId)) {
      return {
        reply: 'That reset token is not valid for this customer account. Reply with a valid token or M for menu.',
        options: ['M'],
        session: summarizeSession(session, null)
      };
    }

    if (entry.consumedAt) {
      return {
        reply: 'That reset token has already been used. Reply 3 to request a new customer password reset.',
        options: ['3', 'M'],
        session: summarizeSession(session, null)
      };
    }

    if (new Date(entry.expiresAt).getTime() < resolveNow().getTime()) {
      return {
        reply: 'That reset token has expired. Reply 3 to request a new customer password reset.',
        options: ['3', 'M'],
        session: summarizeSession(session, null)
      };
    }

    session.screen = 'reset_password';
    session.resetPasswordDraft = {
      ...(session.resetPasswordDraft || {}),
      token
    };
    await saveSession(session);
    return {
      reply: 'Enter your new password.',
      options: ['M'],
      session: summarizeSession(session, null)
    };
  }

  async function confirmPasswordReset(session, rawMessage) {
    const token = session.resetPasswordDraft?.token;
    if (!token) {
      return beginPasswordResetFlow(session);
    }

    const entry = await repository.getPasswordResetToken(token);
    if (!entry || entry.consumedAt || new Date(entry.expiresAt).getTime() < resolveNow().getTime()) {
      return {
        reply: 'That reset token is no longer valid. Reply 3 to request a new customer password reset.',
        options: ['3', 'M'],
        session: summarizeSession(session, null)
      };
    }

    const passwordHash = await bcrypt.hash(rawMessage.trim(), 10);
    const user = await repository.updateUserPassword(entry.userId, passwordHash);
    await repository.consumePasswordResetToken(token);
    session.resetPasswordDraft = null;
    session.screen = 'unlinked_entry';
    await saveSession(session);

    if (!user) {
      return {
        reply: 'The customer account could not be updated. Reply 3 to request a new customer password reset.',
        options: ['3', 'M'],
        session: summarizeSession(session, null)
      };
    }

    return {
      reply: 'Password reset complete. Reply 1 to link your customer account, 2 to register, or HI to start again.',
      options: ['1', '2', 'HI'],
      session: summarizeSession(session, null)
    };
  }

  async function handleUnlinked(session, rawMessage) {
    const command = normalizeCommand(rawMessage);
    if (!command || ['hi', 'hello', 'menu', 'start'].includes(command)) {
      session.screen = 'unlinked_entry';
      await saveSession(session);
      return { reply: 'Welcome to TFX Hub customer WhatsApp.\n\n1. Link existing customer account\n2. Register as a new customer\n3. Reset customer password', options: ['1', '2', '3'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'unlinked_entry' && command === '1') {
      session.screen = 'link_email';
      await saveSession(session);
      return { reply: 'Enter the email address on your customer account.', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'unlinked_entry' && command === '2') {
      session.screen = 'register_name';
      session.registrationDraft = {};
      await saveSession(session);
      return { reply: 'What is your full name?', options: ['M'], session: summarizeSession(session, null) };
    }
    if ((session.screen === 'unlinked_entry' && command === '3') || command === 'reset') {
      return beginPasswordResetFlow(session);
    }
    if (session.screen === 'reset_email') {
      return issuePasswordReset(session, rawMessage);
    }
    if (session.screen === 'reset_token') {
      return handlePasswordResetToken(session, rawMessage);
    }
    if (session.screen === 'reset_password') {
      return confirmPasswordReset(session, rawMessage);
    }
    if (session.screen === 'link_email') {
      const user = await repository.getUserByEmail(rawMessage.trim());
      if (!user || user.role !== 'client') {
        return { reply: 'No customer account found for that email. Reply 1 to try again or 2 to register.', options: ['1', '2'], session: summarizeSession(session, null) };
      }
      const updated = await repository.updateUserPhoneNumber(user.id, session.phoneNumber);
      session.userId = updated.id;
      return buildMenu(session, updated);
    }
    if (session.screen === 'register_name') {
      session.registrationDraft = { name: rawMessage.trim() };
      session.screen = 'register_email';
      await saveSession(session);
      return { reply: 'Enter your email address.', options: ['M'], session: summarizeSession(session, null) };
    }
    if (session.screen === 'register_email') {
      const email = rawMessage.trim().toLowerCase();
      const existing = await repository.getUserByEmail(email);
      if (existing) {
        return { reply: 'That email is already in use. Enter another email.', options: ['M'], session: summarizeSession(session, null) };
      }
      const { firstName, lastName } = splitName(session.registrationDraft.name);
      const user = await repository.createUser({
        id: createId('client'),
        associationId: 'assoc-customer-demo',
        email,
        passwordHash: await bcrypt.hash(createId('pwd'), 10),
        firstName,
        lastName,
        role: 'client',
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
    return { reply: 'Reply HI to start customer WhatsApp.', options: ['HI'], session: summarizeSession(session, null) };
  }

  async function handleLinked(session, user, rawMessage) {
    const command = normalizeCommand(rawMessage);
    if (!command || ['hi', 'hello', 'menu', 'm', 'start'].includes(command)) {
      return buildMenu(session, user);
    }
    if (session.screen === 'professionals' && /^\d+$/.test(command)) {
      const professionalId = session.lastProfessionalIds[Number(command) - 1];
      const professional = await repository.getProfessionalById(professionalId);
      if (!professional) {
        return buildMenu(session, user);
      }
      session.screen = 'professional_detail';
      session.activeProfessionalId = professional.id;
      await saveSession(session);
      return { reply: formatProfessionalDetail(professional, session.shortlistIds.includes(professional.id)), options: ['1', '2', '3'], session: summarizeSession(session, user) };
    }
    if (session.screen === 'professional_detail') {
      const professional = await repository.getProfessionalById(session.activeProfessionalId);
      if (!professional) {
        return buildMenu(session, user);
      }
      if (command === '1') {
        const shortlistIds = new Set(session.shortlistIds || []);
        if (shortlistIds.has(professional.id)) {
          shortlistIds.delete(professional.id);
        } else {
          shortlistIds.add(professional.id);
        }
        session.shortlistIds = Array.from(shortlistIds);
        await saveSession(session);
        return { reply: `Shortlist updated for ${professional.name}. Reply 2 to request a job with this professional, 3 to go back, or M for menu.`, options: ['2', '3', 'M'], session: summarizeSession(session, user) };
      }
      if (command === '2') {
        return handleRequestFlow({ ...session, screen: 'request_start' }, user, rawMessage);
      }
      if (command === '3') {
        const professionals = (await repository.listProfessionals({})).slice(0, 3);
        session.screen = 'professionals';
        session.lastProfessionalIds = professionals.map((item) => item.id);
        await saveSession(session);
        return { reply: formatProfessionals(professionals), options: ['1', '2', '3', 'M'], session: summarizeSession(session, user) };
      }
    }
    if (session.screen === 'jobs' && /^\d+$/.test(command)) {
      const jobId = session.lastJobIds[Number(command) - 1];
      const job = jobId ? await repository.getJobById(jobId) : null;
      if (!job || job.clientId !== user.id) {
        return buildMenu(session, user);
      }
      session.screen = 'job_detail';
      session.activeJobId = job.id;
      await saveSession(session);
      return { reply: formatJobDetail(job), options: ['1', '2', '3'], session: summarizeSession(session, user) };
    }
    if (session.screen === 'job_detail') {
      const activeJob = session.activeJobId ? await repository.getJobById(session.activeJobId) : null;
      if (!activeJob || activeJob.clientId !== user.id) {
        return buildMenu(session, user);
      }
      if (command === '1') {
        const professionals = (await repository.listProfessionals({})).slice(0, 3);
        session.screen = 'professionals';
        session.lastProfessionalIds = professionals.map((item) => item.id);
        await saveSession(session);
        return { reply: formatProfessionals(professionals), options: ['1', '2', '3', 'M'], session: summarizeSession(session, user) };
      }
      if (command === '2') {
        return handleRequestFlow({ ...session, screen: 'request_start' }, user, rawMessage);
      }
      if (command === '3') {
        const jobs = (await repository.listJobs({ status: 'OPEN' })).filter((job) => job.clientId === user.id);
        session.screen = 'jobs';
        session.lastJobIds = jobs.slice(0, 4).map((job) => job.id);
        session.activeJobId = null;
        await saveSession(session);
        return { reply: formatJobs(jobs), options: ['1', '2', '3', '4', 'M'], session: summarizeSession(session, user) };
      }
    }
    if (session.screen && session.screen.startsWith('request_')) {
      return handleRequestFlow(session, user, rawMessage);
    }
    if (command === '1') {
      const jobs = (await repository.listJobs({ status: 'OPEN' })).filter((job) => job.clientId === user.id);
      session.screen = 'jobs';
      session.lastJobIds = jobs.slice(0, 4).map((job) => job.id);
      session.activeJobId = null;
      await saveSession(session);
      return { reply: formatJobs(jobs), options: ['1', '2', '3', '4', 'M'], session: summarizeSession(session, user) };
    }
    if (command === '2') {
      const professionals = (await repository.listProfessionals({})).slice(0, 3);
      session.screen = 'professionals';
      session.lastProfessionalIds = professionals.map((item) => item.id);
      await saveSession(session);
      return { reply: formatProfessionals(professionals), options: ['1', '2', '3', 'M'], session: summarizeSession(session, user) };
    }
    if (command === '3') {
      return handleRequestFlow({ ...session, screen: 'request_start' }, user, rawMessage);
    }
    if (command === '4') {
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
      log.info('customer whatsapp message received', { phoneNumber: session.phoneNumber, linked: Boolean(user), screen: session.screen });
      if (!user) {
        return handleUnlinked(session, message);
      }
      return handleLinked(session, user, message);
    }
  };
}

module.exports = { createWhatsappCustomerService };
