/*
 packages/members-app/src/index.js
 Members app entry point - placeholder.
*/
'use strict';

const { createSharedLogicClient, auth } = require('@tfx/shared-logic');

function createMembersApp(options = {}) {
  const { context = {}, ...apiOptions } = options;
  const client = createSharedLogicClient({ ...apiOptions, context });
  return { auth, client };
}

module.exports = { createMembersApp };

if (require.main === module) {
  const app = createMembersApp({
    baseURL: process.env.API_BASE_URL || 'http://localhost:5005',
    getToken: async () => auth.signToken({ sub: 'demo', associationId: 'assoc-demo' }),
    context: { associationId: 'assoc-demo', platform: 'android', appVersion: '1.0.0' }
  });
  console.log('Members app ready. Keys:', Object.keys(app));
}
