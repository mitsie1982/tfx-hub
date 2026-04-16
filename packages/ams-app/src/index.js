/*
 packages/ams-app/src/index.js
 AMS app entry point — composes shared-logic with admin workspaces.
*/
'use strict';

const { createSharedLogicClient, auth } = require('@tfx/shared-logic');
const { signToken } = require('../../shared-auth/src');
const { createAccountWorkspace } = require('./accountWorkspace');
const { createAdminWorkspace } = require('./adminWorkspace');
const { createContractorDirectory } = require('./contractorDirectory');
const { createOperationsDashboard } = require('./operationsDashboard');

function createAMSApp(options = {}) {
  const { context = {}, ...apiOptions } = options;
  const client = createSharedLogicClient({ ...apiOptions, context });

  return {
    auth,
    account: createAccountWorkspace(client.session),
    admin: createAdminWorkspace(client.admin),
    contractors: createContractorDirectory(client.professionals),
    operations: createOperationsDashboard(client.jobs, client.professionals)
  };
}

module.exports = { createAMSApp };

if (require.main === module) {
  const app = createAMSApp({
    baseURL: process.env.API_BASE_URL || 'http://localhost:5005',
    getToken: async () => signToken({ sub: 'demo', associationId: 'assoc-demo' }),
    context: { associationId: 'assoc-demo', platform: 'android', appVersion: '1.0.0' }
  });
  console.log('AMS app ready. Workspaces available:', Object.keys(app));
}
