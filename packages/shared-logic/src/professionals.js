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
    }
  };
}

module.exports = {
  createProfessionalsApi
};
