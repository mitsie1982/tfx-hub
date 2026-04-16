const { tenantMiddleware, roleMiddleware } = require('../../shared-auth/src');

// --- Sprint 5: Import metrics for job/dispute rates ---
    const express = require('express');
    const { disputeCreated, disputeResolved, jobCreated } = require('../../../src/health_endpoints.js');
    const { getAdminAccessPolicy } = require('./adminAccess');
    const { createPasswordResetNotifier } = require('./passwordResetNotifier');
    const { createWhatsappAssociationService } = require('./whatsappAssociation');
    const { createWhatsappContractorService } = require('./whatsappContractor');
    const { createWhatsappProfessionalService } = require('./whatsappProfessional');
    const { createWhatsappCustomerService } = require('./whatsappCustomer');
    const { createWhatsappAdminService } = require('./whatsappAdmin');
    const { createMetaWhatsAppWebhookAdapter } = require('./metaWhatsAppWebhook');

function createApp({ repository, logger, getCurrentDate }) {
  const app = express();
  const metrics = { disputeCreated, disputeResolved, jobCreated };

  // --- Event Audit Log Endpoint (admin only) ---
  app.get("/admin/event-audit-log", ...requireTenantAccess(), requireAdminRole, async (req, res) => {
    const filters = {
      entityType: req.query.entityType || undefined,
      entityId: req.query.entityId || undefined,
      eventType: req.query.eventType || undefined
    };
    const items = await repository.listEventAuditLogs(filters);
    return res.json({ items });
  });

  // --- Audit Logging Hooks for Job/Dispute Events ---
  // Dispute creation
  const oldCreateDispute = repository.createDispute.bind(repository);
  repository.createDispute = async function(dispute) {
    const result = await oldCreateDispute(dispute);
    if (metrics?.disputeCreated) metrics.disputeCreated.labels('api').inc();
    await repository.createEventAuditLog({
      id: randomId('audit'),
      eventType: 'dispute',
      entityId: result.id,
      entityType: 'dispute',
      actorId: dispute.raisedBy,
      action: 'create',
      detail: JSON.stringify(dispute),
      createdAt: new Date().toISOString()
    });
    return result;
  };

  // Dispute update
  const oldUpdateDispute = repository.updateDispute?.bind(repository);
  if (oldUpdateDispute) {
    repository.updateDispute = async function(id, updates, adminId) {
      const result = await oldUpdateDispute(id, updates, adminId);
      await repository.createEventAuditLog({
        id: randomId('audit'),
        eventType: 'dispute',
        entityId: id,
        entityType: 'dispute',
        actorId: adminId,
        action: 'update',
        detail: JSON.stringify(updates),
        createdAt: new Date().toISOString()
      });
      return result;
    };
  }

  // Dispute resolve
  const oldResolveDispute = repository.resolveDispute?.bind(repository);
  if (oldResolveDispute) {
    repository.resolveDispute = async function(id, payload) {
      const result = await oldResolveDispute(id, payload);
      if (metrics?.disputeResolved) metrics.disputeResolved.labels('api').inc();
      await repository.createEventAuditLog({
        id: randomId('audit'),
        eventType: 'dispute',
        entityId: id,
        entityType: 'dispute',
        actorId: payload.resolvedBy,
        action: 'resolve',
        detail: JSON.stringify(payload),
        createdAt: new Date().toISOString()
      });
      return result;
    };
  }

  // Job creation
  const oldCreateJob = repository.createJob.bind(repository);
  repository.createJob = async function(job) {
    const result = await oldCreateJob(job);
    if (metrics?.jobCreated) metrics.jobCreated.labels('api').inc();
    await repository.createEventAuditLog({
      id: randomId('audit'),
      eventType: 'job',
      entityId: result.id,
      entityType: 'job',
      actorId: job.clientId,
      action: 'create',
      detail: JSON.stringify(job),
      createdAt: new Date().toISOString()
    });
    return result;
  };

  // --- Dispute Lifecycle Endpoints (Sprint 5) --- 
  app.post("/disputes", ...requireTenantAccess(), async (req, res) => {
    const { jobId, reason, description } = req.body || {};
    if (!jobId || !reason || !description) {
      return res.status(400).json({ error: "validation_error", message: "jobId, reason, and description are required" });
    }
    const item = await repository.createDispute({
      id: randomId("dispute"),
      jobId,
      raisedBy: req.auth.userId || req.auth.sub,
      reason,
      description,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    return res.status(201).json({ item });
  });

  app.get("/disputes", ...requireTenantAccess(), async (req, res) => {
    const filters = {
      status: req.query.status || undefined,
      jobId: req.query.jobId || undefined,
      raisedBy: req.query.raisedBy || undefined,
    };
    const items = await repository.listDisputes(filters);
    return res.json({ items });
  });

  app.get("/disputes/:id", ...requireTenantAccess(), async (req, res) => {
    const item = await repository.getDisputeById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "dispute_not_found" });
    }
    return res.json({ item });
  });

  app.patch("/disputes/:id", ...requireTenantAccess(), requireAdminRole, async (req, res) => {
    const updates = req.body || {};
    const item = await repository.updateDispute(req.params.id, updates, req.auth.userId || req.auth.sub);
    if (!item) {
      return res.status(404).json({ error: "dispute_not_found" });
    }
    return res.json({ item });
  });

  app.post("/disputes/:id/resolve", ...requireTenantAccess(), requireAdminRole, async (req, res) => {
    const { resolution, notes } = req.body || {};
    if (!resolution) {
      return res.status(400).json({ error: "validation_error", message: "resolution is required" });
    }
    const item = await repository.resolveDispute(req.params.id, { resolution, notes, resolvedBy: req.auth.userId || req.auth.sub });
    if (!item) {
      return res.status(404).json({ error: "dispute_not_found" });
    }
    return res.json({ item });
  });

  return app;
}

module.exports = { createApp };

// --- RBAC & Tenant Isolation Pattern ---
// Usage:
//   const { tenantMiddleware, roleMiddleware } = require('@tfx/shared-auth');
//   app.get('/protected', tenantMiddleware(), roleMiddleware(['admin','contractor']), (req, res) => { ... });
//   req.auth.role and req.association.id are available in handlers.

// Example: Protect a route for contractors only, with tenant isolation
// app.get('/contractor/secure-data', auth.tenantMiddleware(), auth.roleMiddleware(['contractor']), (req, res) => {
//   res.json({ message: `Hello contractor ${req.auth.userId} in tenant ${req.association.id}` });
// });

// To enforce tenant isolation everywhere, wrap all protected routes with tenantMiddleware().
// To enforce RBAC, wrap with roleMiddleware(['role1','role2']).

// For multi-tenancy: always filter DB queries by req.association.id.

function randomId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function randomToken() {
  return `reset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const ADMIN_WHATSAPP_DISABLED_MESSAGE =
  "Admin WhatsApp access is disabled. Use the browser or mobile admin workspace with your secret username and admin password.";

function looksLikePhoneNumber(value) {
  return /^\+?\d{9,15}$/.test(String(value || "").trim());
}

async function findUserByIdentifier(repository, identifier) {
  const rawIdentifier = String(identifier || "").trim();
  if (!rawIdentifier) {
    return null;
  }

  if (looksLikePhoneNumber(rawIdentifier)) {
    const byPhone = await repository.getUserByPhoneNumber(normalizePhoneNumber(rawIdentifier));
    if (byPhone) {
      return byPhone;
    }
  }

  const byEmail = await repository.getUserByEmail(rawIdentifier);
  if (byEmail) {
    return byEmail;
  }

  if (typeof repository.getUserByUsername === "function") {
    return repository.getUserByUsername(rawIdentifier);
  }

  return null;
}

function userPayload(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username || null,
    isBootstrapAdmin: Boolean(user.isBootstrapAdmin),
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phoneNumber: user.phoneNumber || null,
    createdAt: user.createdAt,
  };
}

function authPayload(user) {
  return {
    sub: user.id,
    userId: user.id,
    associationId: user.associationId,
    role: user.role,
    professionalId: user.professionalId || null,
    name: `${user.firstName} ${user.lastName}`.trim(),
    trade: user.trade || null,
    tier: user.tier || null,
    rating: user.rating || 4.5,
    completedJobs: user.completedJobs || 0,
    activeQuotes: user.activeQuotes || 0,
    responseTime: user.responseTime || "12 min",
  };
}

function buildContractorProfile(user) {
  return {
    professionalId: user.professionalId || user.id,
    name: `${user.firstName} ${user.lastName}`.trim(),
    trade: user.trade || "general contractor",
    tier: user.tier || "TRUSTED",
    rating: user.rating || 4.5,
    completedJobs: user.completedJobs || 0,
    activeQuotes: user.activeQuotes || 0,
    responseTime: user.responseTime || "12 min",
  };
}

function resolveAssociationIdForRole(role) {
  switch (String(role || "").toLowerCase()) {
    case "client":
    case "customer":
      return "assoc-customer-demo";
    case "association":
    case "professional":
      return "assoc-members-demo";
    case "admin":
      return "assoc-admin-demo";
    case "contractor":
    default:
      return "assoc-contractor-demo";
  }
}

function buildJobSummary(job) {
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
    matchScore: job.matchScore,
    createdAt: job.createdAt,
  };
}

const VALID_ONBOARDING_STAGES = ["welcome", "name", "trade", "experience", "location", "credentials"];
const VALID_ADMIN_ACTIONS = {
  "tier-review": "Tier review queued",
  "compliance-review": "Compliance review opened",
  "dispute-audit": "Dispute audit opened",
};
const VALID_OPERATIONAL_ACTIONS = {
  "member-review": "Member review queued",
  "trade-outreach": "Trade outreach queued",
  "availability-check-in": "Availability check-in recorded",
  "tier-review-request": "Tier review requested",
};

function normalizeCommand(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeAuditLimit(value, fallback = 50) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 200);
}

function buildAdminAuditCsv(items = []) {
  const headers = [
    "id",
    "adminUserId",
    "eventType",
    "outcome",
    "reason",
    "identifier",
    "requestPath",
    "requestMethod",
    "targetUserId",
    "ipAddress",
    "createdAt",
  ];
  const escapeCell = (value) => `"${String(value == null ? "" : value).replace(/"/g, '""')}"`;
  const rows = items.map((item) => headers.map((key) => escapeCell(item[key])).join(","));
  return [headers.join(","), ...rows].join("\n");
}

function summarizeWhatsappSubscription(user) {
  return {
    userId: user.id,
    role: user.role,
    phoneNumber: user.phoneNumber,
    subscribed: Boolean(user.phoneNumber),
    nextStep: user.phoneNumber
      ? `Send HI from ${user.phoneNumber} on WhatsApp to continue onboarding.`
      : "Enter a mobile number to subscribe.",
  };
}

async function handleApplication(repository, req, res, randomizeId) {
  const job = await repository.getJobById(req.params.id);
  if (!job) {
    return res.status(404).json({ error: "job_not_found" });
  }

  const professionalId = req.body?.professionalId || req.auth.professionalId;
  if (!professionalId) {
    return res.status(400).json({ error: "professionalId_required" });
  }

  const application = await repository.createJobApplication({
    id: randomizeId("app"),
    jobId: req.params.id,
    professionalId,
    message: req.body?.message || "",
  });

  await repository.appendContractorEvent({
    id: application.id,
    professionalId,
    jobId: req.params.id,
    type: "interest",
    summary: "Interest sent to homeowner",
    status: "sent",
  });

  return res.status(201).json({ applicationId: application.id, jobId: req.params.id, professionalId });
}

function createApp({ repository, logger, metaWebhookOptions, adminAccessPolicy, getCurrentDate } = {}) {
  if (!repository) {
    throw new Error("repository is required");
  }

  const app = express();
  const log = logger || { info() {}, warn() {}, error() {} };
  const adminPolicy = getAdminAccessPolicy(adminAccessPolicy);
  const resolveCurrentDate = typeof getCurrentDate === "function" ? getCurrentDate : () => new Date();
  const notifier = createPasswordResetNotifier({ logger: log });
  const whatsappAssociation = createWhatsappAssociationService({ repository, logger: log, createId: randomId });
  const whatsappContractor = createWhatsappContractorService({
    repository,
    logger: log,
    createId: randomId,
    createResetToken: randomToken,
    passwordResetNotifier: notifier,
    now: resolveCurrentDate,
  });
  const whatsappProfessional = createWhatsappProfessionalService({ repository, logger: log, createId: randomId });
  const whatsappCustomer = createWhatsappCustomerService({
    repository,
    logger: log,
    createId: randomId,
    createResetToken: randomToken,
    passwordResetNotifier: notifier,
    now: resolveCurrentDate,
  });
  const whatsappAdmin = createWhatsappAdminService({ repository, logger: log, createId: randomId });
  const blockedAdminWhatsappService = {
    async getSession(phoneNumber) {
      return { phoneNumber, linked: false, screen: "blocked", userId: null, disabled: true };
    },
    async handleIncomingMessage({ phoneNumber }) {
      return {
        reply: ADMIN_WHATSAPP_DISABLED_MESSAGE,
        options: [],
        session: { phoneNumber, linked: false, screen: "blocked", userId: null, disabled: true },
      };
    },
  };
  const roleServiceMap = {
    contractor: whatsappContractor,
    client: whatsappCustomer,
    customer: whatsappCustomer,
    association: whatsappAssociation,
    professional: whatsappProfessional,
  };
  const roleChoices = {
    1: "contractor",
    contractor: "contractor",
    2: "client",
    customer: "client",
    client: "client",
    3: "association",
    association: "association",
    4: "professional",
    professional: "professional",
  };
  const metaOnboardingService = {
    async handleIncomingMessage({ phoneNumber, message }) {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const command = normalizeCommand(message);
      if (["admin", "ams"].includes(command)) {
        await repository.upsertWhatsappMetaRouterSession(normalizedPhone, {
          selectedRole: null,
          screen: "role_select",
        });
        return {
          reply: ADMIN_WHATSAPP_DISABLED_MESSAGE,
          options: [],
          session: { phoneNumber: normalizedPhone, linked: false, screen: "blocked", userId: null, disabled: true },
        };
      }
      if (!command || ["hi", "hello", "menu", "start", "reset", "change"].includes(command)) {
        await repository.upsertWhatsappMetaRouterSession(normalizedPhone, {
          selectedRole: null,
          screen: "role_select",
        });
        return {
          reply: [
            "Welcome to TFX Hub WhatsApp.",
            "",
            "Reply with your role:",
            "1. Contractor",
            "2. Customer",
            "3. Association",
            "4. Professional",
          ].join("\n"),
          options: ["1", "2", "3", "4"],
          session: { phoneNumber: normalizedPhone, linked: false, screen: "role_select", userId: null },
        };
      }

      const selectedRole = roleChoices[command];
      if (!selectedRole) {
        return {
          reply:
            "Reply 1 for Contractor, 2 for Customer, 3 for Association, or 4 for Professional. Admin WhatsApp access is disabled.",
          options: ["1", "2", "3", "4"],
          session: { phoneNumber: normalizedPhone, linked: false, screen: "role_select", userId: null },
        };
      }

      await repository.upsertWhatsappMetaRouterSession(normalizedPhone, { selectedRole, screen: "role_selected" });
      return roleServiceMap[selectedRole].handleIncomingMessage({ phoneNumber: normalizedPhone, message: "Hi" });
    },
  };
  async function routeWhatsappService(phoneNumber) {
    const normalized = normalizePhoneNumber(phoneNumber);
    const user = await repository.getUserByPhoneNumber(normalized);
    switch (user?.role) {
      case "client":
        return whatsappCustomer;
      case "admin":
        return blockedAdminWhatsappService;
      case "association":
        return whatsappAssociation;
      case "professional":
        return whatsappProfessional;
      case "contractor":
        return whatsappContractor;
      default: {
        const routerSession = await repository.getWhatsappMetaRouterSession(normalized);
        if (routerSession && routerSession.selectedRole && roleServiceMap[routerSession.selectedRole]) {
          return roleServiceMap[routerSession.selectedRole];
        }
        return metaOnboardingService;
      }
    }
  }
  const metaWebhook = createMetaWhatsAppWebhookAdapter({
    contractorService: whatsappContractor,
    serviceRouter: ({ phoneNumber }) => routeWhatsappService(phoneNumber),
    logger: log,
    ...(metaWebhookOptions || {}),
  });

  app.use(express.json());

  async function recordAdminAuditEvent(event) {
    if (typeof repository.createAdminAuditEvent !== "function") {
      return;
    }

    try {
      await repository.createAdminAuditEvent({
        id: randomId("admin-audit"),
        createdAt: resolveCurrentDate().toISOString(),
        ...event,
      });
    } catch (error) {
      log.warn("admin audit event failed", { message: error.message, eventType: event?.eventType });
    }
  }

  function requestIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) {
      return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || null;
  }

  function getAdminAccessDenial() {
    if (!isAdminWithinAccessWindow(resolveCurrentDate(), adminPolicy)) {
      return {
        error: "admin_access_closed",
        message: createAdminAccessClosedMessage(adminPolicy),
      };
    }

    return null;
  }

  function enforceAdminAccessWindow(req, res, next) {
    if ((req.auth?.role || "").toLowerCase() !== "admin") {
      return next();
    }

    const denial = getAdminAccessDenial();
    if (denial) {
      recordAdminAuditEvent({
        adminUserId: req.auth.userId || req.auth.sub || null,
        eventType: "admin_api_access",
        outcome: "denied",
        reason: denial.error,
        identifier: null,
        requestPath: req.path,
        requestMethod: req.method,
        ipAddress: requestIp(req),
      });
      return res.status(403).json(denial);
    }

    return next();
  }

  function requireAdminRole(req, res, next) {
    if ((req.auth?.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "admin_required" });
    }

    return next();
  }

  function requireTenantAccess() {
    return [tenantMiddleware(), enforceAdminAccessWindow];
  }

  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  app.get("/webhooks/meta/whatsapp", (req, res) => {
    const verification = metaWebhook.verify(req.query || {});
    if (!verification.ok) {
      return res.status(403).send("forbidden");
    }
    return res.status(200).send(verification.challenge);
  });

  app.post("/webhooks/meta/whatsapp", async (req, res) => {
    const item = await metaWebhook.processPayload(req.body || {});
    return res.status(200).json({ ok: true, ...item });
  });

  app.get("/whatsapp/contractor/session/:phoneNumber", async (req, res) => {
    const session = await whatsappContractor.getSession(normalizePhoneNumber(req.params.phoneNumber));
    return res.json({ item: session });
  });

  app.get("/whatsapp/association/session/:phoneNumber", async (req, res) => {
    const session = await whatsappAssociation.getSession(normalizePhoneNumber(req.params.phoneNumber));
    return res.json({ item: session });
  });

  app.post("/whatsapp/association/messages", async (req, res) => {
    const { phoneNumber, message } = req.body || {};
    if (!phoneNumber) {
      return res.status(400).json({ error: "validation_error", message: "phoneNumber is required" });
    }

    const item = await whatsappAssociation.handleIncomingMessage({ phoneNumber, message: message || "" });
    return res.json(item);
  });

  app.post("/whatsapp/contractor/messages", async (req, res) => {
    const { phoneNumber, message } = req.body || {};
    if (!phoneNumber) {
      return res.status(400).json({ error: "validation_error", message: "phoneNumber is required" });
    }

    const item = await whatsappContractor.handleIncomingMessage({ phoneNumber, message: message || "" });
    return res.json(item);
  });

  app.get("/whatsapp/professional/session/:phoneNumber", async (req, res) => {
    const session = await whatsappProfessional.getSession(normalizePhoneNumber(req.params.phoneNumber));
    return res.json({ item: session });
  });

  app.post("/whatsapp/professional/messages", async (req, res) => {
    const { phoneNumber, message } = req.body || {};
    if (!phoneNumber) {
      return res.status(400).json({ error: "validation_error", message: "phoneNumber is required" });
    }

    const item = await whatsappProfessional.handleIncomingMessage({ phoneNumber, message: message || "" });
    return res.json(item);
  });

  app.get("/whatsapp/customer/session/:phoneNumber", async (req, res) => {
    const session = await whatsappCustomer.getSession(normalizePhoneNumber(req.params.phoneNumber));
    return res.json({ item: session });
  });

  app.post("/whatsapp/customer/messages", async (req, res) => {
    const { phoneNumber, message } = req.body || {};
    if (!phoneNumber) {
      return res.status(400).json({ error: "validation_error", message: "phoneNumber is required" });
    }

    const item = await whatsappCustomer.handleIncomingMessage({ phoneNumber, message: message || "" });
    return res.json(item);
  });

  app.get("/whatsapp/admin/session/:phoneNumber", async (req, res) => {
    const session = await blockedAdminWhatsappService.getSession(normalizePhoneNumber(req.params.phoneNumber));
    return res.json({ item: session });
  });

  app.post("/whatsapp/admin/messages", async (req, res) => {
    const { phoneNumber, message } = req.body || {};
    if (!phoneNumber) {
      return res.status(400).json({ error: "validation_error", message: "phoneNumber is required" });
    }

    const item = await blockedAdminWhatsappService.handleIncomingMessage({ phoneNumber, message: message || "" });
    return res.status(403).json({ error: "admin_whatsapp_disabled", message: ADMIN_WHATSAPP_DISABLED_MESSAGE, item });
  });

  app.post("/auth/login", async (req, res) => {
    const { password } = req.body || {};
    const identifier = req.body?.identifier || req.body?.email || req.body?.username || req.body?.phoneNumber;
    if (!identifier || !password) {
      return res.status(400).json({ error: "validation_error", message: "identifier and password are required" });
    }

    const user = await findUserByIdentifier(repository, identifier);
    if (!user) {
      await recordAdminAuditEvent({
        eventType: "admin_login",
        outcome: "denied",
        reason: "invalid_credentials",
        identifier: String(identifier || "").trim(),
        requestPath: req.path,
        requestMethod: req.method,
        ipAddress: requestIp(req),
      });
      return res.status(401).json({ error: "invalid_credentials" });
    }

    if (user.role === "admin" && normalizeUsername(identifier) !== normalizeUsername(user.username)) {
      await recordAdminAuditEvent({
        adminUserId: user.id,
        eventType: "admin_login",
        outcome: "denied",
        reason: "admin_username_required",
        identifier: String(identifier || "").trim(),
        requestPath: req.path,
        requestMethod: req.method,
        ipAddress: requestIp(req),
      });
      return res.status(401).json({ error: "admin_username_required" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      if (user.role === "admin") {
        await recordAdminAuditEvent({
          adminUserId: user.id,
          eventType: "admin_login",
          outcome: "denied",
          reason: "invalid_credentials",
          identifier: String(identifier || "").trim(),
          requestPath: req.path,
          requestMethod: req.method,
          ipAddress: requestIp(req),
        });
      }
      return res.status(401).json({ error: "invalid_credentials" });
    }

    if (user.role === "admin") {
      const denial = getAdminAccessDenial();
      if (denial) {
        await recordAdminAuditEvent({
          adminUserId: user.id,
          eventType: "admin_login",
          outcome: "denied",
          reason: denial.error,
          identifier: String(identifier || "").trim(),
          requestPath: req.path,
          requestMethod: req.method,
          ipAddress: requestIp(req),
        });
        return res.status(403).json(denial);
      }
    }

    const token = auth.signToken(authPayload(user), { expiresIn: "24h" });
    if (user.role === "admin") {
      await recordAdminAuditEvent({
        adminUserId: user.id,
        eventType: "admin_login",
        outcome: "success",
        reason: "authenticated",
        identifier: String(identifier || "").trim(),
        requestPath: req.path,
        requestMethod: req.method,
        ipAddress: requestIp(req),
      });
    }
    return res.json({ token, user: userPayload(user) });
  });

  app.post("/auth/register", async (req, res) => {
    const { email, password, firstName, lastName, role } = req.body || {};
    const username = normalizeUsername(req.body?.username);
    const rawPhoneNumber = String(req.body?.phoneNumber || "").trim();
    const phoneNumber = rawPhoneNumber ? normalizePhoneNumber(rawPhoneNumber) : null;
    if (!email || !password || !firstName || !lastName || !role) {
      return res
        .status(400)
        .json({ error: "validation_error", message: "email, password, firstName, lastName, and role are required" });
    }

    if (rawPhoneNumber && !looksLikePhoneNumber(phoneNumber)) {
      return res
        .status(400)
        .json({ error: "invalid_phone_number", message: "phoneNumber must be a valid international phone number" });
    }

    const existing = await repository.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "email_in_use" });
    }

    if (username && typeof repository.getUserByUsername === "function") {
      const existingUsername = await repository.getUserByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ error: "username_in_use" });
      }
    }

    if (phoneNumber && typeof repository.getUserByPhoneNumber === "function") {
      const existingPhoneNumber = await repository.getUserByPhoneNumber(phoneNumber);
      if (existingPhoneNumber) {
        return res.status(409).json({ error: "phone_number_in_use" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await repository.createUser({
      id: randomId("user"),
      associationId: resolveAssociationIdForRole(role),
      email,
      username,
      passwordHash,
      firstName,
      lastName,
      role,
      professionalId: role === "contractor" ? randomId("pro") : null,
      trade: req.body?.trade || null,
      tier: role === "contractor" ? "ONBOARDED" : null,
      rating: role === "contractor" ? 0 : null,
      completedJobs: 0,
      activeQuotes: 0,
      responseTime: "N/A",
      phoneNumber,
    });

    const token = auth.signToken(authPayload(user), { expiresIn: "24h" });
    return res.status(201).json({ token, user: userPayload(user) });
  });

  app.post("/auth/password-reset/request", async (req, res) => {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "validation_error", message: "email is required" });
    }

    const user = await repository.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    if (user.role === "admin" && user.isBootstrapAdmin) {
      await recordAdminAuditEvent({
        adminUserId: user.id,
        eventType: "admin_password_reset_request",
        outcome: "denied",
        reason: "bootstrap_admin_reset_forbidden",
        identifier: user.email,
        requestPath: req.path,
        requestMethod: req.method,
        targetUserId: user.id,
        ipAddress: requestIp(req),
      });
      return res.status(403).json({
        error: "bootstrap_admin_reset_forbidden",
        message: "Bootstrap admin reset must be handled out-of-band.",
      });
    }

    const entry = await repository.createPasswordResetToken({
      token: randomToken(),
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    const delivery = await notifier.sendPasswordReset({
      email: user.email,
      token: entry.token,
      expiresAt: entry.expiresAt,
    });

    return res.json({ ok: true, resetToken: delivery.resetToken, expiresAt: entry.expiresAt, delivery });
  });

  app.post("/auth/password-reset/confirm", async (req, res) => {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: "validation_error", message: "token and password are required" });
    }

    const entry = await repository.getPasswordResetToken(token);
    if (!entry) {
      return res.status(404).json({ error: "reset_token_not_found" });
    }
    if (entry.consumedAt) {
      return res.status(409).json({ error: "reset_token_consumed" });
    }
    if (new Date(entry.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: "reset_token_expired" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await repository.updateUserPassword(entry.userId, passwordHash);
    await repository.consumePasswordResetToken(token);

    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    return res.json({ ok: true, user: userPayload(user) });
  });

  app.get("/admin/accounts", ...requireTenantAccess(), requireAdminRole, async (req, res) => {
    const items = typeof repository.listAdminUsers === "function" ? await repository.listAdminUsers() : [];

    await recordAdminAuditEvent({
      adminUserId: req.auth.userId || req.auth.sub,
      eventType: "admin_accounts_list",
      outcome: "success",
      reason: "listed_accounts",
      requestPath: req.path,
      requestMethod: req.method,
      ipAddress: requestIp(req),
    });

    return res.json({
      items: items.map(userPayload),
      meta: { associationId: req.association.id, requester: req.auth.sub },
    });
  });

  app.post("/admin/accounts", ...requireTenantAccess(), requireAdminRole, async (req, res) => {
    const { email, password, firstName, lastName } = req.body || {};
    const username = normalizeUsername(req.body?.username);
    if (!email || !password || !firstName || !lastName || !username) {
      return res.status(400).json({
        error: "validation_error",
        message: "email, username, password, firstName, and lastName are required",
      });
    }

    const existing = await repository.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "email_in_use" });
    }

    if (typeof repository.getUserByUsername === "function") {
      const existingUsername = await repository.getUserByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ error: "username_in_use" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const item = await repository.createUser({
      id: randomId("user"),
      associationId: req.association.id,
      email,
      username,
      passwordHash,
      isBootstrapAdmin: false,
      firstName,
      lastName,
      role: "admin",
      professionalId: null,
      trade: null,
      tier: null,
      rating: null,
      completedJobs: 0,
      activeQuotes: 0,
      responseTime: null,
      phoneNumber: null,
    });

    await recordAdminAuditEvent({
      adminUserId: req.auth.userId || req.auth.sub,
      eventType: "admin_account_create",
      outcome: "success",
      reason: "created_admin_account",
      requestPath: req.path,
      requestMethod: req.method,
      targetUserId: item.id,
      ipAddress: requestIp(req),
    });

    return res
      .status(201)
      .json({ item: userPayload(item), meta: { associationId: req.association.id, requester: req.auth.sub } });
  });

  app.post("/admin/accounts/:id/rotate-credentials", ...requireTenantAccess(), requireAdminRole, async (req, res) => {
    const target = await repository.getUserById(req.params.id);
    if (!target || target.role !== "admin") {
      return res.status(404).json({ error: "admin_user_not_found" });
    }
    if (target.isBootstrapAdmin) {
      await recordAdminAuditEvent({
        adminUserId: req.auth.userId || req.auth.sub,
        eventType: "admin_credentials_rotate",
        outcome: "denied",
        reason: "bootstrap_admin_rotation_forbidden",
        requestPath: req.path,
        requestMethod: req.method,
        targetUserId: target.id,
        ipAddress: requestIp(req),
      });
      return res.status(403).json({
        error: "bootstrap_admin_rotation_forbidden",
        message: "Bootstrap admin credentials must be rotated out-of-band.",
      });
    }

    const updates = {};
    if (typeof req.body?.email !== "undefined") {
      const email = String(req.body.email || "").trim();
      if (!email) {
        return res.status(400).json({ error: "validation_error", message: "email must not be empty" });
      }
      const existing = await repository.getUserByEmail(email);
      if (existing && existing.id !== target.id) {
        return res.status(409).json({ error: "email_in_use" });
      }
      updates.email = email;
    }
    if (typeof req.body?.username !== "undefined") {
      const username = normalizeUsername(req.body.username);
      if (!username) {
        return res.status(400).json({ error: "validation_error", message: "username must not be empty" });
      }
      if (typeof repository.getUserByUsername === "function") {
        const existingUsername = await repository.getUserByUsername(username);
        if (existingUsername && existingUsername.id !== target.id) {
          return res.status(409).json({ error: "username_in_use" });
        }
      }
      updates.username = username;
    }
    if (typeof req.body?.password !== "undefined") {
      if (!String(req.body.password || "").trim()) {
        return res.status(400).json({ error: "validation_error", message: "password must not be empty" });
      }
      updates.passwordHash = await bcrypt.hash(req.body.password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "validation_error", message: "email, username, or password is required" });
    }

    const item =
      typeof repository.updateAdminUserCredentials === "function"
        ? await repository.updateAdminUserCredentials(target.id, updates)
        : null;
    if (!item) {
      return res.status(404).json({ error: "admin_user_not_found" });
    }

    await recordAdminAuditEvent({
      adminUserId: req.auth.userId || req.auth.sub,
      eventType: "admin_credentials_rotate",
      outcome: "success",
      reason: "rotated_admin_credentials",
      requestPath: req.path,
      requestMethod: req.method,
      targetUserId: item.id,
      ipAddress: requestIp(req),
    });

    return res.json({ item: userPayload(item), meta: { associationId: req.association.id, requester: req.auth.sub } });
  });

  app.post(
    "/admin/accounts/:id/password-reset-request",
    ...requireTenantAccess(),
    requireAdminRole,
    async (req, res) => {
      const target = await repository.getUserById(req.params.id);
      if (!target || target.role !== "admin") {
        return res.status(404).json({ error: "admin_user_not_found" });
      }
      if (target.isBootstrapAdmin) {
        await recordAdminAuditEvent({
          adminUserId: req.auth.userId || req.auth.sub,
          eventType: "admin_password_reset_request",
          outcome: "denied",
          reason: "bootstrap_admin_reset_forbidden",
          requestPath: req.path,
          requestMethod: req.method,
          targetUserId: target.id,
          ipAddress: requestIp(req),
        });
        return res.status(403).json({
          error: "bootstrap_admin_reset_forbidden",
          message: "Bootstrap admin reset must be handled out-of-band.",
        });
      }

      const entry = await repository.createPasswordResetToken({
        token: randomToken(),
        userId: target.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      const delivery = await notifier.sendPasswordReset({
        email: target.email,
        token: entry.token,
        expiresAt: entry.expiresAt,
      });

      await recordAdminAuditEvent({
        adminUserId: req.auth.userId || req.auth.sub,
        eventType: "admin_password_reset_request",
        outcome: "success",
        reason: "issued_password_reset",
        requestPath: req.path,
        requestMethod: req.method,
        targetUserId: target.id,
        ipAddress: requestIp(req),
      });

      return res.json({
        ok: true,
        targetUserId: target.id,
        expiresAt: entry.expiresAt,
        resetToken: delivery.resetToken,
        delivery,
      });
    },
  );

  app.get("/admin/audit-events", ...requireTenantAccess(), requireAdminRole, async (req, res) => {
    const items =
      typeof repository.listAdminAuditEvents === "function"
        ? await repository.listAdminAuditEvents({
            adminUserId: req.query.adminUserId || undefined,
            eventType: req.query.eventType || undefined,
            outcome: req.query.outcome || undefined,
            targetUserId: req.query.targetUserId || undefined,
            limit: normalizeAuditLimit(req.query.limit),
          })
        : [];

    if (String(req.query.format || "").toLowerCase() === "csv") {
      res.setHeader("content-type", "text/csv; charset=utf-8");
      res.setHeader("content-disposition", 'attachment; filename="admin-audit-events.csv"');
      return res.status(200).send(buildAdminAuditCsv(items));
    }

    return res.json({ items, meta: { associationId: req.association.id, requester: req.auth.sub } });
  });

  app.get("/user", ...requireTenantAccess(), async (req, res) => {
    const user = await repository.getUserById(req.auth.userId || req.auth.sub);
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    return res.json(userPayload(user));
  });

  app.post("/user/whatsapp-subscription", ...requireTenantAccess(), async (req, res) => {
    if ((req.auth.role || "").toLowerCase() === "admin") {
      return res.status(403).json({ error: "admin_whatsapp_disabled", message: ADMIN_WHATSAPP_DISABLED_MESSAGE });
    }

    const phoneNumber = normalizePhoneNumber(req.body?.phoneNumber);
    if (!phoneNumber) {
      return res.status(400).json({ error: "validation_error", message: "phoneNumber is required" });
    }

    const user = await repository.updateUserPhoneNumber(req.auth.userId || req.auth.sub, phoneNumber);
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }
    await repository.clearWhatsappMetaRouterSession(phoneNumber);
    return res.json({
      item: summarizeWhatsappSubscription(user),
      meta: { associationId: req.association.id, requester: req.auth.sub },
    });
  });

  app.get("/user/shortlist", ...requireTenantAccess(), async (req, res) => {
    const items =
      typeof repository.listCustomerShortlist === "function"
        ? await repository.listCustomerShortlist(req.auth.userId || req.auth.sub)
        : [];
    return res.json({ items, meta: { associationId: req.association.id, requester: req.auth.sub } });
  });

  app.post("/user/shortlist/:professionalId", ...requireTenantAccess(), async (req, res) => {
    const professional = await repository.getProfessionalById(req.params.professionalId);
    if (!professional) {
      return res.status(404).json({ error: "professional_not_found" });
    }

    if (typeof repository.addCustomerShortlistItem === "function") {
      await repository.addCustomerShortlistItem(req.auth.userId || req.auth.sub, professional.id);
    }

    const items =
      typeof repository.listCustomerShortlist === "function"
        ? await repository.listCustomerShortlist(req.auth.userId || req.auth.sub)
        : [professional.id];
    return res
      .status(201)
      .json({ shortlisted: true, items, meta: { associationId: req.association.id, requester: req.auth.sub } });
  });

  app.delete("/user/shortlist/:professionalId", ...requireTenantAccess(), async (req, res) => {
    const professional = await repository.getProfessionalById(req.params.professionalId);
    if (!professional) {
      return res.status(404).json({ error: "professional_not_found" });
    }

    if (typeof repository.removeCustomerShortlistItem === "function") {
      await repository.removeCustomerShortlistItem(req.auth.userId || req.auth.sub, professional.id);
    }

    const items =
      typeof repository.listCustomerShortlist === "function"
        ? await repository.listCustomerShortlist(req.auth.userId || req.auth.sub)
        : [];
    return res.json({
      shortlisted: false,
      items,
      meta: { associationId: req.association.id, requester: req.auth.sub },
    });
  });

  app.get(["/jobs", "/orders"], ...requireTenantAccess(), async (req, res) => {
    const items = await repository.listJobs({
      status: req.query.status || undefined,
      trade: req.query.trade || undefined,
    });

    if (req.path === "/orders") {
      return res.json({
        data: items.map((job) => ({
          id: job.id,
          title: job.title,
          description: job.description,
          trade: job.trade,
          status: String(job.status || "").toLowerCase(),
          budget: job.budget,
          location: job.location,
          createdAt: job.createdAt,
        })),
        pagination: { page: 1, limit: items.length, total: items.length },
      });
    }

    return res.json({
      items: items.map(buildJobSummary),
      meta: { associationId: req.association.id, requester: req.auth.sub },
    });
  });

  app.get("/professionals", ...requireTenantAccess(), async (req, res) => {
    const items = await repository.listProfessionals({ trade: req.query.trade || undefined });
    return res.json({ items, meta: { associationId: req.association.id, requester: req.auth.sub } });
  });

  app.get("/professionals/:id", ...requireTenantAccess(), async (req, res) => {
    const item = await repository.getProfessionalById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "professional_not_found" });
    }
    return res.json({ item, meta: { associationId: req.association.id, requester: req.auth.sub } });
  });

  app.get("/professionals/:id/admin-actions", ...requireTenantAccess(), async (req, res) => {
    const item = await repository.getProfessionalById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "professional_not_found" });
    }

    const items = await repository.listAdminActions(req.params.id);
    return res.json({ items, meta: { associationId: req.association.id, requester: req.auth.sub } });
  });

  app.post("/professionals/:id/admin-actions/:actionType", ...requireTenantAccess(), async (req, res) => {
    const professional = await repository.getProfessionalById(req.params.id);
    if (!professional) {
      return res.status(404).json({ error: "professional_not_found" });
    }

    // Allow cross-association admin actions for admins
    const isAdmin = (req.auth?.role || '').toLowerCase() === 'admin';
    if (!isAdmin && professional.associationId && professional.associationId !== req.association.id) {
      return res.status(403).json({ error: "forbidden_cross_association" });
    }

    const actionType = req.params.actionType;
    if (!VALID_ADMIN_ACTIONS[actionType]) {
      return res.status(400).json({ error: "invalid_action_type" });
    }

    const item = await repository.createAdminAction({
      id: randomId("admin-action"),
      professionalId: req.params.id,
      actionType,
      summary: req.body?.summary || VALID_ADMIN_ACTIONS[actionType],
      note: req.body?.note || "",
      createdBy: req.auth.userId || req.auth.sub,
    });

    return res.status(201).json({ item, meta: { associationId: req.association.id, requester: req.auth.sub } });
  });

  app.get("/professionals/:id/operational-actions", ...requireTenantAccess(), async (req, res) => {
    const item = await repository.getProfessionalById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "professional_not_found" });
    }

    const items = await repository.listOperationalActions(req.params.id);
    return res.json({ items, meta: { associationId: req.association.id, requester: req.auth.sub } });
  });

  app.post("/professionals/:id/operational-actions/:actionType", ...requireTenantAccess(), async (req, res) => {
    const professional = await repository.getProfessionalById(req.params.id);
    if (!professional) {
      return res.status(404).json({ error: "professional_not_found" });
    }

    const actionType = req.params.actionType;
    if (!VALID_OPERATIONAL_ACTIONS[actionType]) {
      return res.status(400).json({ error: "invalid_action_type" });
    }

    const item = await repository.createOperationalAction({
      id: randomId("operational-action"),
      professionalId: req.params.id,
      actionType,
      summary: req.body?.summary || VALID_OPERATIONAL_ACTIONS[actionType],
      note: req.body?.note || "",
      createdBy: req.auth.userId || req.auth.sub,
    });

    return res.status(201).json({ item, meta: { associationId: req.association.id, requester: req.auth.sub } });
  });

  app.get(["/jobs/:id", "/orders/:id"], ...requireTenantAccess(), async (req, res) => {
    const job = await repository.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "job_not_found" });
    }

    if (req.path.startsWith("/orders/")) {
      return res.json({
        id: job.id,
        title: job.title,
        description: job.description,
        status: String(job.status || "").toLowerCase(),
        budget: job.budget,
        homeownerId: job.clientId,
        contractor: null,
        applications: [],
      });
    }

    return res.json({ item: buildJobSummary(job), meta: { associationId: req.association.id } });
  });

  app.post(["/jobs", "/orders"], ...requireTenantAccess(), async (req, res) => {
    const body = req.body || {};
    if (!body.trade || !body.description) {
      return res.status(400).json({ error: "validation_error", message: "trade and description are required" });
    }

    const job = await repository.createJob({
      id: randomId("job"),
      title: body.title || `${body.trade} job`,
      description: body.description,
      trade: body.trade,
      status: "OPEN",
      budget: body.budget || "Budget to be confirmed",
      location: body.location || "TBC",
      urgency: body.urgency || "Flexible",
      posted: "Just now",
      leadType: body.leadType || "Verified homeowner",
      matchScore: body.matchScore || 75,
      clientId: req.auth.userId || req.auth.sub,
    });

    if (req.path === "/orders") {
      return res.status(201).json({ id: job.id, status: "open", createdAt: job.createdAt });
    }

    return res.status(201).json({ item: buildJobSummary(job) });
  });

  app.post("/jobs/:id/applications", ...requireTenantAccess(), async (req, res) => {
    return handleApplication(repository, req, res, randomId);
  });

  app.post("/orders/:id/apply", ...requireTenantAccess(), async (req, res) => {
    req.body = { ...(req.body || {}), professionalId: req.auth.professionalId || req.auth.userId || req.auth.sub };
    return handleApplication(repository, req, res, randomId);
  });

  app.get("/contractor/profile", ...requireTenantAccess(), async (req, res) => {
    const user = await repository.getUserById(req.auth.userId || req.auth.sub);
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }
    return res.json({ item: buildContractorProfile(user) });
  });

  app.get("/contractor/history", ...requireTenantAccess(), async (req, res) => {
    const professionalId = req.auth.professionalId || req.auth.userId || req.auth.sub;
    const items = await repository.getContractorHistory(professionalId);
    return res.json({ items });
  });

  app.post("/contractor/quotes", ...requireTenantAccess(), async (req, res) => {
    const { jobId, amount, timeline, note } = req.body || {};
    if (!jobId || !amount) {
      return res.status(400).json({ error: "validation_error", message: "jobId and amount are required" });
    }

    const job = await repository.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ error: "job_not_found" });
    }

    const item = await repository.appendContractorEvent({
      id: randomId("quote"),
      professionalId: req.auth.professionalId || req.auth.userId || req.auth.sub,
      jobId,
      type: "quote",
      summary: `Quote ${amount}${timeline ? ` · ${timeline}` : ""}`,
      status: "sent",
      note: note || "",
    });

    return res.status(201).json({ item });
  });

  app.post("/contractor/messages", ...requireTenantAccess(), async (req, res) => {
    const { jobId, body } = req.body || {};
    if (!jobId || !body) {
      return res.status(400).json({ error: "validation_error", message: "jobId and body are required" });
    }

    const job = await repository.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ error: "job_not_found" });
    }

    const item = await repository.appendContractorEvent({
      id: randomId("msg"),
      professionalId: req.auth.professionalId || req.auth.userId || req.auth.sub,
      jobId,
      type: "message",
      summary: body,
      status: "sent",
    });

    return res.status(201).json({ item });
  });

    // --- Scheduling & Calendar Sync Endpoints ---
    // Contractor: Create availability slot
    app.post("/contractor/availability", ...requireTenantAccess(), async (req, res) => {
      const { startTime, endTime, status, source, externalEventId } = req.body || {};
      if (!startTime || !endTime) {
        return res.status(400).json({ error: "validation_error", message: "startTime and endTime are required" });
      }
      const slot = await repository.createAvailability({
        id: randomId("avail"),
        professionalId: req.auth.professionalId || req.auth.userId || req.auth.sub,
        startTime,
        endTime,
        status,
        source,
        externalEventId
      });
      return res.status(201).json({ item: slot });
    });

    // Contractor: List availability slots
    app.get("/contractor/availability", ...requireTenantAccess(), async (req, res) => {
      const professionalId = req.auth.professionalId || req.auth.userId || req.auth.sub;
      const { from, to } = req.query;
      const items = await repository.listAvailability(professionalId, { from, to });
      return res.json({ items });
    });

    // Contractor: Update availability slot
    app.patch("/contractor/availability/:id", ...requireTenantAccess(), async (req, res) => {
      const updates = req.body || {};
      const item = await repository.updateAvailability(req.params.id, updates);
      if (!item) {
        return res.status(404).json({ error: "availability_not_found" });
      }
      return res.json({ item });
    });

    // Client: Book a slot
    app.post("/bookings", ...requireTenantAccess(), async (req, res) => {
      const { contractorId, availabilityId } = req.body || {};
      if (!contractorId || !availabilityId) {
        return res.status(400).json({ error: "validation_error", message: "contractorId and availabilityId are required" });
      }
      const booking = await repository.createBooking({
        id: randomId("booking"),
        contractorId,
        clientId: req.auth.userId || req.auth.sub,
        availabilityId,
        status: 'pending'
      });
      return res.status(201).json({ item: booking });
    });

    // Contractor: List bookings
    app.get("/contractor/bookings", ...requireTenantAccess(), async (req, res) => {
      const contractorId = req.auth.professionalId || req.auth.userId || req.auth.sub;
      const { status } = req.query;
      const items = await repository.listBookings(contractorId, { status });
      return res.json({ items });
    });

    // Contractor: Update booking status
    app.patch("/bookings/:id", ...requireTenantAccess(), async (req, res) => {
      const updates = req.body || {};
      const item = await repository.updateBooking(req.params.id, updates);
      if (!item) {
        return res.status(404).json({ error: "booking_not_found" });
      }
      return res.json({ item });
    });

    // Calendar sync: Upsert token
    app.post("/calendar-sync/:provider", ...requireTenantAccess(), async (req, res) => {
      const { accessToken, refreshToken, expiresAt } = req.body || {};
      const provider = req.params.provider;
      if (!accessToken || !provider) {
        return res.status(400).json({ error: "validation_error", message: "provider and accessToken are required" });
      }
      const token = await repository.upsertCalendarSyncToken({
        id: randomId("sync"),
        professionalId: req.auth.professionalId || req.auth.userId || req.auth.sub,
        provider,
        accessToken,
        refreshToken,
        expiresAt
      });
      return res.status(201).json({ item: token });
    });

    // Calendar sync: Get token
    app.get("/calendar-sync/:provider", ...requireTenantAccess(), async (req, res) => {
      const provider = req.params.provider;
      const token = await repository.getCalendarSyncToken(req.auth.professionalId || req.auth.userId || req.auth.sub, provider);
      if (!token) {
        return res.status(404).json({ error: "sync_token_not_found" });
      }
      return res.json({ item: token });
    });

  app.get("/onboarding/status", ...requireTenantAccess(), async (req, res) => {
    const status = await repository.getOnboardingStatus(req.auth.userId || req.auth.sub);
    return res.json(status);
  });

  app.post("/onboarding/:stage", ...requireTenantAccess(), async (req, res) => {
    const stage = req.params.stage;
    if (!VALID_ONBOARDING_STAGES.includes(stage)) {
      return res.status(400).json({ error: "invalid_stage" });
    }
    const status = await repository.submitOnboardingStage(req.auth.userId || req.auth.sub, stage);
    return res.json({ ok: true, stage, completedStages: status.completedStages });
  });

  app.use((error, req, res, next) => {
    log.error("api request failed", { message: error.message });
    res.status(500).json({ error: "internal_error", message: error.message });
  });

  return app;
}

module.exports = {
  createApp,
};
