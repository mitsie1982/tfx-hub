/*
 packages/ams-app/src/index.js
 AMS app entry point - placeholder.
*/
'use strict';

const { createSharedLogicClient, auth } = require('@tfx/shared-logic');

function createAMSApp(options = {}) {
  const { context = {}, ...apiOptions } = options;
  const client = createSharedLogicClient({ ...apiOptions, context });
  return { auth, client };
}

module.exports = { createAMSApp };

if (require.main === module) {
  const app = createAMSApp({
    baseURL: process.env.API_BASE_URL || 'http://localhost:5005',
    getToken: async () => auth.signToken({ sub: 'demo', associationId: 'assoc-demo' }),
    context: { associationId: 'assoc-demo', platform: 'android', appVersion: '1.0.0' }
  });
  console.log('AMS app ready. Keys:', Object.keys(app));
}
