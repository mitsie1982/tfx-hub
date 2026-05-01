// API key approval and revocation
const fs = require('fs');
const path = require('path');
const storePath = path.join(__dirname, 'api_keys.json');

function listApiKeys() {
  if (!fs.existsSync(storePath)) return {};
  return JSON.parse(fs.readFileSync(storePath, 'utf8'));
}

function approveApiKey(email) {
  let data = listApiKeys();
  if (!data[email]) return false;
  data[email + ':approved'] = true;
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
  return true;
}

function revokeApiKey(email) {
  let data = listApiKeys();
  delete data[email];
  delete data[email + ':approved'];
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
}

function isApiKeyApproved(email) {
  let data = listApiKeys();
  return !!data[email + ':approved'];
}

module.exports = { listApiKeys, approveApiKey, revokeApiKey, isApiKeyApproved };
