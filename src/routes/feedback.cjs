// src/routes/feedback.cjs
// Step 3: Feedback API Route (for job completion)

const express = require('express');
const router = express.Router();
const { recordMatchFeedback } = require('../services/feedbackService.cjs');

// POST /api/feedback
router.post('/', async (req, res) => {
  try {
    const { jobId, professionalId, clientId, matchScore, outcome, clientRating, professionalRating, feedbackText } = req.body;
    if (!jobId || !professionalId || !clientId) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }
    const feedback = await recordMatchFeedback({ jobId, professionalId, clientId, matchScore, outcome, clientRating, professionalRating, feedbackText });
    res.status(201).json({ feedback });
  } catch (err) {
    res.status(500).json({ error: 'feedback_save_failed', details: err.message });
  }
});

module.exports = router;
