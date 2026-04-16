
// src/health_endpoints.js
// Health check and metrics endpoints for monitoring integration

import express from 'express';
import * as prometheus from 'prom-client';
const router = express.Router();
const register = new prometheus.Registry();

// --- Sprint 5: Job/Dispute Metrics ---
const jobCreated = new prometheus.Counter({
  name: 'job_created_total',
  help: 'Total jobs created',
  labelNames: ['source'],
  registers: [register]
});

const disputeCreated = new prometheus.Counter({
  name: 'dispute_created_total',
  help: 'Total disputes created',
  labelNames: ['source'],
  registers: [register]
});

const disputeResolved = new prometheus.Counter({
  name: 'dispute_resolved_total',
  help: 'Total disputes resolved',
  labelNames: ['source'],
  registers: [register]
});

// Standard metrics (CPU, memory, GC events)
prometheus.collectDefaultMetrics({ register });

// Custom application metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const appStartTime = new prometheus.Gauge({
  name: 'process_uptime_seconds',
  help: 'Application uptime in seconds',
  registers: [register]
});

const dbQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['query_type'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1],
  registers: [register]
});

const mobileUnhandledExceptions = new prometheus.Counter({
  name: 'mobile_unhandled_exceptions_total',
  help: 'Total unhandled exceptions from mobile apps',
  labelNames: ['app', 'platform'],
  registers: [register]
});

const mobileCrashes = new prometheus.Counter({
  name: 'mobile_crashes_total',
  help: 'Total crashes from mobile apps',
  labelNames: ['app', 'platform', 'canary'],
  registers: [register]
});

const mobileActiveSessions = new prometheus.Counter({
  name: 'mobile_active_sessions_total',
  help: 'Total active sessions from mobile apps',
  labelNames: ['app', 'platform', 'canary'],
  registers: [register]
});

const checkoutStarted = new prometheus.Counter({
  name: 'checkout_started_total',
  help: 'Total checkout flows initiated',
  labelNames: ['app'],
  registers: [register]
});

const checkoutCompleted = new prometheus.Counter({
  name: 'checkout_completed_total',
  help: 'Total successful checkouts',
  labelNames: ['app'],
  registers: [register]
});

const jobSubmitted = new prometheus.Counter({
  name: 'job_submitted_total',
  help: 'Total job submissions',
  labelNames: ['app'],
  registers: [register]
});

// Liveness probe (just running?)
router.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness probe (can handle traffic?)
router.get('/health/ready', (req, res) => {
  // Add DB connection check here
  const isReady = true;
  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json({
    status: isReady ? 'ready' : 'not-ready',
    timestamp: new Date().toISOString(),
    dependencies: {
      database: 'ok',
      cache: 'ok'
    }
  });
});

// Metrics endpoint for Prometheus scraping
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Middleware to instrument requests
const instrumentRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
};

// Update uptime gauge periodically
setInterval(() => {
  appStartTime.set(process.uptime());
}, 10000);

export {
  router,
  register,
  httpRequestDuration,
  httpRequestsTotal,
  dbQueryDuration,
  mobileUnhandledExceptions,
  mobileCrashes,
  mobileActiveSessions,
  checkoutStarted,
  checkoutCompleted,
  jobSubmitted,
  jobCreated,
  disputeCreated,
  disputeResolved,
  instrumentRequest
};
