const { createApiClient } = require('./apiClient');
const { createAdminApi } = require('./admin');
const auth = require('./auth');
const { createContractorApi } = require('./contractor');
const { createJobsApi, JOB_STATUS } = require('./jobs');
const { createOnboardingApi, ONBOARDING_STAGES } = require('./onboarding');
const { createProfessionalsApi } = require('./professionals');
const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');
const { createSessionApi } = require('./session');
const { createSharedLogicClient } = require('./sharedLogicClient');
const { cloneDemoSeed, getHumanFacingDemoSeed } = require('./demoSeed');
const { createWhatsappAssociationApi } = require('./whatsappAssociation');
const { createWhatsappAdminApi } = require('./whatsappAdmin');
const { createWhatsappContractorApi } = require('./whatsappContractor');
const { createWhatsappCustomerApi } = require('./whatsappCustomer');
const { createWhatsappProfessionalApi } = require('./whatsappProfessional');

module.exports = {
  auth,
  buildAssociationHeaders,
  cloneDemoSeed,
  createApiClient,
  createAdminApi,
  createContractorApi,
  createJobsApi,
  createOnboardingApi,
  createProfessionalsApi,
  createSessionApi,
  createSharedLogicClient,
  getHumanFacingDemoSeed,
  createWhatsappAssociationApi,
  createWhatsappAdminApi,
  createWhatsappContractorApi,
  createWhatsappCustomerApi,
  createWhatsappProfessionalApi,
  JOB_STATUS,
  mergeHeaders,
  ONBOARDING_STAGES
};
