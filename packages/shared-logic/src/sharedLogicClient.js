/*
 packages/shared-logic/src/sharedLogicClient.js
 Composes the base API client with domain-specific helpers.
*/
const { createApiClient } = require('./apiClient');
const { createJobsApi } = require('./jobs');
const { createOnboardingApi } = require('./onboarding');
const { createProfessionalsApi } = require('./professionals');

function createSharedLogicClient(options = {}) {
  const { context = {}, ...apiOptions } = options;
  const api = createApiClient(apiOptions);

  return {
    api,
    jobs: createJobsApi(api, context),
    onboarding: createOnboardingApi(api, context),
    professionals: createProfessionalsApi(api, context)
  };
}

module.exports = {
  createSharedLogicClient
};
