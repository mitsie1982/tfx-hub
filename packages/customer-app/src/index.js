/*
 packages/customer-app/src/index.js
 Customer app entry point - placeholder.
*/
'use strict';

const { createSharedLogicClient, auth } = require('@tfx/shared-logic');

function createCustomerApp(options = {}) {
  const { context = {}, ...apiOptions } = options;
  const client = createSharedLogicClient({ ...apiOptions, context });
  return { auth, client };
}

module.exports = { createCustomerApp };

if (require.main === module) {
  const app = createCustomerApp({
    baseURL: process.env.API_BASE_URL || 'http://localhost:5005',
    getToken: async () => auth.signToken({ sub: 'demo', associationId: 'assoc-demo' }),
    context: { associationId: 'assoc-demo', platform: 'android', appVersion: '1.0.0' }
  });
  console.log('Customer app ready. Keys:', Object.keys(app));
}
