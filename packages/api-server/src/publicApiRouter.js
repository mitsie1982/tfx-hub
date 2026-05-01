// Public API router for third-party integrations
const express = require('express');
const { rateLimiter } = require('./rateLimiter');
const { requireApiKey } = require('./publicApiAuth');
const { getReputationScore } = require('./blockchainReputation');

function createPublicApiRouter(repository) {
  const router = express.Router();
  router.use(requireApiKey, rateLimiter);

  // Public user profile (limited fields)
  router.get('/user/:userId', async (req, res) => {
    const user = await repository.getUserById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, name: user.firstName + ' ' + user.lastName, role: user.role });
  });

  // Public blockchain reputation
  router.get('/reputation/:userId', async (req, res) => {
    try {
      const score = await getReputationScore(req.params.userId);
      res.json({ userId: req.params.userId, score });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch reputation', details: err.message });
    }
  });

  return router;
}

module.exports = { createPublicApiRouter };
