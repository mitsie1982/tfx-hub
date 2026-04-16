// nlpMatcher.js
// Prototype: Extract trade, location, and service type from free-text using OpenAI API (or similar)
const axios = require('axios');

async function extractJobDetails(text) {
  // Replace with your OpenAI/Azure endpoint and key
  const apiKey = process.env.OPENAI_API_KEY;
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  const prompt = `Extract the following from this client request: trade, location, service type.\nRequest: "${text}"\nFormat: {\"trade\":...,\"location\":...,\"serviceType\":...}`;

  const response = await axios.post(endpoint, {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 60,
    temperature: 0
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  // Parse the JSON from the model's response
  const match = response.data.choices[0].message.content.match(/\{.*\}/s);
  if (!match) throw new Error('No structured output');
  return JSON.parse(match[0]);
}

module.exports = { extractJobDetails };
