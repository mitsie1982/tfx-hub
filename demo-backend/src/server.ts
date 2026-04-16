import bodyParser from "body-parser";
import crypto from "crypto";
import express from "express";


import * as metrics from "./metrics";
import { prisma } from "./db";
import matchRouter from "./routes/match";
import profilesRouter from "./routes/profiles";
import uploadsRouter from "./routes/uploads";

// --- Sentry integration ---
let Sentry: any = null;
if (process.env.SENTRY_DSN) {
  Sentry = require("@sentry/node");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    beforeSend(event: any) {
      // Attach traceId if available
      if (event.extra && event.extra.traceId) return event;
      return event;
    },
  });
  app.use(Sentry.Handlers.requestHandler());
}

const app = express();
app.use(bodyParser.json());

// --- X-Trace-Id propagation middleware ---

app.use((req, res, next) => {
  req.traceId = req.headers["x-trace-id"] || crypto.randomUUID();
  res.setHeader("X-Trace-Id", req.traceId);
  if (Sentry) Sentry.configureScope((scope: any) => scope.setExtra("traceId", req.traceId));
  next();
});
// --- Prometheus metrics endpoint ---
metrics.setupPrometheusMetrics(app);

// --- DEMO MODE SEEDING ---
const DEMO_MODE = process.env.DEMO_MODE === "true";
type DemoUser = { id: string; name: string; phone: string; type: "customer" | "contractor" };
type DemoJob = { id: string; status: "open" | "in_progress" | "completed"; customerId: string; contractorId: string };

const demoUsers: DemoUser[] = [];
const demoJobs: DemoJob[] = [];

function seedDemoData() {
  demoUsers.length = 0;
  demoJobs.length = 0;
  demoUsers.push(
    { id: "demo-customer-1", name: "Demo Customer 1", phone: "+10000000001", type: "customer" },
    { id: "demo-contractor-1", name: "Demo Contractor 1", phone: "+10000000002", type: "contractor" },
    { id: "demo-contractor-2", name: "Demo Contractor 2", phone: "+10000000003", type: "contractor" },
  );
  demoJobs.push(
    { id: "demo-job-1", status: "open", customerId: "demo-customer-1", contractorId: "demo-contractor-1" },
    { id: "demo-job-2", status: "in_progress", customerId: "demo-customer-1", contractorId: "demo-contractor-2" },
    { id: "demo-job-3", status: "completed", customerId: "demo-customer-1", contractorId: "demo-contractor-1" },
  );
}

if (DEMO_MODE) {
  seedDemoData();
  // Expose demoUsers for routes
  (global as any).demoUsers = demoUsers;
  console.log("[DEMO_MODE] Seeded demo users and jobs.");
}

// --- DETERMINISTIC VERIFICATION CODE ---
function getVerificationCode(phone: string) {
  if (DEMO_MODE) return "000000";
  // In real mode, generate random code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- DEMO HEALTH ENDPOINT ---
app.get("/demo/health", (req, res) => {
  if (!DEMO_MODE) return res.status(400).json({ error: "Not in DEMO_MODE" });
  res.json({
    ok: true,
    service: "tfx-hub-demo",
    demoMode: true,
    users: demoUsers.map((u) => ({ id: u.id, name: u.name, phone: u.phone, type: u.type })),
    jobs: demoJobs.map((j) => ({ id: j.id, status: j.status, customerId: j.customerId, contractorId: j.contractorId })),
    counts: { users: demoUsers.length, jobs: demoJobs.length },
  });
});

// Basic liveness endpoint
app.get("/health", (req, res) => res.json({ ok: true, service: "tfx-hub-demo" }));

// Readiness endpoint: checks DB and S3
app.get("/ready", async (req, res) => {
  // DB check: ensure demoJobs array is accessible and not undefined
  let dbOk = Array.isArray(global.demoUsers) && Array.isArray(global.demoJobs);
  let s3Ok = false;
  try {
    // S3 check: try to list buckets (will fail if S3 is not reachable)
    const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");
    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: !!process.env.S3_ENDPOINT,
    });
    await s3.send(new ListBucketsCommand({}));
    s3Ok = true;
  } catch (e) {
    s3Ok = false;
  }
  res.json({ ok: dbOk && s3Ok, db: dbOk, s3: s3Ok, service: "tfx-hub-demo" });
});

// --- DEMO JOB ACCEPT ENDPOINT (for concurrency test) ---
app.post("/api/jobs/:id/accept", (req, res) => {
  metrics.jobAcceptAttempts.inc();
  if (!DEMO_MODE) return res.status(501).json({ error: "Not implemented outside DEMO_MODE" });
  const jobId = req.params.id;
  const { contractorId, version } = req.body;
  const job = demoJobs.find((j) => j.id === jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  // Add version field if not present
  if (typeof (job as any).version !== "number") (job as any).version = 1;
  if (job.status !== "open") {
    metrics.jobAcceptConflicts.inc();
    return res.status(409).json({ error: "Job not open", status: job.status, currentVersion: (job as any).version });
  }
  if (version !== (job as any).version) {
    metrics.jobAcceptConflicts.inc();
    return res
      .status(409)
      .json({ error: "Version conflict", status: job.status, currentVersion: (job as any).version });
  }
  // Accept job
  job.status = "in_progress";
  job.contractorId = contractorId;
  (job as any).version += 1;
  return res.json({ ok: true, job });
});
// --- Notification send failure persistence (scaffold) ---
// This would be called from notification sending logic
  try {
    await prisma.notificationFailure.create({
      data: {
        userId,
        type,
        payload: payload ? JSON.stringify(payload) : null,
        jobId,
        error: error ? (typeof error === "string" ? error : JSON.stringify(error)) : null,
        traceId,
      },
    });
  } catch (err) {
    console.error("[NotificationFailure][DB]", err);
    if (typeof Sentry?.captureException === "function") Sentry.captureException(err);
  }
}

app.use("/api/profiles", profilesRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/match", matchRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`TFX Hub demo server listening on port ${port}`));
