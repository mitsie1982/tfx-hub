// developer_portal/sdk/node/index.js
// Minimal sample SDK for TFX Hub Public API (Node).
const fetch = require('node-fetch');

class TfxHubClient {
  constructor({ baseUrl, apiKey }) {
    this.baseUrl = baseUrl || 'https://api.example.com';
    this.apiKey = apiKey;
  }

  async listTasks(organisationId) {
    const res = await fetch(`${this.baseUrl}/api/tasks?organisationId=${organisationId}`, {
      headers: { 'X-API-Key': this.apiKey, 'Accept': 'application/json' }
    });
    return res.json();
  }
}

module.exports = TfxHubClient;
