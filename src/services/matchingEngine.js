// src/services/matchingEngine.js
// Enterprise Matching Engine Service (Step 1)
// - Ranks professionals for a job using a tunable scoring model
// - Will support feedback loop and model tuning

const fs = require('fs');
const path = require('path');

const DEFAULT_WEIGHTS = {
  skill: 1.0,
  location: 0.8,
  tier: 1.2,
  rating: 1.5,
  completedJobs: 1.0,
  availability: 0.7
};

function getCurrentWeights() {
  const configPath = path.join(__dirname, 'matchingWeights.json');
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      return DEFAULT_WEIGHTS;
    }
  }
  return DEFAULT_WEIGHTS;
}

function scoreProfessional(pro, job, weights = getCurrentWeights()) {
  let score = 0;
  if (pro.trade === job.trade) score += weights.skill * 1;
  if (pro.location === job.location) score += weights.location * 1;
  if (pro.tier === 'PREMIUM') score += weights.tier * 1;
  score += weights.rating * (pro.rating || 0) / 5;
  score += weights.completedJobs * Math.min(pro.completedJobs || 0, 100) / 100;
  return score;
}

function rankProfessionals(professionals, job, weights = getCurrentWeights()) {
  return professionals
    .map(pro => ({ ...pro, matchScore: scoreProfessional(pro, job, weights) }))
    .sort((a, b) => b.matchScore - a.matchScore);
}

module.exports = {
  scoreProfessional,
  rankProfessionals,
  getCurrentWeights,
  DEFAULT_WEIGHTS
};
