/*
 packages/customer-app/src/professionalsDirectory.js
 Customer-facing professional directory helpers.
*/

function createProfessionalsDirectory(professionalsApi) {
  if (!professionalsApi || typeof professionalsApi.listProfessionals !== 'function') {
    throw new Error('A professionals API helper is required');
  }

  return {
    async browse(filters = {}) {
      const result = await professionalsApi.listProfessionals(filters);
      return result.items || result;
    },

    async getProfile(professionalId) {
      const result = await professionalsApi.getProfessional(professionalId);
      return result.item || null;
    }
  };
}

module.exports = { createProfessionalsDirectory };