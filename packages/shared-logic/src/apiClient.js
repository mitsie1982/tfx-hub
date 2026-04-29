/*
 packages/shared-logic/src/apiClient.js
 Axios wrapper with token attachment and 401 handling.
*/
const axios = require('axios');

function createApiClient({ baseURL, getToken, onUnauthorized } = {}) {
  const client = axios.create({ baseURL, timeout: 15000 });

  client.interceptors.request.use(async (config) => {
    try {
      if (typeof getToken === 'function') {
        const token = await getToken();
        if (token) {
          config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
        }
      }
    } catch (e) {
      // ignore token retrieval errors
    }
    return config;
  }, (err) => Promise.reject(err));

  client.interceptors.response.use((res) => res, async (err) => {
    if (err && err.response && err.response.status === 401 && typeof onUnauthorized === 'function') {
      try { await onUnauthorized(err); } catch (e) { /* swallow */ }
    }
    return Promise.reject(err);
  });

  return client;
}

module.exports = { createApiClient };
