        // --- Append-only Audit Log for Job/Dispute Events (Sprint 5) ---
  // --- Append-only Audit Log for Job/Dispute Events (Sprint 5) ---
  // These methods must be inside the returned object of createPostgresRepository
  async function createEventAuditLog(event) {
    const result = await pool.query(
      `INSERT INTO event_audit_log (id, eventType, entityId, entityType, actorId, action, detail, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, eventType, entityId, entityType, actorId, action, detail, created_at AS "createdAt"`,
      [event.id, event.eventType, event.entityId, event.entityType, event.actorId, event.action, event.detail || '', event.createdAt]
    );
    return result.rows[0];
  }

  async function listEventAuditLogs(filters = {}) {
    const conditions = [];
    const values = [];
    if (filters.entityType) {
      values.push(filters.entityType);
      conditions.push(`entityType = $${values.length}`);
    }
    if (filters.entityId) {
      values.push(filters.entityId);
      conditions.push(`entityId = $${values.length}`);
    }
    if (filters.eventType) {
      values.push(filters.eventType);
      conditions.push(`eventType = $${values.length}`);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT id, eventType, entityId, entityType, actorId, action, detail, created_at AS "createdAt" FROM event_audit_log ${whereClause} ORDER BY created_at DESC`,
      values
    );
    return result.rows;
  }

  // --- Dispute Repository Methods (Sprint 5) ---
  async function createDispute(dispute) {
    const result = await pool.query(
      `INSERT INTO disputes (id, job_id, raised_by, reason, description, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, job_id AS "jobId", raised_by AS "raisedBy", reason, description, status, created_at AS "createdAt"`,
      [dispute.id, dispute.jobId, dispute.raisedBy, dispute.reason, dispute.description, dispute.status, dispute.createdAt]
    );
    return result.rows[0];
  }

  async function listDisputes(filters = {}) {
    const conditions = [];
    const values = [];
    if (filters.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }
    if (filters.jobId) {
      values.push(filters.jobId);
      conditions.push(`job_id = $${values.length}`);
    }
    if (filters.raisedBy) {
      values.push(filters.raisedBy);
      conditions.push(`raised_by = $${values.length}`);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT id, job_id AS "jobId", raised_by AS "raisedBy", reason, description, status, created_at AS "createdAt", resolved_at AS "resolvedAt", resolution, resolved_by AS "resolvedBy", notes
       FROM disputes ${whereClause} ORDER BY created_at DESC`,
      values
    );
    return result.rows;
  }

  async function getDisputeById(id) {
    const result = await pool.query(
      `SELECT id, job_id AS "jobId", raised_by AS "raisedBy", reason, description, status, created_at AS "createdAt", resolved_at AS "resolvedAt", resolution, resolved_by AS "resolvedBy", notes
       FROM disputes WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async function updateDispute(id, updates, adminId) {
    // Only allow updating status, notes, reason, description
    const fields = [];
    const values = [];
    if (updates.status) {
      values.push(updates.status);
      fields.push(`status = $${values.length}`);
    }
    if (updates.notes) {
      values.push(updates.notes);
      fields.push(`notes = $${values.length}`);
    }
    if (updates.reason) {
      values.push(updates.reason);
      fields.push(`reason = $${values.length}`);
    }
    if (updates.description) {
      values.push(updates.description);
      fields.push(`description = $${values.length}`);
    }
    if (!fields.length) return getDisputeById(id);
    values.push(id);
    const result = await pool.query(
      `UPDATE disputes SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async function resolveDispute(id, { resolution, notes, resolvedBy }) {
    const result = await pool.query(
      `UPDATE disputes SET status = 'resolved', resolution = $1, notes = $2, resolved_by = $3, resolved_at = NOW() WHERE id = $4 RETURNING *`,
      [resolution, notes || '', resolvedBy, id]
    );
    return result.rows[0] || null;
  }
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { getAdminBootstrapConfig, normalizeUsername } = require('./adminAccess');

function getDefaultPostgresPort() {
  return process.platform === 'win32' ? 5433 : 5432;
}

const DEMO_PROFESSIONAL_DETAILS = {
  'pro-003': {
    serviceArea: 'Johannesburg North and Midrand',
    availability: 'Available for demo callbacks today',
    summary: 'Theuns Fraser leads residential upgrade work with a focus on plumbing coordination, small renovations, and fast homeowner updates.',
    credentials: ['Background checked', 'Insurance verified', 'Demo-ready references'],
    portfolioHighlights: ['Managed bathroom refresh with same-week completion', 'Coordinated leak repair and waterproofing follow-up', 'Delivered homeowner updates with before-and-after photos'],
    reviewHighlights: ['Clear communication from first visit to handover.', 'Handled follow-up items quickly and professionally.']
  },
  'pro-001': {
    serviceArea: 'Johannesburg North',
    availability: 'Available this afternoon',
    summary: 'John Smit specializes in residential plumbing repairs, leak detection, and bathroom upgrades.',
    credentials: ['NHBRC registered', 'PIRB compliant', 'Background checked'],
    portfolioHighlights: ['Rebuilt guest bathroom plumbing line', 'Completed leak tracing for townhouse complex', 'Installed pressure-balancing shower mixers'],
    reviewHighlights: ['Arrived on time and explained the repair clearly.', 'Left the site clean and shared photo updates before departure.']
  },
  'pro-002': {
    serviceArea: 'Midrand and Centurion',
    availability: 'Next site opening in 2 days',
    summary: 'John Smit handles structured plumbing teams for repeat homeowner and small commercial repair work.',
    credentials: ['Licensed plumbing team', 'Safety file ready', 'References verified'],
    portfolioHighlights: ['Completed same-day burst-pipe repair', 'Managed geyser replacement program', 'Delivered inspection notes for recurring maintenance clients'],
    reviewHighlights: ['Kept the schedule tight and the communication consistent.', 'Professional handover and neat paperwork.']
  }
};

function getDemoProfessionalDetails(id) {
  return DEMO_PROFESSIONAL_DETAILS[id] || null;
}

function createPostgresRepository(options = {}) {
  const connectionString = options.connectionString || process.env.DATABASE_URL;
  const pool = new Pool(connectionString ? { connectionString } : {
    host: options.host || process.env.DB_HOST || '127.0.0.1',
    port: Number(options.port || process.env.DB_PORT || getDefaultPostgresPort()),
    user: options.user || process.env.DB_USER || 'postgres',
    password: options.password || process.env.DB_PASSWORD || 'postgres',
    database: options.database || process.env.DB_NAME || 'tfx_hub'
  });

  // --- Scheduling & Calendar Sync Methods ---
  async function createAvailability(slot) {
    const result = await pool.query(
      `INSERT INTO contractor_availability (id, professional_id, start_time, end_time, status, source, external_event_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [slot.id, slot.professionalId, slot.startTime, slot.endTime, slot.status || 'available', slot.source || 'manual', slot.externalEventId || null]
    );
    return result.rows[0];
  }

  async function listAvailability(professionalId, { from, to } = {}) {
    const values = [professionalId];
    let where = 'professional_id = $1';
    if (from) {
      values.push(from);
      where += ` AND end_time >= $${values.length}`;
    }
    if (to) {
      values.push(to);
      where += ` AND start_time <= $${values.length}`;
    }
    const result = await pool.query(
      `SELECT * FROM contractor_availability WHERE ${where} ORDER BY start_time ASC`,
      values
    );
    return result.rows;
  }

  async function updateAvailability(id, updates) {
    const fields = [];
    const values = [];
    if (updates.status) {
      values.push(updates.status);
      fields.push(`status = $${values.length}`);
    }
    if (updates.externalEventId) {
      values.push(updates.externalEventId);
      fields.push(`external_event_id = $${values.length}`);
    }
    if (!fields.length) return null;
    values.push(id);
    const result = await pool.query(
      `UPDATE contractor_availability SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async function createBooking(booking) {
    const result = await pool.query(
      `INSERT INTO bookings (id, contractor_id, client_id, availability_id, status)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [booking.id, booking.contractorId, booking.clientId, booking.availabilityId, booking.status || 'pending']
    );
    return result.rows[0];
  }

  async function listBookings(contractorId, { status } = {}) {
    const values = [contractorId];
    let where = 'contractor_id = $1';
    if (status) {
      values.push(status);
      where += ` AND status = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT * FROM bookings WHERE ${where} ORDER BY created_at DESC`,
      values
    );
    return result.rows;
  }

  async function updateBooking(id, updates) {
    const fields = [];
    const values = [];
    if (updates.status) {
      values.push(updates.status);
      fields.push(`status = $${values.length}`);
    }
    if (!fields.length) return null;
    values.push(id);
    const result = await pool.query(
      `UPDATE bookings SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async function upsertCalendarSyncToken(token) {
    const result = await pool.query(
      `INSERT INTO calendar_sync_tokens (id, professional_id, provider, access_token, refresh_token, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET access_token = $4, refresh_token = $5, expires_at = $6, updated_at = NOW()
       RETURNING *`,
      [token.id, token.professionalId, token.provider, token.accessToken, token.refreshToken, token.expiresAt]
    );
    return result.rows[0];
  }

  async function getCalendarSyncToken(professionalId, provider) {
    const result = await pool.query(
      `SELECT * FROM calendar_sync_tokens WHERE professional_id = $1 AND provider = $2 LIMIT 1`,
      [professionalId, provider]
    );
    return result.rows[0] || null;
  }

  async function applySchema() {
    const schema = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
    await pool.query(schema);
  }

  async function initialize(options = {}) {
    await applySchema();
    if (options.seedDemoData === false) {
      return;
    }
    await seedDemoData();
  }

  async function seedDemoData() {
    const adminBootstrap = getAdminBootstrapConfig();
    const passwordHash = await bcrypt.hash('password123', 10);
    const plumberPasswordHash = await bcrypt.hash('password123', 10);
    const clientPasswordHash = await bcrypt.hash('password123', 10);
    const adminPasswordHash = await bcrypt.hash(adminBootstrap.password, 10);
    await pool.query(
      `INSERT INTO users (
        id, association_id, email, username, password_hash, is_bootstrap_admin, first_name, last_name, role,
        professional_id, trade, tier, rating, completed_jobs, active_quotes, response_time
      ) VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16),
      ($17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32),
      ($33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48),
      ($49,$50,$51,$52,$53,$54,$55,$56,$57,$58,$59,$60,$61,$62,$63,$64)
      ON CONFLICT (id) DO NOTHING`,
      [
        'user-contractor-001',
        'assoc-contractor-demo',
        'contractor@example.com',
        'theuns.fraser',
        passwordHash,
        false,
        'Theuns',
        'Fraser',
        'contractor',
        'pro-003',
        'general contractor',
        'TRUSTED',
        4.9,
        128,
        7,
        '8 min',
        'user-contractor-002',
        'assoc-contractor-demo',
        'plumber@example.com',
        'john.smit',
        plumberPasswordHash,
        false,
        'John',
        'Smit',
        'contractor',
        'pro-001',
        'plumber',
        'PREMIUM',
        4.8,
        247,
        11,
        '9 min',
        'client-001',
        'assoc-customer-demo',
        'client@example.com',
        'michelle.brummer',
        clientPasswordHash,
        false,
        'Michelle',
        'Brummer',
        'client',
        null,
        null,
        null,
        null,
        0,
        0,
        'N/A',
        'admin-001',
        'assoc-admin-demo',
        adminBootstrap.email,
        adminBootstrap.username,
        adminPasswordHash,
        true,
        'Platform',
        'Admin',
        'admin',
        null,
        null,
        null,
        null,
        0,
        0,
        'N/A'
      ]
    );

    await pool.query(
      `UPDATE users SET phone_number = $2 WHERE id = $1`,
      ['user-contractor-001', '+27710000001']
    );
    await pool.query(
      `UPDATE users
       SET username = $2, first_name = $3, last_name = $4, trade = $5, tier = $6, rating = $7, completed_jobs = $8, active_quotes = $9, response_time = $10
       WHERE id = $1`,
      ['user-contractor-001', 'theuns.fraser', 'Theuns', 'Fraser', 'general contractor', 'TRUSTED', 4.9, 128, 7, '8 min']
    );
    await pool.query(
      `UPDATE users SET phone_number = $2 WHERE id = $1`,
      ['user-contractor-002', '+27710000002']
    );
    await pool.query(
      `UPDATE users SET phone_number = $2 WHERE id = $1`,
      ['client-001', '+27710000003']
    );
    await pool.query(
      `UPDATE users
       SET username = $2, first_name = $3, last_name = $4
       WHERE id = $1`,
      ['client-001', 'michelle.brummer', 'Michelle', 'Brummer']
    );
    await pool.query(
      `UPDATE users SET phone_number = $2 WHERE id = $1`,
      ['admin-001', '+27710000004']
    );
    await pool.query(
      `INSERT INTO users (
        id, association_id, email, username, password_hash, first_name, last_name, role,
        professional_id, trade, tier, rating, completed_jobs, active_quotes, response_time, phone_number
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16),
           ($17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
      ON CONFLICT (id) DO NOTHING`,
      [
        'association-001',
        'assoc-members-demo',
        'association@example.com',
        'tfx.association',
        await bcrypt.hash('password123', 10),
        'TFX',
        "Association Member Management System (AMMS)",
        'association',
        null,
        null,
        null,
        null,
        0,
        0,
        'N/A',
        '+27710000005',
        'professional-001',
        'assoc-members-demo',
        'professional@example.com',
        'lerato.ndlovu',
        await bcrypt.hash('password123', 10),
        'Lerato',
        'Ndlovu',
        'professional',
        'pro-101',
        'electrician',
        'VERIFIED',
        4.6,
        34,
        0,
        'N/A',
        '+27710000006'
      ]
    );

    await pool.query(
      `INSERT INTO jobs (
        id, title, description, trade, status, budget, location, urgency, posted, lead_type, match_score, client_id
      ) VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12),
      ($13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      ON CONFLICT (id) DO NOTHING`,
      [
        'job-001',
        'Kitchen plumbing and leak repair',
        'Homeowner needs a contractor to repair a sink leak, replace two shutoff valves, and test water pressure before the weekend.',
        'plumber',
        'OPEN',
        'R4,000 - R8,500',
        'Midrand',
        'Urgent',
        '15 min ago',
        'Verified homeowner',
        93,
        'client-001',
        'job-002',
        'Boundary wall extension and gate footing',
        'Michelle needs a boundary wall extension with a new gate footing before guests arrive next week.',
        'builder',
        'OPEN',
        'R15,000 - R28,000',
        'Centurion',
        'This week',
        '42 min ago',
        'Repeat customer',
        81,
        'client-001'
      ]
    );
    await pool.query(
      `UPDATE jobs
       SET title = $2, description = $3, budget = $4, client_id = $5
       WHERE id = $1`,
      ['job-002', 'Boundary wall extension and gate footing', 'Michelle needs a boundary wall extension with a new gate footing before guests arrive next week.', 'R15,000 - R28,000', 'client-001']
    );

    await pool.query(
      `INSERT INTO jobs (
        id, title, description, trade, status, budget, location, urgency, posted, lead_type, match_score, client_id
      ) VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12),
      ($13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      ON CONFLICT (id) DO NOTHING`,
      [
        'job-003',
        'Garage conversion electrical tidy-up',
        'Homeowner needs a contractor to coordinate lighting, sockets, and a final snag list before a family event.',
        'electrician',
        'OPEN',
        'R9,500 - R16,000',
        'Randburg',
        'Flexible',
        '1 hour ago',
        'Verified homeowner',
        77,
        'client-001',
        'job-004',
        'Roof waterproofing and ceiling patch repair',
        'Customer needs a contractor to inspect a leak path, reseal the roof section, and patch interior ceiling damage.',
        'roofer',
        'OPEN',
        'R12,000 - R19,000',
        'Sandton',
        'Urgent',
        '2 hours ago',
        'Repeat customer',
        83,
        'client-001'
      ]
    );

    await pool.query(
      `INSERT INTO contractor_events (id, professional_id, job_id, event_type, summary, status, note)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7),
       ($8,$9,$10,$11,$12,$13,$14),
       ($15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (id) DO NOTHING`,
      [
        'event-001',
        'pro-003',
        'job-001',
        'interest',
        'Interest sent to homeowner',
        'sent',
        'Theuns confirmed availability for a same-day visit.',
        'event-002',
        'pro-003',
        'job-002',
        'quote',
        'Quote R18,500 · 4 working days',
        'sent',
        'Includes foundation prep and gate footing alignment.',
        'event-003',
        'pro-003',
        'job-004',
        'message',
        'I can inspect the leak path this afternoon and confirm the full repair scope.',
        'sent',
        'Homeowner requested a photo summary after inspection.'
      ]
    );
  }

  function mapUser(row) {
    return row ? {
      id: row.id,
      associationId: row.association_id,
      email: row.email,
      username: row.username,
      passwordHash: row.password_hash,
      isBootstrapAdmin: Boolean(row.is_bootstrap_admin),
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      professionalId: row.professional_id,
      trade: row.trade,
      tier: row.tier,
      rating: Number(row.rating || 4.5),
      completedJobs: Number(row.completed_jobs || 0),
      activeQuotes: Number(row.active_quotes || 0),
      responseTime: row.response_time || '12 min',
      phoneNumber: row.phone_number || null,
      createdAt: row.created_at
    } : null;
  }

  function mapProfessional(row) {
    if (!row) {
      return null;
    }

    const details = getDemoProfessionalDetails(row.professional_id || row.id) || {};
    return {
      id: row.professional_id || row.id,
      name: `${row.first_name} ${row.last_name}`.trim(),
      trade: row.trade,
      tier: row.tier,
      rating: Number(row.rating || 4.5),
      completedJobs: Number(row.completed_jobs || 0),
      responseTime: row.response_time || '12 min',
      ...details
    };
  }

  function mapJob(row) {
    return row ? {
      id: row.id,
      title: row.title,
      description: row.description,
      trade: row.trade,
      status: row.status,
      budget: row.budget,
      location: row.location,
      urgency: row.urgency,
      posted: row.posted,
      leadType: row.lead_type,
      matchScore: Number(row.match_score || 75),
      clientId: row.client_id,
      createdAt: row.created_at
    } : null;
  }

  return {
    createEventAuditLog,
    listEventAuditLogs,
    createDispute,
    listDisputes,
    getDisputeById,
    updateDispute,
    resolveDispute,
      // Scheduling & Calendar Sync
      createAvailability,
      listAvailability,
      updateAvailability,
      createBooking,
      listBookings,
      updateBooking,
      upsertCalendarSyncToken,
      getCalendarSyncToken,
    async applySchema() {
      await applySchema();
    },

    async initialize() {
      await initialize();
    },

    async getUserByEmail(email) {
      const result = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1', [email]);
      return mapUser(result.rows[0]);
    },

    async getUserByUsername(username) {
      const result = await pool.query('SELECT * FROM users WHERE lower(username) = lower($1) LIMIT 1', [normalizeUsername(username)]);
      return mapUser(result.rows[0]);
    },

    async getUserById(userId) {
      const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
      return mapUser(result.rows[0]);
    },

    async createUser(user) {
      const result = await pool.query(
        `INSERT INTO users (
          id, association_id, email, username, password_hash, is_bootstrap_admin, first_name, last_name, role,
          professional_id, trade, tier, rating, completed_jobs, active_quotes, response_time, phone_number
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
        [
          user.id,
          user.associationId,
          user.email,
          normalizeUsername(user.username),
          user.passwordHash,
          Boolean(user.isBootstrapAdmin),
          user.firstName,
          user.lastName,
          user.role,
          user.professionalId,
          user.trade,
          user.tier,
          user.rating,
          user.completedJobs,
          user.activeQuotes,
          user.responseTime,
          user.phoneNumber || null
        ]
      );
      return mapUser(result.rows[0]);
    },

    async getUserByPhoneNumber(phoneNumber) {
      const result = await pool.query('SELECT * FROM users WHERE phone_number = $1 LIMIT 1', [phoneNumber]);
      return mapUser(result.rows[0]);
    },

    async listAdminUsers() {
      const result = await pool.query('SELECT * FROM users WHERE role = $1 ORDER BY created_at ASC', ['admin']);
      return result.rows.map(mapUser);
    },

    async updateUserPhoneNumber(userId, phoneNumber) {
      const result = await pool.query('UPDATE users SET phone_number = $2 WHERE id = $1 RETURNING *', [userId, phoneNumber]);
      return mapUser(result.rows[0]);
    },

    async listProfessionals(filters = {}) {
      const values = ['contractor'];
      const conditions = ['role = $1'];
      if (filters.trade) {
        values.push(filters.trade);
        conditions.push(`trade = $${values.length}`);
      }
      const result = await pool.query(`SELECT * FROM users WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`, values);
      return result.rows.map(mapProfessional);
    },

    async getProfessionalById(professionalId) {
      const result = await pool.query('SELECT * FROM users WHERE professional_id = $1 OR id = $1 LIMIT 1', [professionalId]);
      return mapProfessional(result.rows[0]);
    },

    async listCustomerShortlist(customerUserId) {
      const result = await pool.query(
        `SELECT professional_id AS "professionalId"
         FROM customer_professional_shortlist
         WHERE customer_user_id = $1
         ORDER BY created_at DESC`,
        [customerUserId]
      );
      return result.rows.map((row) => row.professionalId);
    },

    async addCustomerShortlistItem(customerUserId, professionalId) {
      await pool.query(
        `INSERT INTO customer_professional_shortlist (customer_user_id, professional_id)
         VALUES ($1, $2)
         ON CONFLICT (customer_user_id, professional_id) DO NOTHING`,
        [customerUserId, professionalId]
      );
      return true;
    },

    async removeCustomerShortlistItem(customerUserId, professionalId) {
      const result = await pool.query(
        `DELETE FROM customer_professional_shortlist
         WHERE customer_user_id = $1 AND professional_id = $2`,
        [customerUserId, professionalId]
      );
      return result.rowCount > 0;
    },

    async listJobs(filters = {}) {
      const conditions = [];
      const values = [];
      if (filters.status) {
        values.push(filters.status);
        conditions.push(`status = $${values.length}`);
      }
      if (filters.trade) {
        values.push(filters.trade);
        conditions.push(`trade = $${values.length}`);
      }
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(`SELECT * FROM jobs ${whereClause} ORDER BY created_at DESC`, values);
      return result.rows.map(mapJob);
    },

    async getJobById(jobId) {
      const result = await pool.query('SELECT * FROM jobs WHERE id = $1 LIMIT 1', [jobId]);
      return mapJob(result.rows[0]);
    },

    async createJob(job) {
      const result = await pool.query(
        `INSERT INTO jobs (id, title, description, trade, status, budget, location, urgency, posted, lead_type, match_score, client_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [job.id, job.title, job.description, job.trade, job.status, job.budget, job.location, job.urgency, job.posted, job.leadType, job.matchScore, job.clientId]
      );
      return mapJob(result.rows[0]);
    },

    async createJobApplication(application) {
      const result = await pool.query(
        `INSERT INTO job_applications (id, job_id, professional_id, message)
         VALUES ($1,$2,$3,$4) RETURNING id, job_id AS "jobId", professional_id AS "professionalId", message, created_at AS "createdAt"`,
        [application.id, application.jobId, application.professionalId, application.message || '']
      );
      return result.rows[0];
    },

    async appendContractorEvent(event) {
      const result = await pool.query(
        `INSERT INTO contractor_events (id, professional_id, job_id, event_type, summary, status, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, professional_id AS "professionalId", job_id AS "jobId", event_type AS type, summary, status, note, created_at AS "createdAt"`,
        [event.id, event.professionalId, event.jobId, event.type, event.summary, event.status, event.note || '']
      );
      return { ...result.rows[0], source: 'live' };
    },

    async createAdminAction(action) {
      const result = await pool.query(
        `INSERT INTO admin_actions (id, professional_id, action_type, summary, note, created_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, professional_id AS "professionalId", action_type AS "actionType", summary, note, created_by AS "createdBy", created_at AS "createdAt"`,
        [action.id, action.professionalId, action.actionType, action.summary, action.note || '', action.createdBy]
      );
      return { ...result.rows[0], source: 'live' };
    },

    async createOperationalAction(action) {
      return this.createAdminAction(action);
    },

    async listAdminActions(professionalId) {
      const result = await pool.query(
        `SELECT id, professional_id AS "professionalId", action_type AS "actionType", summary, note, created_by AS "createdBy", created_at AS "createdAt"
         FROM admin_actions
         WHERE professional_id = $1
         ORDER BY created_at DESC`,
        [professionalId]
      );
      return result.rows.map((row) => ({ ...row, source: 'live' }));
    },

    async listOperationalActions(professionalId) {
      return this.listAdminActions(professionalId);
    },

    async getContractorHistory(professionalId) {
      const result = await pool.query(
        `SELECT id, professional_id AS "professionalId", job_id AS "jobId", event_type AS type, summary, status, note, created_at AS "createdAt"
         FROM contractor_events
         WHERE professional_id = $1
         ORDER BY created_at DESC`,
        [professionalId]
      );
      return result.rows.map((row) => ({ ...row, source: 'live' }));
    },

    async getOnboardingStatus(userId) {
      const result = await pool.query(
        'SELECT completed_stages AS "completedStages" FROM onboarding_progress WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      return result.rows[0] || { completedStages: [] };
    },

    async submitOnboardingStage(userId, stage) {
      const result = await pool.query(
        `INSERT INTO onboarding_progress (user_id, completed_stages, updated_at)
         VALUES ($1, ARRAY[$2], NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET
           completed_stages = CASE
             WHEN NOT ($2 = ANY(onboarding_progress.completed_stages))
             THEN array_append(onboarding_progress.completed_stages, $2)
             ELSE onboarding_progress.completed_stages
           END,
           updated_at = NOW()
         RETURNING completed_stages AS "completedStages"`,
        [userId, stage]
      );
      return result.rows[0];
    },

    async createPasswordResetToken(entry) {
      const result = await pool.query(
        `INSERT INTO password_reset_tokens (token, user_id, expires_at)
         VALUES ($1,$2,$3)
         RETURNING token, user_id AS "userId", expires_at AS "expiresAt", consumed_at AS "consumedAt"`,
        [entry.token, entry.userId, entry.expiresAt]
      );
      return result.rows[0];
    },

    async getPasswordResetToken(token) {
      const result = await pool.query(
        `SELECT token, user_id AS "userId", expires_at AS "expiresAt", consumed_at AS "consumedAt"
         FROM password_reset_tokens WHERE token = $1 LIMIT 1`,
        [token]
      );
      return result.rows[0] || null;
    },

    async consumePasswordResetToken(token) {
      const result = await pool.query(
        `UPDATE password_reset_tokens
         SET consumed_at = NOW()
         WHERE token = $1
         RETURNING token, user_id AS "userId", expires_at AS "expiresAt", consumed_at AS "consumedAt"`,
        [token]
      );
      return result.rows[0] || null;
    },

    async updateUserPassword(userId, passwordHash) {
      const result = await pool.query(
        'UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING *',
        [userId, passwordHash]
      );
      return mapUser(result.rows[0]);
    },

    async updateAdminUserCredentials(userId, updates = {}) {
      const assignments = [];
      const values = [userId];

      if (typeof updates.username !== 'undefined') {
        values.push(normalizeUsername(updates.username));
        assignments.push(`username = $${values.length}`);
      }
      if (typeof updates.passwordHash !== 'undefined') {
        values.push(updates.passwordHash);
        assignments.push(`password_hash = $${values.length}`);
      }
      if (typeof updates.email !== 'undefined') {
        values.push(updates.email);
        assignments.push(`email = $${values.length}`);
      }

      if (assignments.length === 0) {
        return this.getUserById(userId);
      }

      const result = await pool.query(
        `UPDATE users SET ${assignments.join(', ')} WHERE id = $1 AND role = 'admin' RETURNING *`,
        values
      );
      return mapUser(result.rows[0]);
    },

    async createAdminAuditEvent(event) {
      const result = await pool.query(
        `INSERT INTO admin_access_audit (
          id, admin_user_id, event_type, outcome, reason, identifier, request_path, request_method, target_user_id, ip_address, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING id, admin_user_id AS "adminUserId", event_type AS "eventType", outcome, reason, identifier,
                  request_path AS "requestPath", request_method AS "requestMethod", target_user_id AS "targetUserId",
                  ip_address AS "ipAddress", created_at AS "createdAt"`,
        [
          event.id,
          event.adminUserId || null,
          event.eventType,
          event.outcome,
          event.reason || '',
          event.identifier || null,
          event.requestPath || null,
          event.requestMethod || null,
          event.targetUserId || null,
          event.ipAddress || null,
          event.createdAt || new Date().toISOString()
        ]
      );
      return result.rows[0];
    },

    async listAdminAuditEvents(filters = {}) {
      const values = [];
      const conditions = [];
      if (filters.adminUserId) {
        values.push(filters.adminUserId);
        conditions.push(`admin_user_id = $${values.length}`);
      }
      if (filters.eventType) {
        values.push(filters.eventType);
        conditions.push(`event_type = $${values.length}`);
      }
      if (filters.outcome) {
        values.push(filters.outcome);
        conditions.push(`outcome = $${values.length}`);
      }
      if (filters.targetUserId) {
        values.push(filters.targetUserId);
        conditions.push(`target_user_id = $${values.length}`);
      }
      values.push(Number(filters.limit || 50));
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT id, admin_user_id AS "adminUserId", event_type AS "eventType", outcome, reason, identifier,
                request_path AS "requestPath", request_method AS "requestMethod", target_user_id AS "targetUserId",
                ip_address AS "ipAddress", created_at AS "createdAt"
         FROM admin_access_audit
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${values.length}`,
        values
      );
      return result.rows;
    },

    async getWhatsappContractorSession(phoneNumber) {
      const result = await pool.query(
        'SELECT phone_number AS "phoneNumber", session_json AS session, updated_at AS "updatedAt" FROM whatsapp_contractor_sessions WHERE phone_number = $1 LIMIT 1',
        [phoneNumber]
      );
      if (!result.rows[0]) {
        return null;
      }
      return { ...(result.rows[0].session || {}), phoneNumber: result.rows[0].phoneNumber, updatedAt: result.rows[0].updatedAt };
    },

    async upsertWhatsappContractorSession(phoneNumber, session) {
      const result = await pool.query(
        `INSERT INTO whatsapp_contractor_sessions (phone_number, session_json, updated_at)
         VALUES ($1,$2::jsonb,NOW())
         ON CONFLICT (phone_number)
         DO UPDATE SET session_json = $2::jsonb, updated_at = NOW()
         RETURNING phone_number AS "phoneNumber", session_json AS session, updated_at AS "updatedAt"`,
        [phoneNumber, JSON.stringify({ ...session, phoneNumber })]
      );
      return { ...(result.rows[0].session || {}), phoneNumber: result.rows[0].phoneNumber, updatedAt: result.rows[0].updatedAt };
    },

    async clearWhatsappContractorSession(phoneNumber) {
      await pool.query('DELETE FROM whatsapp_contractor_sessions WHERE phone_number = $1', [phoneNumber]);
      return { ok: true };
    },

    async getWhatsappCustomerSession(phoneNumber) {
      const result = await pool.query(
        'SELECT phone_number AS "phoneNumber", session_json AS session, updated_at AS "updatedAt" FROM whatsapp_contractor_sessions WHERE phone_number = $1 LIMIT 1',
        [`customer:${phoneNumber}`]
      );
      if (!result.rows[0]) {
        return null;
      }
      return { ...(result.rows[0].session || {}), phoneNumber, updatedAt: result.rows[0].updatedAt };
    },

    async upsertWhatsappCustomerSession(phoneNumber, session) {
      const key = `customer:${phoneNumber}`;
      const result = await pool.query(
        `INSERT INTO whatsapp_contractor_sessions (phone_number, session_json, updated_at)
         VALUES ($1,$2::jsonb,NOW())
         ON CONFLICT (phone_number)
         DO UPDATE SET session_json = $2::jsonb, updated_at = NOW()
         RETURNING session_json AS session, updated_at AS "updatedAt"`,
        [key, JSON.stringify({ ...session, phoneNumber })]
      );
      return { ...(result.rows[0].session || {}), phoneNumber, updatedAt: result.rows[0].updatedAt };
    },

    async getWhatsappAdminSession(phoneNumber) {
      const result = await pool.query(
        'SELECT phone_number AS "phoneNumber", session_json AS session, updated_at AS "updatedAt" FROM whatsapp_contractor_sessions WHERE phone_number = $1 LIMIT 1',
        [`admin:${phoneNumber}`]
      );
      if (!result.rows[0]) {
        return null;
      }
      return { ...(result.rows[0].session || {}), phoneNumber, updatedAt: result.rows[0].updatedAt };
    },

    async upsertWhatsappAdminSession(phoneNumber, session) {
      const key = `admin:${phoneNumber}`;
      const result = await pool.query(
        `INSERT INTO whatsapp_contractor_sessions (phone_number, session_json, updated_at)
         VALUES ($1,$2::jsonb,NOW())
         ON CONFLICT (phone_number)
         DO UPDATE SET session_json = $2::jsonb, updated_at = NOW()
         RETURNING session_json AS session, updated_at AS "updatedAt"`,
        [key, JSON.stringify({ ...session, phoneNumber })]
      );
      return { ...(result.rows[0].session || {}), phoneNumber, updatedAt: result.rows[0].updatedAt };
    },

    async getWhatsappAssociationSession(phoneNumber) {
      const result = await pool.query(
        'SELECT phone_number AS "phoneNumber", session_json AS session, updated_at AS "updatedAt" FROM whatsapp_contractor_sessions WHERE phone_number = $1 LIMIT 1',
        [`association:${phoneNumber}`]
      );
      if (!result.rows[0]) {
        return null;
      }
      return { ...(result.rows[0].session || {}), phoneNumber, updatedAt: result.rows[0].updatedAt };
    },

    async upsertWhatsappAssociationSession(phoneNumber, session) {
      const key = `association:${phoneNumber}`;
      const result = await pool.query(
        `INSERT INTO whatsapp_contractor_sessions (phone_number, session_json, updated_at)
         VALUES ($1,$2::jsonb,NOW())
         ON CONFLICT (phone_number)
         DO UPDATE SET session_json = $2::jsonb, updated_at = NOW()
         RETURNING session_json AS session, updated_at AS "updatedAt"`,
        [key, JSON.stringify({ ...session, phoneNumber })]
      );
      return { ...(result.rows[0].session || {}), phoneNumber, updatedAt: result.rows[0].updatedAt };
    },

    async getWhatsappProfessionalSession(phoneNumber) {
      const result = await pool.query(
        'SELECT phone_number AS "phoneNumber", session_json AS session, updated_at AS "updatedAt" FROM whatsapp_contractor_sessions WHERE phone_number = $1 LIMIT 1',
        [`professional:${phoneNumber}`]
      );
      if (!result.rows[0]) {
        return null;
      }
      return { ...(result.rows[0].session || {}), phoneNumber, updatedAt: result.rows[0].updatedAt };
    },

    async upsertWhatsappProfessionalSession(phoneNumber, session) {
      const key = `professional:${phoneNumber}`;
      const result = await pool.query(
        `INSERT INTO whatsapp_contractor_sessions (phone_number, session_json, updated_at)
         VALUES ($1,$2::jsonb,NOW())
         ON CONFLICT (phone_number)
         DO UPDATE SET session_json = $2::jsonb, updated_at = NOW()
         RETURNING session_json AS session, updated_at AS "updatedAt"`,
        [key, JSON.stringify({ ...session, phoneNumber })]
      );
      return { ...(result.rows[0].session || {}), phoneNumber, updatedAt: result.rows[0].updatedAt };
    },

    async getWhatsappMetaRouterSession(phoneNumber) {
      const result = await pool.query(
        'SELECT phone_number AS "phoneNumber", session_json AS session, updated_at AS "updatedAt" FROM whatsapp_contractor_sessions WHERE phone_number = $1 LIMIT 1',
        [`meta:${phoneNumber}`]
      );
      if (!result.rows[0]) {
        return null;
      }
      return { ...(result.rows[0].session || {}), phoneNumber, updatedAt: result.rows[0].updatedAt };
    },

    async upsertWhatsappMetaRouterSession(phoneNumber, session) {
      const key = `meta:${phoneNumber}`;
      const result = await pool.query(
        `INSERT INTO whatsapp_contractor_sessions (phone_number, session_json, updated_at)
         VALUES ($1,$2::jsonb,NOW())
         ON CONFLICT (phone_number)
         DO UPDATE SET session_json = $2::jsonb, updated_at = NOW()
         RETURNING session_json AS session, updated_at AS "updatedAt"`,
        [key, JSON.stringify({ ...session, phoneNumber })]
      );
      return { ...(result.rows[0].session || {}), phoneNumber, updatedAt: result.rows[0].updatedAt };
    },

    async clearWhatsappMetaRouterSession(phoneNumber) {
      await pool.query('DELETE FROM whatsapp_contractor_sessions WHERE phone_number = $1', [`meta:${phoneNumber}`]);
      return { ok: true };
    }
  };
}

module.exports = {
  createPostgresRepository
};
