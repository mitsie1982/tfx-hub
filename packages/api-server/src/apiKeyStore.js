// Simple file-based API key store (replace with DB in prod)
const fs = require('fs');
const path = require('path');
const storePath = path.join(__dirname, 'api_keys.json');

function saveApiKey(email, apiKey) {
  let data = {};
  if (fs.existsSync(storePath)) {
    data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  }
  data[email] = apiKey;
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
}

function getApiKey(email) {
  if (!fs.existsSync(storePath)) return null;
  const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  return data[email] || null;
}

module.exports = { saveApiKey, getApiKey };
