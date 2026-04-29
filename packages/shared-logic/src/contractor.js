const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');

function createContractorApi(client, context = {}) {
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
    async getProfile() {
      const response = await client.get('/contractor/profile', withContext());
      return response.data;
    },

    async listLeadHistory() {
      const response = await client.get('/contractor/history', withContext());
      return response.data;
    },

    async submitQuote(jobId, quote) {
      if (!jobId) throw new Error('jobId is required');
      if (!quote || !quote.amount) throw new Error('quote.amount is required');

      const response = await client.post('/contractor/quotes', { jobId, ...quote }, withContext());
      return response.data;
    },

    async sendMessage(jobId, message) {
      if (!jobId) throw new Error('jobId is required');
      if (!message || !message.body) throw new Error('message.body is required');

      const response = await client.post('/contractor/messages', { jobId, ...message }, withContext());
      return response.data;
    }
  };
}

module.exports = {
  createContractorApi
};
