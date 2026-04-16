// src/scripts/tuneMatchingModel.js
// Step 5: Model Tuning Script (admin/manual trigger)
// This script will retrain or adjust the ranking model weights using feedback data

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const { DEFAULT_WEIGHTS } = require('../services/matchingEngine');

async function tuneModel() {
  // Fetch feedback data
  const feedbacks = await prisma.match_feedback.findMany();
  if (!feedbacks.length) {
    console.log('No feedback data available.');
    return;
  }

  // Example: Simple weight tuning based on average ratings (expand with ML as needed)
  let newWeights = { ...DEFAULT_WEIGHTS };
  const avgClientRating = feedbacks.reduce((sum, f) => sum + (f.client_rating || 0), 0) / feedbacks.length;
  if (avgClientRating < 3) {
    newWeights.rating += 0.5; // Boost rating weight if average is low
  } else if (avgClientRating > 4.5) {
    newWeights.rating -= 0.2; // Decrease if always high
  }
  // Add more sophisticated tuning logic as needed

  // Save new weights to a config file
  const configPath = path.join(__dirname, '../services/matchingWeights.json');
  fs.writeFileSync(configPath, JSON.stringify(newWeights, null, 2));
  console.log('Model weights updated:', newWeights);
}

tuneModel().then(() => process.exit(0));
