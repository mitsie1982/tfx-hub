// services/backend/src/routes/reputation_routes.js
// API endpoints to record and read reputation. In production, enforce auth, rate limits and validation.

const express = require('express');
const router = express.Router();
const { recordReputation, getReputationCount } = require('../onchain/reputation_client');

// Record reputation (server-side action; requires Org Admin approval)
router.post('/reputation/record', async (req, res) => {
  const { memberAddress, organisationId, score, metadataHash } = req.body;
  if (!memberAddress || organisationId === undefined || score === undefined) return res.status(400).json({ error: 'Missing fields' });
  try {
    const receipt = await recordReputation(memberAddress, organisationId, score, metadataHash || '');
    return res.json({ success: true, txHash: receipt.transactionHash });
  } catch (err) {
    console.error('Onchain record error', err);
    return res.status(500).json({ error: 'Onchain write failed' });
  }
});

// Get reputation count
router.get('/reputation/count/:member', async (req, res) => {
  const member = req.params.member;
  try {
    const count = await getReputationCount(member);
    return res.json({ member, count: count.toString() });
  } catch (err) {
    console.error('Onchain read error', err);
    return res.status(500).json({ error: 'Onchain read failed' });
  }
});

module.exports = router;
