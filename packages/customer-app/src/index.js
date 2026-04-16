/*
 packages/customer-app/src/index.js
 Customer app entry point — composes shared-logic with customer workspaces.
*/
'use strict';

const { createSharedLogicClient, auth } = require('@tfx/shared-logic');
const { signToken } = require('../../shared-auth/src');
const { createAccountWorkspace } = require('./accountWorkspace');
const { createJobsWorkspace } = require('./jobsWorkspace');
const { createProfessionalsDirectory } = require('./professionalsDirectory');

function createCustomerApp(options = {}) {
  const { context = {}, ...apiOptions } = options;
  const client = createSharedLogicClient({ ...apiOptions, context });

  return {
    auth,
    account: createAccountWorkspace(client.session),
    jobs: createJobsWorkspace(client.jobs),
    professionals: createProfessionalsDirectory(client.professionals)
  };
}

module.exports = { createCustomerApp };

if (require.main === module) {
  const app = createCustomerApp({
    baseURL: process.env.API_BASE_URL || 'http://localhost:5005',
    getToken: async () => signToken({ sub: 'demo', associationId: 'assoc-demo' }),
    context: { associationId: 'assoc-demo', platform: 'android', appVersion: '1.0.0' }
  });
  console.log('Customer app ready. Workspaces available:', Object.keys(app));
}
