/*
 packages/contractor-app/src/index.js
 Contractor app entry point — composes shared-logic with app-specific views.
*/
const { createSharedLogicClient, auth } = require('@tfx/shared-logic');
const { createJobsView } = require('./jobsView');
const { createOnboardingFlow } = require('./onboardingFlow');
const { createProfileView } = require('./profileView');

function createContractorApp(options = {}) {
  const { context = {}, ...apiOptions } = options;
  const client = createSharedLogicClient({ ...apiOptions, context });

  return {
    auth,
    jobs: createJobsView(client.jobs),
    onboarding: createOnboardingFlow(client.onboarding),
    profile: createProfileView(client.professionals)
  };
}

module.exports = { createContractorApp };

if (require.main === module) {
  const app = createContractorApp({
    baseURL: process.env.API_BASE_URL || 'http://localhost:5005',
    getToken: async () => auth.signToken({ sub: 'demo', associationId: 'assoc-demo' }),
    context: { associationId: 'assoc-demo', platform: 'android', appVersion: '1.0.0' }
  });
  console.log('Contractor app ready. Views available:', Object.keys(app));
}
