/*
 packages/members-app/src/index.js
 Members app entry point - composes shared logic with association and professional workspaces.
*/
'use strict';

const { createSharedLogicClient, auth } = require('@tfx/shared-logic');
const { signToken } = require('../../shared-auth/src');
const { createAssociationWorkspace } = require('./associationWorkspace');
const { createProfessionalWorkspace } = require('./professionalWorkspace');

function createMembersApp(options = {}) {
  const { context = {}, ...apiOptions } = options;
  const client = createSharedLogicClient({ ...apiOptions, context });
  return {
    auth,
    association: createAssociationWorkspace(client.jobs, client.professionals),
    professionals: createProfessionalWorkspace(client.professionals, client.session)
  };
}

module.exports = { createMembersApp };

if (require.main === module) {
  const app = createMembersApp({
    baseURL: process.env.API_BASE_URL || 'http://localhost:5005',
    getToken: async () => signToken({ sub: 'demo', associationId: 'assoc-demo' }),
    context: { associationId: 'assoc-demo', platform: 'android', appVersion: '1.0.0' }
  });
  console.log('Members app ready. Workspaces available:', Object.keys(app));
}
