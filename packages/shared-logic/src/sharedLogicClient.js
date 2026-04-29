/*
 packages/shared-logic/src/sharedLogicClient.js
 Composes the base API client with domain-specific helpers.
*/
const auth = require('./auth');
const { createAdminApi } = require('./admin');
const { createApiClient } = require('./apiClient');
const { createContractorApi } = require('./contractor');
const { createJobsApi } = require('./jobs');
const { createOnboardingApi } = require('./onboarding');
const { createProfessionalsApi } = require('./professionals');
const { createSessionApi } = require('./session');
const { createWhatsappAssociationApi } = require('./whatsappAssociation');
const { createWhatsappAdminApi } = require('./whatsappAdmin');
const { createWhatsappContractorApi } = require('./whatsappContractor');
const { createWhatsappCustomerApi } = require('./whatsappCustomer');
const { createWhatsappProfessionalApi } = require('./whatsappProfessional');

function createSharedLogicClient(options = {}) {
  const { context = {}, ...apiOptions } = options;
  const api = createApiClient({
    ...apiOptions,
    getToken: apiOptions.getToken || (async () => auth.tokenStore.get())
  });

  return {
    api,
    admin: createAdminApi(api, context),
    contractor: createContractorApi(api, context),
    jobs: createJobsApi(api, context),
    onboarding: createOnboardingApi(api, context),
    professionals: createProfessionalsApi(api, context),
    session: createSessionApi(api, context),
    whatsappAssociation: createWhatsappAssociationApi(api, context),
    whatsappAdmin: createWhatsappAdminApi(api, context),
    whatsappContractor: createWhatsappContractorApi(api, context),
    whatsappCustomer: createWhatsappCustomerApi(api, context),
    whatsappProfessional: createWhatsappProfessionalApi(api, context)
  };
}

module.exports = {
  createSharedLogicClient
};
