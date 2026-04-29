const auth = require('./auth');
const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');

function createSessionApi(client, context = {}) {
  if (!client || typeof client.get !== 'function' || typeof client.post !== 'function') {
    throw new Error('A compatible API client is required');
  }

  function withContext(config = {}) {
    return {
      ...config,
      headers: mergeHeaders(buildAssociationHeaders(context), config.headers)
    };
  }

  return {
    async login(credentials = {}) {
      const identifier = credentials.identifier || credentials.email || credentials.username || credentials.phoneNumber;
      if (!identifier) {
        throw new Error('credentials.identifier is required');
      }
      if (!credentials.password) {
        throw new Error('credentials.password is required');
      }

      const response = await client.post('/auth/login', { ...credentials, identifier }, withContext());
      if (response.data && response.data.token) {
        auth.tokenStore.set(response.data.token);
      }
      return response.data;
    },

    async register(payload = {}) {
      if (!payload.email) {
        throw new Error('payload.email is required');
      }
      if (!payload.password) {
        throw new Error('payload.password is required');
      }
      const response = await client.post('/auth/register', payload, withContext());
      if (response.data && response.data.token) {
        auth.tokenStore.set(response.data.token);
      }
      return response.data;
    },

    async requestPasswordReset(payload = {}) {
      if (!payload.email) {
        throw new Error('payload.email is required');
      }
      const response = await client.post('/auth/password-reset/request', payload, withContext());
      return response.data;
    },

    async confirmPasswordReset(payload = {}) {
      if (!payload.token) {
        throw new Error('payload.token is required');
      }
      if (!payload.password) {
        throw new Error('payload.password is required');
      }
      const response = await client.post('/auth/password-reset/confirm', payload, withContext());
      return response.data;
    },

    async getCurrentUser() {
      const response = await client.get('/user', withContext());
      return response.data;
    },

    async subscribeWhatsapp(phoneNumber) {
      if (!phoneNumber) {
        throw new Error('phoneNumber is required');
      }
      const response = await client.post('/user/whatsapp-subscription', { phoneNumber }, withContext());
      return response.data;
    }
  };
}

module.exports = {
  createSessionApi
};
