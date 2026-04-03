const bcrypt = require('bcryptjs');

const ONBOARDING_STAGES = ['welcome', 'name', 'trade', 'experience', 'location', 'credentials'];
const LEAD_PAGE_SIZE = 3;

function normalizePhoneNumber(value) {
  const digits = String(value || '').replace(/[^\d+]/g, '');
  if (!digits) {
    return '';
  }

  if (digits.startsWith('+')) {
    return digits;
  }

  return `+${digits}`;
}

function normalizeCommand(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeTradeFilter(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeLeadSearchQuery(value) {
  return String(value || '').trim().toLowerCase();
}

function clampLeadPageOffset(total, offset) {
  const normalizedOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0;
  if (total <= 0) {
    return 0;
  }

  if (normalizedOffset >= total) {
    return Math.max(0, Math.floor((total - 1) / LEAD_PAGE_SIZE) * LEAD_PAGE_SIZE);
  }

  return normalizedOffset;
}

function matchesLeadSearch(lead, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    lead.title,
    lead.description,
    lead.location,
    lead.trade,
    lead.budget,
    lead.urgency,
    lead.leadType
  ].join(' ').toLowerCase();

  return haystack.includes(query);
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Contractor',
    lastName: parts.slice(1).join(' ') || 'User'
  };
}

function toSessionSummary(session, linkedUser) {
  return {
    phoneNumber: session.phoneNumber,
    linked: Boolean(linkedUser),
    screen: session.screen || 'menu',
    userId: session.userId || linkedUser?.id || null,
    activeJobId: session.activeJobId || null,
    lastLeadIds: Array.isArray(session.lastLeadIds) ? session.lastLeadIds : [],
    activeLeadPageOffset: Number.isFinite(session.leadPageOffset) ? session.leadPageOffset : 0,
    activeTradeFilter: session.leadFilters?.trade || null,
    activeLeadSearchQuery: session.leadFilters?.search || null
  };
}

function formatMenu(user, openLeadCount = 0) {
  return [
    `Welcome back, ${user.firstName}.`,
    '',
    'Contractor snapshot',
    `Open leads: ${openLeadCount}`,
    `Active quotes: ${user.activeQuotes || 0}`,
    `Completed jobs: ${user.completedJobs || 0}`,
    `Response time: ${user.responseTime || 'N/A'}`,
    '',
    'Reply with a number:',
    '1. My Profile',
    '2. My Leads',
    '3. My Activity',
    '4. Quote a Lead',
    '5. Message a Homeowner',
    '6. Help',
    '7. Account Help'
  ].join('\n');
}

function formatProfile(user) {
  return [
    'Your contractor profile',
    '',
    `Name: ${user.firstName} ${user.lastName}`.trim(),
    `Trade: ${user.trade || 'Not set'}`,
    `Tier: ${user.tier || 'ONBOARDED'}`,
    `Rating: ${user.rating || 0}`,
    `Completed jobs: ${user.completedJobs || 0}`,
    `Active quotes: ${user.activeQuotes || 0}`,
    `Response time: ${user.responseTime || 'N/A'}`,
    '',
    'Reply:',
    '1. My Leads',
    '2. My Activity',
    '3. Menu',
    '4. Account Help'
  ].join('\n');
}

function formatAccountHelp(user) {
  return [
    'Account help',
    '',
    `Email: ${user.email || 'Not set'}`,
    `Phone: ${user.phoneNumber || 'Not set'}`,
    '',
    'Reply:',
    '1. Reset password in chat',
    '2. Sign-in help',
    '3. Menu'
  ].join('\n');
}

function formatSignInHelp(user) {
  return [
    'Sign-in help',
    '',
    'You can sign in with any of these:',
    `- Email: ${user.email || 'Not set'}`,
    `- Phone: ${user.phoneNumber || 'Not set'}`,
    '- Username: if one is configured on your contractor account',
    '',
    'Reply 1 to reset your password in chat or 3 for menu.'
  ].join('\n');
}

function formatLeadList(leads, tradeFilter, searchQuery, leadWindow = {}) {
  const pageOffset = Number.isFinite(leadWindow.pageOffset) ? leadWindow.pageOffset : 0;
  const totalLeads = Number.isFinite(leadWindow.totalLeads) ? leadWindow.totalLeads : leads.length;
  const hasMore = Boolean(leadWindow.hasMore);

  if (!leads.length) {
    const activeFilters = [];
    if (tradeFilter) {
      activeFilters.push(`${tradeFilter} trade`);
    }
    if (searchQuery) {
      activeFilters.push(`search "${searchQuery}"`);
    }

    return [
      activeFilters.length
        ? `No open leads match ${activeFilters.join(' and ')} right now.`
        : 'No open leads are available right now.',
      '',
      'Reply F to set a trade filter, A for all trades, S to search by text, C to clear search, or M for menu.'
    ].join('\n');
  }

  const rows = ['Top leads for you', ''];
  if (tradeFilter) {
    rows.push(`Current trade filter: ${tradeFilter}`);
  }
  if (searchQuery) {
    rows.push(`Current text search: ${searchQuery}`);
  }
  if (tradeFilter || searchQuery) {
    rows.push('');
  }
  rows.push(`Showing ${pageOffset + 1}-${pageOffset + leads.length} of ${totalLeads} matched leads`);
  rows.push('');
  leads.forEach((lead, index) => {
    rows.push(`${index + 1}. ${lead.title}`);
    rows.push(`${lead.location || 'TBC'} | ${lead.budget || 'Budget TBC'} | ${lead.urgency || 'Flexible'}`);
    rows.push(`${lead.matchScore || 75}% match`);
    rows.push('');
  });
  rows.push('Reply with a lead number to open it.');
  if (hasMore) {
    rows.push('Reply MORE for the next leads.');
  }
  rows.push('Reply F to change trade filter, A for all trades, S to search by text, C to clear search, or M for menu.');
  return rows.join('\n');
}

function formatLeadDetail(job) {
  const requirements = Array.isArray(job.requirements) && job.requirements.length > 0
    ? job.requirements
    : ['Review scope', 'Confirm availability', 'Send quote if suitable'];

  return [
    job.title,
    `Location: ${job.location || 'TBC'}`,
    `Budget: ${job.budget || 'Budget TBC'}`,
    `Urgency: ${job.urgency || 'Flexible'}`,
    '',
    'Scope:',
    job.description || 'No scope provided.',
    '',
    'Requirements:',
    ...requirements.map((item) => `- ${item}`),
    '',
    'Reply:',
    '1. Interested',
    '2. Send Quote',
    '3. Message Homeowner',
    '4. Back to Leads'
  ].join('\n');
}

function formatActivity(items) {
  if (!items.length) {
    return ['No activity yet.', '', 'Reply 2 for My Leads or M for menu.'].join('\n');
  }

  const rows = ['Recent activity', ''];
  items.slice(0, 5).forEach((item, index) => {
    rows.push(`${index + 1}. ${String(item.type || '').toUpperCase()} | ${item.jobTitle || item.jobId || 'Project activity'}`);
    rows.push(item.summary || 'No summary');
    rows.push('');
  });
  rows.push('Reply M for menu.');
  return rows.join('\n');
}

function formatHelp() {
  return [
    'Contractor help',
    '',
    '1. My Profile shows your tier, rating, and work stats.',
    '2. My Leads shows open jobs matched to you.',
    '3. My Activity shows recent interest, quote, and message actions.',
    '4. Quote a Lead starts a guided quote flow.',
    '5. Message a Homeowner starts a guided message flow.',
    'If you cannot sign in, start again and choose password reset or reply 7 for Account Help.',
    '',
    'Reply M for menu.'
  ].join('\n');
}

function createWhatsappContractorService({ repository, logger, createId, createResetToken, passwordResetNotifier, now }) {
  const log = logger || { info() {}, warn() {}, error() {} };
  const createPasswordResetTokenValue = typeof createResetToken === 'function'
    ? createResetToken
    : () => `reset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const resetNotifier = passwordResetNotifier || { async sendPasswordReset(payload) { return { channel: 'log', resetToken: payload.token }; } };
  const resolveNow = typeof now === 'function' ? now : () => new Date();

  async function loadSession(phoneNumber) {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) {
      throw new Error('phoneNumber is required');
    }

    const existing = await repository.getWhatsappContractorSession(normalized);
    return existing || {
      phoneNumber: normalized,
      screen: 'unlinked_entry',
      userId: null,
      activeJobId: null,
      lastLeadIds: [],
      leadPageOffset: 0,
      leadFilters: { trade: null, search: null },
      quoteDraft: null,
      messageDraft: null,
      registrationDraft: null,
      resetPasswordDraft: null
    };
  }

  async function saveSession(session) {
    await repository.upsertWhatsappContractorSession(session.phoneNumber, session);
    return session;
  }

  async function getLinkedUser(phoneNumber, session) {
    return (await repository.getUserByPhoneNumber(phoneNumber))
      || (session.userId ? repository.getUserById(session.userId) : null);
  }

  async function buildMenuResponse(session, user) {
    const leads = await repository.listJobs({ status: 'OPEN' });
    session.screen = 'menu';
    session.userId = user.id;
    await saveSession(session);
    return {
      reply: formatMenu(user, leads.length),
      options: ['1', '2', '3', '4', '5', '6', '7'],
      session: toSessionSummary(session, user)
    };
  }

  async function buildProfileResponse(session, user) {
    session.screen = 'profile';
    await saveSession(session);
    return {
      reply: formatProfile(user),
      options: ['1', '2', '3', '4'],
      session: toSessionSummary(session, user)
    };
  }

  async function buildAccountHelpResponse(session, user) {
    session.screen = 'account_help';
    await saveSession(session);
    return {
      reply: formatAccountHelp(user),
      options: ['1', '2', '3'],
      session: toSessionSummary(session, user)
    };
  }

  async function buildLeadsResponse(session, user, options = {}) {
    const { resetPage = true, pageOffset = null } = options;
    const tradeFilter = normalizeTradeFilter(session.leadFilters?.trade);
    const searchQuery = normalizeLeadSearchQuery(session.leadFilters?.search);
    const allLeads = (await repository.listJobs({ status: 'OPEN', trade: tradeFilter || undefined }))
      .filter((lead) => matchesLeadSearch(lead, searchQuery));
    const nextLeadPageOffset = clampLeadPageOffset(
      allLeads.length,
      pageOffset == null ? (resetPage ? 0 : session.leadPageOffset || 0) : pageOffset
    );
    const leads = allLeads.slice(nextLeadPageOffset, nextLeadPageOffset + LEAD_PAGE_SIZE);
    const hasMore = nextLeadPageOffset + LEAD_PAGE_SIZE < allLeads.length;
    session.screen = 'leads_list';
    session.userId = user.id;
    session.leadPageOffset = nextLeadPageOffset;
    session.lastLeadIds = leads.map((lead) => lead.id);
    session.activeJobId = null;
    await saveSession(session);
    return {
      reply: formatLeadList(leads, tradeFilter || null, searchQuery || null, {
        pageOffset: nextLeadPageOffset,
        totalLeads: allLeads.length,
        hasMore
      }),
      options: leads.map((_, index) => String(index + 1)).concat(hasMore ? ['MORE'] : [], ['F', 'A', 'S', 'C', 'M']),
      session: toSessionSummary(session, user)
    };
  }

  async function beginLeadFilterFlow(session, user) {
    session.screen = 'lead_filter';
    await saveSession(session);
    return {
      reply: 'Enter a trade to filter your leads. Example: plumber\n\nReply A for all trades or M for menu.',
      options: ['A', 'M'],
      session: toSessionSummary(session, user)
    };
  }

  async function handleLeadFilterFlow(session, user, rawMessage) {
    const command = normalizeCommand(rawMessage);
    if (command === 'a' || command === 'all') {
      session.leadFilters = { ...(session.leadFilters || {}), trade: null };
      return buildLeadsResponse(session, user);
    }

    session.leadFilters = { ...(session.leadFilters || {}), trade: rawMessage.trim() };
    return buildLeadsResponse(session, user);
  }

  async function beginLeadSearchFlow(session, user) {
    session.screen = 'lead_search';
    await saveSession(session);
    return {
      reply: 'Enter text to search your leads. You can search by project title, suburb, trade, or scope.\n\nReply C to clear search or M for menu.',
      options: ['C', 'M'],
      session: toSessionSummary(session, user)
    };
  }

  async function handleLeadSearchFlow(session, user, rawMessage) {
    const command = normalizeCommand(rawMessage);
    if (command === 'c' || command === 'clear') {
      session.leadFilters = { ...(session.leadFilters || {}), search: null };
      return buildLeadsResponse(session, user);
    }

    session.leadFilters = { ...(session.leadFilters || {}), search: rawMessage.trim() };
    return buildLeadsResponse(session, user);
  }

  async function buildLeadDetailResponse(session, user, jobId) {
    const job = await repository.getJobById(jobId);
    if (!job) {
      return {
        reply: 'Lead not found. Reply 2 for My Leads or M for menu.',
        options: ['2', 'M'],
        session: toSessionSummary(session, user)
      };
    }

    session.screen = 'lead_detail';
    session.activeJobId = job.id;
    await saveSession(session);
    return {
      reply: formatLeadDetail(job),
      options: ['1', '2', '3', '4'],
      session: toSessionSummary(session, user)
    };
  }

  async function buildActivityResponse(session, user) {
    const items = await repository.getContractorHistory(user.professionalId || user.id);
    const jobs = await repository.listJobs({ status: 'OPEN' });
    const jobTitles = new Map(jobs.map((job) => [job.id, job.title]));
    const normalized = items.map((item) => ({
      ...item,
      jobTitle: jobTitles.get(item.jobId) || item.jobId
    }));
    session.screen = 'activity';
    await saveSession(session);
    return {
      reply: formatActivity(normalized),
      options: ['M'],
      session: toSessionSummary(session, user)
    };
  }

  async function handleQuoteFlow(session, user, rawMessage) {
    const activeJobId = session.activeJobId;
    if (!activeJobId) {
      return {
        reply: 'Choose a lead first. Reply 2 for My Leads.',
        options: ['2', 'M'],
        session: toSessionSummary(session, user)
      };
    }

    if (session.screen === 'quote_amount') {
      session.quoteDraft = { jobId: activeJobId, amount: rawMessage.trim() };
      session.screen = 'quote_timeline';
      await saveSession(session);
      return {
        reply: 'Step 2 of 3:\nHow long will the work take?\nExample: 3 working days',
        options: ['M'],
        session: toSessionSummary(session, user)
      };
    }

    if (session.screen === 'quote_timeline') {
      session.quoteDraft = { ...(session.quoteDraft || {}), timeline: rawMessage.trim() };
      session.screen = 'quote_note';
      await saveSession(session);
      return {
        reply: 'Step 3 of 3:\nAdd a short note for the homeowner, or reply SKIP.',
        options: ['SKIP', 'M'],
        session: toSessionSummary(session, user)
      };
    }

    if (session.screen === 'quote_note') {
      session.quoteDraft = {
        ...(session.quoteDraft || {}),
        note: normalizeCommand(rawMessage) === 'skip' ? '' : rawMessage.trim()
      };
      session.screen = 'quote_confirm';
      await saveSession(session);
      return {
        reply: [
          'Confirm quote',
          '',
          `Amount: ${session.quoteDraft.amount}`,
          `Timeline: ${session.quoteDraft.timeline || 'Not provided'}`,
          `Note: ${session.quoteDraft.note || 'None'}`,
          '',
          'Reply YES to send or NO to cancel.'
        ].join('\n'),
        options: ['YES', 'NO', 'M'],
        session: toSessionSummary(session, user)
      };
    }

    if (session.screen === 'quote_confirm') {
      const command = normalizeCommand(rawMessage);
      if (command === 'yes') {
        const draft = session.quoteDraft || {};
        const item = await repository.appendContractorEvent({
          id: createId('quote'),
          professionalId: user.professionalId || user.id,
          jobId: draft.jobId,
          type: 'quote',
          summary: `Quote ${draft.amount}${draft.timeline ? ` · ${draft.timeline}` : ''}`,
          status: 'sent',
          note: draft.note || ''
        });
        session.quoteDraft = null;
        session.screen = 'menu';
        await saveSession(session);
        return {
          reply: `Quote sent successfully.\n\n${item.summary}\n\nReply M for menu or 3 for My Activity.`,
          options: ['M', '3'],
          session: toSessionSummary(session, user)
        };
      }

      session.quoteDraft = null;
      return buildLeadDetailResponse(session, user, activeJobId);
    }

    session.screen = 'quote_amount';
    await saveSession(session);
    return {
      reply: 'Quote flow started.\n\nStep 1 of 3:\nWhat is your quote amount?\nExample: R12,500',
      options: ['M'],
      session: toSessionSummary(session, user)
    };
  }

  async function handleMessageFlow(session, user, rawMessage) {
    const activeJobId = session.activeJobId;
    if (!activeJobId) {
      return {
        reply: 'Choose a lead first. Reply 2 for My Leads.',
        options: ['2', 'M'],
        session: toSessionSummary(session, user)
      };
    }

    if (session.screen === 'message_body') {
      session.messageDraft = { jobId: activeJobId, body: rawMessage.trim() };
      session.screen = 'message_confirm';
      await saveSession(session);
      return {
        reply: `Preview:\n${session.messageDraft.body}\n\nReply YES to send or NO to cancel.`,
        options: ['YES', 'NO', 'M'],
        session: toSessionSummary(session, user)
      };
    }

    if (session.screen === 'message_confirm') {
      const command = normalizeCommand(rawMessage);
      if (command === 'yes') {
        const draft = session.messageDraft || {};
        const item = await repository.appendContractorEvent({
          id: createId('msg'),
          professionalId: user.professionalId || user.id,
          jobId: draft.jobId,
          type: 'message',
          summary: draft.body,
          status: 'sent'
        });
        session.messageDraft = null;
        session.screen = 'menu';
        await saveSession(session);
        return {
          reply: `Message sent successfully.\n\n${item.summary}\n\nReply M for menu or 3 for My Activity.`,
          options: ['M', '3'],
          session: toSessionSummary(session, user)
        };
      }

      session.messageDraft = null;
      return buildLeadDetailResponse(session, user, activeJobId);
    }

    session.screen = 'message_body';
    await saveSession(session);
    return {
      reply: 'Type the message you want to send to the homeowner.',
      options: ['M'],
      session: toSessionSummary(session, user)
    };
  }

  async function beginPasswordResetFlow(session, options = {}) {
    const linkedUser = options.linkedUser || null;
    session.screen = 'reset_email';
    session.resetPasswordDraft = linkedUser
      ? {
        userId: linkedUser.id,
        email: linkedUser.email,
        returnTo: 'linked_menu'
      }
      : null;
    await saveSession(session);
    return {
      reply: linkedUser
        ? `Reset password for ${linkedUser.email}. Reply YES to continue or M for menu.`
        : 'Enter the email address on your contractor account to reset your password.',
      options: ['M'],
      session: toSessionSummary(session, null)
    };
  }

  async function issuePasswordReset(session, rawMessage, options = {}) {
    const linkedUser = options.linkedUser || null;
    const email = linkedUser ? linkedUser.email : rawMessage.trim().toLowerCase();
    const user = linkedUser || await repository.getUserByEmail(email);
    if (!user || user.role !== 'contractor') {
      return {
        reply: 'No contractor account was found for that email. Reply 1 to link an account, 2 to register, or 3 to reset another email.',
        options: ['1', '2', '3'],
        session: toSessionSummary(session, null)
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
      channel: delivery.channel || 'log',
      returnTo: session.resetPasswordDraft?.returnTo || (linkedUser ? 'linked_menu' : 'unlinked_entry')
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
      session: toSessionSummary(session, null)
    };
  }

  async function handlePasswordResetToken(session, rawMessage) {
    const token = rawMessage.trim();
    const entry = await repository.getPasswordResetToken(token);
    const expectedUserId = session.resetPasswordDraft?.userId;
    if (!entry || (expectedUserId && entry.userId !== expectedUserId)) {
      return {
        reply: 'That reset token is not valid for this contractor account. Reply with a valid token or M for menu.',
        options: ['M'],
        session: toSessionSummary(session, null)
      };
    }

    if (entry.consumedAt) {
      return {
        reply: 'That reset token has already been used. Reply 3 to request a new password reset.',
        options: ['3', 'M'],
        session: toSessionSummary(session, null)
      };
    }

    if (new Date(entry.expiresAt).getTime() < resolveNow().getTime()) {
      return {
        reply: 'That reset token has expired. Reply 3 to request a new password reset.',
        options: ['3', 'M'],
        session: toSessionSummary(session, null)
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
      session: toSessionSummary(session, null)
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
        reply: 'That reset token is no longer valid. Reply 3 to request a new password reset.',
        options: ['3', 'M'],
        session: toSessionSummary(session, null)
      };
    }

    const passwordHash = await bcrypt.hash(rawMessage.trim(), 10);
    const user = await repository.updateUserPassword(entry.userId, passwordHash);
    await repository.consumePasswordResetToken(token);
    const returnTo = session.resetPasswordDraft?.returnTo || 'unlinked_entry';
    session.resetPasswordDraft = null;
    session.screen = returnTo === 'linked_menu' ? 'menu' : 'unlinked_entry';
    await saveSession(session);

    if (!user) {
      return {
        reply: 'The contractor account could not be updated. Reply 3 to request a new password reset.',
        options: ['3', 'M'],
        session: toSessionSummary(session, null)
      };
    }

    if (returnTo === 'linked_menu') {
      return {
        reply: 'Password reset complete. Reply M for menu, 2 for My Leads, or 7 for Account Help.',
        options: ['M', '2', '7'],
        session: toSessionSummary(session, user)
      };
    }

    return {
      reply: 'Password reset complete. Reply 1 to link your contractor account, 2 to register, or HI to start again.',
      options: ['1', '2', 'HI'],
      session: toSessionSummary(session, null)
    };
  }

  async function handleUnlinkedMessage(session, rawMessage) {
    const command = normalizeCommand(rawMessage);
    if (command === 'hi' || command === 'hello' || command === 'menu' || command === 'start' || !command) {
      session.screen = 'unlinked_entry';
      await saveSession(session);
      return {
        reply: [
          'Welcome to TFX Hub contractor WhatsApp.',
          '',
          'Reply with a number:',
          '1. Link existing contractor account',
          '2. Register as a new contractor',
          '3. Reset contractor password'
        ].join('\n'),
        options: ['1', '2', '3'],
        session: toSessionSummary(session, null)
      };
    }

    if (session.screen === 'unlinked_entry' && command === '1') {
      session.screen = 'link_email';
      await saveSession(session);
      return {
        reply: 'Enter the email address on your contractor account.',
        options: ['M'],
        session: toSessionSummary(session, null)
      };
    }

    if (session.screen === 'unlinked_entry' && command === '2') {
      session.screen = 'register_name';
      session.registrationDraft = {};
      await saveSession(session);
      return {
        reply: 'Let’s create your contractor account.\n\nWhat is your full name?',
        options: ['M'],
        session: toSessionSummary(session, null)
      };
    }

    if ((session.screen === 'unlinked_entry' && command === '3') || command === 'reset') {
      return beginPasswordResetFlow(session);
    }

    if (session.screen === 'reset_email' && session.resetPasswordDraft?.email && command === 'yes') {
      return issuePasswordReset(session, rawMessage, {
        linkedUser: {
          id: session.resetPasswordDraft.userId,
          email: session.resetPasswordDraft.email,
          role: 'contractor'
        }
      });
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
      if (!user || user.role !== 'contractor') {
        return {
          reply: 'No contractor account was found for that email. Reply 1 to try again or 2 to register.',
          options: ['1', '2'],
          session: toSessionSummary(session, null)
        };
      }

      const updatedUser = await repository.updateUserPhoneNumber(user.id, session.phoneNumber);
      session.userId = updatedUser.id;
      session.screen = 'menu';
      await saveSession(session);
      return buildMenuResponse(session, updatedUser);
    }

    if (session.screen === 'register_name') {
      session.registrationDraft = { ...(session.registrationDraft || {}), name: rawMessage.trim() };
      session.screen = 'register_trade';
      await saveSession(session);
      return {
        reply: 'What is your primary trade? Example: electrician',
        options: ['M'],
        session: toSessionSummary(session, null)
      };
    }

    if (session.screen === 'register_trade') {
      session.registrationDraft = { ...(session.registrationDraft || {}), trade: rawMessage.trim() };
      session.screen = 'register_location';
      await saveSession(session);
      return {
        reply: 'Which area do you mainly serve?',
        options: ['M'],
        session: toSessionSummary(session, null)
      };
    }

    if (session.screen === 'register_location') {
      session.registrationDraft = { ...(session.registrationDraft || {}), location: rawMessage.trim() };
      session.screen = 'register_experience';
      await saveSession(session);
      return {
        reply: 'How many years of experience do you have?',
        options: ['M'],
        session: toSessionSummary(session, null)
      };
    }

    if (session.screen === 'register_experience') {
      session.registrationDraft = { ...(session.registrationDraft || {}), experience: rawMessage.trim() };
      session.screen = 'register_email';
      await saveSession(session);
      return {
        reply: 'Enter your email address, or reply SKIP to use WhatsApp-only access for now.',
        options: ['SKIP', 'M'],
        session: toSessionSummary(session, null)
      };
    }

    if (session.screen === 'register_email') {
      const commandValue = normalizeCommand(rawMessage);
      const draft = session.registrationDraft || {};
      const { firstName, lastName } = splitName(draft.name);
      const email = commandValue === 'skip'
        ? `whatsapp-${session.phoneNumber.replace(/\D/g, '')}@tfxhub.local`
        : rawMessage.trim().toLowerCase();
      const existing = await repository.getUserByEmail(email);
      if (existing) {
        return {
          reply: 'That email is already in use. Reply with another email, or send SKIP to continue without one.',
          options: ['SKIP', 'M'],
          session: toSessionSummary(session, null)
        };
      }

      const passwordHash = await bcrypt.hash(createId('pwd'), 10);
      const user = await repository.createUser({
        id: createId('user'),
        associationId: 'assoc-contractor-demo',
        email,
        passwordHash,
        firstName,
        lastName,
        role: 'contractor',
        professionalId: createId('pro'),
        trade: draft.trade || 'general contractor',
        tier: 'ONBOARDED',
        rating: 0,
        completedJobs: 0,
        activeQuotes: 0,
        responseTime: 'N/A',
        phoneNumber: session.phoneNumber
      });

      for (const stage of ONBOARDING_STAGES) {
        await repository.submitOnboardingStage(user.id, stage);
      }

      session.userId = user.id;
      session.registrationDraft = null;
      session.screen = 'menu';
      await saveSession(session);
      return {
        reply: [
          `Welcome to TFX Hub, ${user.firstName}.`,
          '',
          'Your contractor account is ready on WhatsApp.',
          '',
          formatMenu(user, (await repository.listJobs({ status: 'OPEN' })).length)
        ].join('\n'),
        options: ['1', '2', '3', '4', '5', '6', '7'],
        session: toSessionSummary(session, user)
      };
    }

    return {
      reply: 'Reply HI to start your contractor WhatsApp setup.',
      options: ['HI'],
      session: toSessionSummary(session, null)
    };
  }

  async function handleLinkedMessage(session, user, rawMessage) {
    const command = normalizeCommand(rawMessage);

    if (!command || ['hi', 'hello', 'menu', 'm', 'start'].includes(command)) {
      return buildMenuResponse(session, user);
    }

    if (session.screen && session.screen.startsWith('quote_')) {
      return handleQuoteFlow(session, user, rawMessage);
    }

    if (session.screen && session.screen.startsWith('message_')) {
      return handleMessageFlow(session, user, rawMessage);
    }

    if (session.screen === 'lead_filter') {
      return handleLeadFilterFlow(session, user, rawMessage);
    }

    if (session.screen === 'lead_search') {
      return handleLeadSearchFlow(session, user, rawMessage);
    }

    if (session.screen === 'reset_email' && session.resetPasswordDraft?.email && command === 'yes') {
      return issuePasswordReset(session, rawMessage, { linkedUser: user });
    }

    if (session.screen === 'reset_token') {
      return handlePasswordResetToken(session, rawMessage);
    }

    if (session.screen === 'reset_password') {
      return confirmPasswordReset(session, rawMessage);
    }

    if (session.screen === 'interest_sent') {
      if (command === '1') {
        return handleQuoteFlow({ ...session, screen: 'quote_start', quoteDraft: null }, user, rawMessage);
      }

      if (command === '2') {
        return handleMessageFlow({ ...session, screen: 'message_start', messageDraft: null }, user, rawMessage);
      }

      if (command === '3') {
        return buildLeadsResponse(session, user, { resetPage: false });
      }
    }

    if (session.screen === 'leads_list' && /^\d+$/.test(command)) {
      const index = Number(command) - 1;
      const jobId = (session.lastLeadIds || [])[index];
      if (jobId) {
        return buildLeadDetailResponse(session, user, jobId);
      }
    }

    if (session.screen === 'leads_list' && (command === 'f' || command === 'filter')) {
      return beginLeadFilterFlow(session, user);
    }

    if (session.screen === 'leads_list' && (command === 'more' || command === 'next')) {
      return buildLeadsResponse(session, user, {
        resetPage: false,
        pageOffset: (session.leadPageOffset || 0) + LEAD_PAGE_SIZE
      });
    }

    if (session.screen === 'leads_list' && (command === 'a' || command === 'all')) {
      session.leadFilters = { ...(session.leadFilters || {}), trade: null };
      return buildLeadsResponse(session, user);
    }

    if (session.screen === 'leads_list' && (command === 's' || command === 'search')) {
      return beginLeadSearchFlow(session, user);
    }

    if (session.screen === 'leads_list' && (command === 'c' || command === 'clear')) {
      session.leadFilters = { ...(session.leadFilters || {}), search: null };
      return buildLeadsResponse(session, user);
    }

    if (session.screen === 'lead_detail') {
      if (command === '1' || command === 'interested') {
        const job = await repository.getJobById(session.activeJobId);
        if (!job) {
          return buildLeadsResponse(session, user);
        }
        const application = await repository.createJobApplication({
          id: createId('app'),
          jobId: job.id,
          professionalId: user.professionalId || user.id,
          message: ''
        });
        await repository.appendContractorEvent({
          id: application.id,
          professionalId: user.professionalId || user.id,
          jobId: job.id,
          type: 'interest',
          summary: 'Interest sent to homeowner',
          status: 'sent'
        });
        session.screen = 'interest_sent';
        await saveSession(session);
        return {
          reply: 'Interest sent to homeowner.\n\nNext:\n1. Send Quote\n2. Message Homeowner\n3. Back to Leads',
          options: ['1', '2', '3'],
          session: toSessionSummary(session, user)
        };
      }

      if (command === '2') {
        return handleQuoteFlow({ ...session, screen: 'quote_start', quoteDraft: null }, user, rawMessage);
      }

      if (command === '3') {
        return handleMessageFlow({ ...session, screen: 'message_start', messageDraft: null }, user, rawMessage);
      }

      if (command === '4') {
        return buildLeadsResponse(session, user, { resetPage: false });
      }
    }

    if (session.screen === 'account_help') {
      if (command === '1') {
        return beginPasswordResetFlow(session, { linkedUser: user });
      }

      if (command === '2') {
        session.screen = 'sign_in_help';
        await saveSession(session);
        return {
          reply: formatSignInHelp(user),
          options: ['1', '3'],
          session: toSessionSummary(session, user)
        };
      }

      if (command === '3') {
        return buildMenuResponse(session, user);
      }
    }

    if (session.screen === 'sign_in_help') {
      if (command === '1') {
        return beginPasswordResetFlow(session, { linkedUser: user });
      }

      if (command === '3') {
        return buildMenuResponse(session, user);
      }
    }

    if (command === '1' || command === 'my profile') {
      return buildProfileResponse(session, user);
    }

    if (command === '2' || command === 'my leads') {
      return buildLeadsResponse(session, user);
    }

    if (command === '3' || command === 'my activity') {
      return buildActivityResponse(session, user);
    }

    if (command === '6' || command === 'help') {
      session.screen = 'help';
      await saveSession(session);
      return {
        reply: formatHelp(),
        options: ['M', '7'],
        session: toSessionSummary(session, user)
      };
    }

    if (session.screen === 'profile' && command === '4') {
      return buildAccountHelpResponse(session, user);
    }

    if (command === '4' || command === 'quote') {
      return handleQuoteFlow({ ...session, screen: 'quote_start', quoteDraft: null }, user, rawMessage);
    }

    if (command === '5' || command === 'message') {
      return handleMessageFlow({ ...session, screen: 'message_start', messageDraft: null }, user, rawMessage);
    }

    if (command === '7' || command === 'account help') {
      return buildAccountHelpResponse(session, user);
    }

    return buildMenuResponse(session, user);
  }

  return {
    async getSession(phoneNumber) {
      const session = await loadSession(phoneNumber);
      const user = await getLinkedUser(session.phoneNumber, session);
      return toSessionSummary(session, user);
    },

    async handleIncomingMessage({ phoneNumber, message }) {
      const session = await loadSession(phoneNumber);
      const user = await getLinkedUser(session.phoneNumber, session);
      log.info('contractor whatsapp message received', { phoneNumber: session.phoneNumber, screen: session.screen, linked: Boolean(user) });
      if (!user) {
        return handleUnlinkedMessage(session, message);
      }
      return handleLinkedMessage(session, user, message);
    }
  };
}

module.exports = {
  createWhatsappContractorService,
  normalizePhoneNumber
};