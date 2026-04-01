/*
 tests/shared-logic/integration/server.js
 Minimal express server to validate shared-logic auth and directory helpers.
*/
const express = require('express');
const { verifyToken } = require('../../../packages/shared-logic/src/auth');

const app = express();
const professionals = [
  { id: 'pro-001', name: 'John Smit', trade: 'plumber', tier: 'PREMIUM' },
  { id: 'pro-002', name: 'Sarah Khubone', trade: 'builder', tier: 'VERIFIED' }
];
const jobs = [
  { id: 'job-001', trade: 'plumber', description: 'Fix kitchen pipes', status: 'OPEN', clientId: 'client-001' },
  { id: 'job-002', trade: 'builder', description: 'Build garden wall', status: 'OPEN', clientId: 'client-002' }
];
const onboardingState = {};

app.use(express.json());

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'missing_token' });
  }

  try {
    req.auth = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

app.get('/ping', (req, res) => res.json({ ok: true }));

app.get('/protected', requireAuth, (req, res) => {
  res.json({ ok: true, payload: req.auth });
});

app.get('/professionals', requireAuth, (req, res) => {
  const associationId = req.headers['x-association-id'];
  const trade = req.query.trade;
  const items = professionals.filter((professional) => !trade || professional.trade === trade);

  if (!associationId) {
    return res.status(400).json({ error: 'missing_association_id' });
  }

  return res.json({
    items,
    meta: {
      associationId,
      requester: req.auth.sub
    }
  });
});

app.get('/professionals/:id', requireAuth, (req, res) => {
  const associationId = req.headers['x-association-id'];
  const item = professionals.find((professional) => professional.id === req.params.id);

  if (!associationId) {
    return res.status(400).json({ error: 'missing_association_id' });
  }

  if (!item) {
    return res.status(404).json({ error: 'professional_not_found' });
  }

  return res.json({
    item,
    meta: {
      associationId,
      requester: req.auth.sub
    }
  });
});

app.get('/jobs', requireAuth, (req, res) => {
  const associationId = req.headers['x-association-id'];
  if (!associationId) return res.status(400).json({ error: 'missing_association_id' });
  const trade = req.query.trade;
  const status = req.query.status;
  const items = jobs.filter((job) => {
    if (trade && job.trade !== trade) return false;
    if (status && job.status !== status) return false;
    return true;
  });
  return res.json({ items, meta: { associationId, requester: req.auth.sub } });
});

app.get('/jobs/:id', requireAuth, (req, res) => {
  const associationId = req.headers['x-association-id'];
  if (!associationId) return res.status(400).json({ error: 'missing_association_id' });
  const item = jobs.find((job) => job.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'job_not_found' });
  return res.json({ item, meta: { associationId } });
});

app.post('/jobs', requireAuth, (req, res) => {
  const associationId = req.headers['x-association-id'];
  if (!associationId) return res.status(400).json({ error: 'missing_association_id' });
  if (!req.body || !req.body.trade) return res.status(400).json({ error: 'trade_required' });
  const newJob = { id: `job-${Date.now()}`, ...req.body, status: 'OPEN', clientId: req.auth.sub };
  jobs.push(newJob);
  return res.status(201).json({ item: newJob });
});

app.post('/jobs/:id/applications', requireAuth, (req, res) => {
  const job = jobs.find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'job_not_found' });
  if (!req.body || !req.body.professionalId) return res.status(400).json({ error: 'professionalId_required' });
  return res.status(201).json({ applicationId: `app-${Date.now()}`, jobId: req.params.id, professionalId: req.body.professionalId });
});

app.get('/onboarding/status', requireAuth, (req, res) => {
  const sub = req.auth.sub;
  const state = onboardingState[sub] || { completedStages: [] };
  return res.json({ completedStages: state.completedStages });
});

app.post('/onboarding/:stage', requireAuth, (req, res) => {
  const validStages = ['welcome', 'name', 'trade', 'experience', 'location', 'credentials'];
  const { stage } = req.params;
  if (!validStages.includes(stage)) return res.status(400).json({ error: 'invalid_stage' });
  const sub = req.auth.sub;
  if (!onboardingState[sub]) onboardingState[sub] = { completedStages: [] };
  if (!onboardingState[sub].completedStages.includes(stage)) {
    onboardingState[sub].completedStages.push(stage);
  }
  return res.json({ ok: true, stage, completedStages: onboardingState[sub].completedStages });
});

if (require.main === module) {
  const port = process.env.PORT || 5005;
  app.listen(port, () => console.log('Integration server listening on', port));
}

module.exports = app;
