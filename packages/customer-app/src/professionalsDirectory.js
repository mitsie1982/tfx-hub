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
    },

    async listShortlist() {
      const result = await professionalsApi.listShortlist();
      return result.items || [];
    },

    async addToShortlist(professionalId) {
      const result = await professionalsApi.addToShortlist(professionalId);
      return Boolean(result.shortlisted);
    },

    async removeFromShortlist(professionalId) {
      const result = await professionalsApi.removeFromShortlist(professionalId);
      return Boolean(result.shortlisted);
    }
  };
}

module.exports = { createProfessionalsDirectory };
