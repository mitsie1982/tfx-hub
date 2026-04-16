// endpoint: POST /api/smart-match
// Receives { requestText: string }, returns ranked contractor matches
const express = require('express');
const { extractJobDetails } = require('../../packages/shared-logic/src/nlpMatcher');
const { createProfessionalsApi } = require('../../packages/shared-logic/src/professionals');
const { createContractorDirectory } = require('./contractorDirectory');
const router = express.Router();

// Assume you have a configured API client for professionals
const professionalsApi = createProfessionalsApi(/* pass your API client here */);
const contractorDirectory = createContractorDirectory(professionalsApi);

router.post('/api/smart-match', async (req, res) => {
  try {
    const { requestText } = req.body;
    if (!requestText) return res.status(400).json({ error: 'Missing requestText' });
    // 1. NLP extraction
    const { trade, location, serviceType } = await extractJobDetails(requestText);
    // 2. Search contractors with extracted filters
    const matches = await contractorDirectory.list({ trade, location, serviceType });
    // 3. Optionally, sort/rank by rating, distance, etc.
    const ranked = matches.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    res.json({ matches: ranked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
