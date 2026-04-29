const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');

function createAdminApi(client, context = {}) {
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
    async listAccounts() {
      const response = await client.get('/admin/accounts', withContext());
      return response.data;
    },

    async createAccount(payload = {}) {
      const response = await client.post('/admin/accounts', payload, withContext());
      return response.data;
    },

    async rotateCredentials(adminUserId, payload = {}) {
      if (!adminUserId) {
        throw new Error('adminUserId is required');
      }
      const response = await client.post(`/admin/accounts/${encodeURIComponent(adminUserId)}/rotate-credentials`, payload, withContext());
      return response.data;
    },

    async requestPasswordReset(adminUserId) {
      if (!adminUserId) {
        throw new Error('adminUserId is required');
      }
      const response = await client.post(`/admin/accounts/${encodeURIComponent(adminUserId)}/password-reset-request`, {}, withContext());
      return response.data;
    },

    async listAuditEvents(filters = {}) {
      const response = await client.get('/admin/audit-events', withContext({ params: filters }));
      return response.data;
    },

    async exportAuditEvents(filters = {}) {
      const response = await client.get('/admin/audit-events', withContext({
        params: { ...filters, format: 'csv' },
        responseType: 'text'
      }));
      return typeof response.data === 'string' ? response.data : '';
    }
  };
}

module.exports = {
  createAdminApi
};
