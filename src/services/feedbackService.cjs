// src/services/feedbackService.cjs
// Step 3: Feedback Collection Integration
// Handles storing feedback after job completion

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recordMatchFeedback({ jobId, professionalId, clientId, matchScore, outcome, clientRating, professionalRating, feedbackText }) {
  return prisma.match_feedback.create({
    data: {
      job_id: jobId,
      professional_id: professionalId,
      client_id: clientId,
      match_score: matchScore,
      outcome,
      client_rating: clientRating,
      professional_rating: professionalRating,
      feedback_text: feedbackText
    }
  });
}

module.exports = {
  recordMatchFeedback
};
