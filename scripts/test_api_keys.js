// scripts/test_api_keys.js
// Minimal test for API key registration and rotation endpoints
const axios = require('axios');
const assert = require('assert');

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

async function run() {
  // Register app
  const regRes = await axios.post(baseUrl + '/developer/register', { name: 'TestApp', ownerEmail: 'test@example.com' });
  assert(regRes.data.appId && regRes.data.apiKey, 'Registration failed');
  const { appId, apiKey } = regRes.data;
  // Rotate key
  const rotRes = await axios.post(baseUrl + `/developer/${appId}/rotate`);
  assert(rotRes.data.apiKey && rotRes.data.apiKey !== apiKey, 'Rotation failed');
  // List apps
  const listRes = await axios.get(baseUrl + '/developer/apps');
  assert(listRes.data.apps && listRes.data.apps[appId], 'List apps failed');
  console.log('API key registration/rotation test passed');
}

run().catch(e => { console.error(e); process.exit(1); });
