const bcrypt = require('bcryptjs');

const ONBOARDING_STAGES = ['welcome', 'name', 'trade', 'experience', 'location', 'credentials'];

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
    activeTradeFilter: session.leadFilters?.trade || null
  };
}

function formatMenu(user, openLeadCount = 0) {
  return [
    `Welcome back, ${user.firstName}.`,
    '',
    `You have ${openLeadCount} open leads and ${user.activeQuotes || 0} active quotes.`,
    '',
    'Reply with a number:',
    '1. My Profile',
    '2. My Leads',
    '3. My Activity',
    '4. Quote a Lead',
    '5. Message a Homeowner',
    '6. Help'
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
    '3. Menu'
  ].join('\n');
}

function formatLeadList(leads, tradeFilter) {
  if (!leads.length) {
    return [
      tradeFilter ? `No open ${tradeFilter} leads are available right now.` : 'No open leads are available right now.',
      '',
      'Reply F to set a trade filter, A for all trades, or M for menu.'
    ].join('\n');
  }

  const rows = ['Top leads for you', ''];
  if (tradeFilter) {
    rows.push(`Current trade filter: ${tradeFilter}`);
    rows.push('');
  }
  leads.forEach((lead, index) => {
    rows.push(`${index + 1}. ${lead.title}`);
    rows.push(`${lead.location || 'TBC'} | ${lead.budget || 'Budget TBC'} | ${lead.urgency || 'Flexible'}`);
    rows.push(`${lead.matchScore || 75}% match`);
    rows.push('');
  });
  rows.push('Reply with a lead number to open it.');
  rows.push('Reply F to change trade filter, A for all trades, or M for menu.');
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
    '',
    'Reply M for menu.'
  ].join('\n');
}

function createWhatsappContractorService({ repository, logger, createId }) {
  const log = logger || { info() {}, warn() {}, error() {} };

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
      leadFilters: { trade: null },
      quoteDraft: null,
      messageDraft: null,
      registrationDraft: null
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
      options: ['1', '2', '3', '4', '5', '6'],
      session: toSessionSummary(session, user)
    };
  }

  async function buildProfileResponse(session, user) {
    session.screen = 'profile';
    await saveSession(session);
    return {
      reply: formatProfile(user),
      options: ['1', '2', '3'],
      session: toSessionSummary(session, user)
    };
  }

  async function buildLeadsResponse(session, user) {
    const tradeFilter = normalizeTradeFilter(session.leadFilters?.trade);
    const leads = (await repository.listJobs({ status: 'OPEN', trade: tradeFilter || undefined })).slice(0, 3);
    session.screen = 'leads_list';
    session.userId = user.id;
    session.lastLeadIds = leads.map((lead) => lead.id);
    session.activeJobId = null;
    await saveSession(session);
    return {
      reply: formatLeadList(leads, tradeFilter || null),
      options: leads.map((_, index) => String(index + 1)).concat(['F', 'A', 'M']),
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
          '2. Register as a new contractor'
        ].join('\n'),
        options: ['1', '2'],
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
        options: ['1', '2', '3', '4', '5', '6'],
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

    if (session.screen === 'interest_sent') {
      if (command === '1') {
        return handleQuoteFlow({ ...session, screen: 'quote_start', quoteDraft: null }, user, rawMessage);
      }

      if (command === '2') {
        return handleMessageFlow({ ...session, screen: 'message_start', messageDraft: null }, user, rawMessage);
      }

      if (command === '3') {
        return buildLeadsResponse(session, user);
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

    if (session.screen === 'leads_list' && (command === 'a' || command === 'all')) {
      session.leadFilters = { ...(session.leadFilters || {}), trade: null };
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
        return buildLeadsResponse(session, user);
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
        options: ['M'],
        session: toSessionSummary(session, user)
      };
    }

    if (command === '4' || command === 'quote') {
      return handleQuoteFlow({ ...session, screen: 'quote_start', quoteDraft: null }, user, rawMessage);
    }

    if (command === '5' || command === 'message') {
      return handleMessageFlow({ ...session, screen: 'message_start', messageDraft: null }, user, rawMessage);
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