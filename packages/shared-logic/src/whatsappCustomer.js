'use strict';

const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');

function createWhatsappCustomerApi(client, context = {}) {
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
    async getSession(phoneNumber) {
      if (!phoneNumber) {
        throw new Error('phoneNumber is required');
      }
      const response = await client.get(`/whatsapp/customer/session/${encodeURIComponent(phoneNumber)}`, withContext());
      return response.data;
    },
    async sendMessage(phoneNumber, message) {
      if (!phoneNumber) {
        throw new Error('phoneNumber is required');
      }
      const response = await client.post('/whatsapp/customer/messages', { phoneNumber, message }, withContext());
      return response.data;
    }
  };
}

module.exports = { createWhatsappCustomerApi };