/*
 packages/ams-app/src/contractorDirectory.js
 Admin-facing contractor directory helpers.
*/

function createContractorDirectory(professionalsApi) {
  if (!professionalsApi || typeof professionalsApi.listProfessionals !== 'function') {
    throw new Error('A professionals API helper is required');
  }

  return {
    async list(filters = {}) {
      const result = await professionalsApi.listProfessionals(filters);
      return result.items || result;
    },

    async getContractor(professionalId) {
      const result = await professionalsApi.getProfessional(professionalId);
      return result.item || null;
    },

    async listAdminActions(professionalId) {
      const result = await professionalsApi.listAdminActions(professionalId);
      return result.items || result;
    },

    async runAdminAction(professionalId, actionType, payload = {}) {
      const result = await professionalsApi.runAdminAction(professionalId, actionType, payload);
      return result.item || result;
    }
  };
}

module.exports = { createContractorDirectory };
