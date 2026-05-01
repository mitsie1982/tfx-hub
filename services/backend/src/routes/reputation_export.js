// services/backend/src/routes/reputation_export.js
// Assemble a portable reputation record for a member (off-chain JSON with on-chain references).
const express = require('express');
const router = express.Router();
const { getReputationCount } = require('../onchain/reputation_client');

router.get('/reputation/export/:member', async (req, res) => {
  const member = req.params.member;
  try {
    const count = await getReputationCount(member);
    // Placeholder: fetch on-chain events and assemble JSON; here we return a minimal record
    const record = { member, onchainEventCount: count.toString(), exportedAt: new Date().toISOString() };
    res.setHeader('Content-Disposition', `attachment; filename="${member}_reputation.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(record, null, 2));
  } catch (err) {
    console.error('Export error', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
