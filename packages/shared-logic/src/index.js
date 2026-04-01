const { createApiClient } = require('./apiClient');
const auth = require('./auth');
const { createJobsApi, JOB_STATUS } = require('./jobs');
const { createOnboardingApi, ONBOARDING_STAGES } = require('./onboarding');
const { createProfessionalsApi } = require('./professionals');
const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');
const { createSharedLogicClient } = require('./sharedLogicClient');

module.exports = {
  auth,
  buildAssociationHeaders,
  createApiClient,
  createJobsApi,
  createOnboardingApi,
  createProfessionalsApi,
  createSharedLogicClient,
  JOB_STATUS,
  mergeHeaders,
  ONBOARDING_STAGES
};
