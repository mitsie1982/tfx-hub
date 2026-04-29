/*
 packages/shared-logic/src/professionals.js
 Shared API helpers for professional directory queries.
*/
const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');

function createProfessionalsApi(client, context = {}) {
  if (!client || typeof client.get !== 'function') {
    throw new Error('A compatible API client is required');
  }

  function withContext(config = {}) {
    return {
      ...config,
      headers: mergeHeaders(buildAssociationHeaders(context), config.headers)
    };
  }

  return {
    async listProfessionals(filters = {}) {
      const response = await client.get('/professionals', withContext({ params: filters }));
      return response.data;
    },

    async getProfessional(professionalId) {
      if (!professionalId) {
        throw new Error('professionalId is required');
      }

      const response = await client.get(`/professionals/${encodeURIComponent(professionalId)}`, withContext());
      return response.data;
    },

    async listShortlist() {
      const response = await client.get('/user/shortlist', withContext());
      return response.data;
    },

    async addToShortlist(professionalId) {
      if (!professionalId) {
        throw new Error('professionalId is required');
      }

      const response = await client.post(`/user/shortlist/${encodeURIComponent(professionalId)}`, {}, withContext());
      return response.data;
    },

    async removeFromShortlist(professionalId) {
      if (!professionalId) {
        throw new Error('professionalId is required');
      }

      const response = await client.delete(`/user/shortlist/${encodeURIComponent(professionalId)}`, withContext());
      return response.data;
    },

    async listAdminActions(professionalId) {
      if (!professionalId) {
        throw new Error('professionalId is required');
      }

      const response = await client.get(`/professionals/${encodeURIComponent(professionalId)}/admin-actions`, withContext());
      return response.data;
    },

    async runAdminAction(professionalId, actionType, payload = {}) {
      if (!professionalId) {
        throw new Error('professionalId is required');
      }
      if (!actionType) {
        throw new Error('actionType is required');
      }

      const response = await client.post(`/professionals/${encodeURIComponent(professionalId)}/admin-actions/${encodeURIComponent(actionType)}`, payload, withContext());
      return response.data;
    },

    async listOperationalActions(professionalId) {
      if (!professionalId) {
        throw new Error('professionalId is required');
      }

      const response = await client.get(`/professionals/${encodeURIComponent(professionalId)}/operational-actions`, withContext());
      return response.data;
    },

    async runOperationalAction(professionalId, actionType, payload = {}) {
      if (!professionalId) {
        throw new Error('professionalId is required');
      }
      if (!actionType) {
        throw new Error('actionType is required');
      }

      const response = await client.post(`/professionals/${encodeURIComponent(professionalId)}/operational-actions/${encodeURIComponent(actionType)}`, payload, withContext());
      return response.data;
    }
  };
}

module.exports = {
  createProfessionalsApi
};
