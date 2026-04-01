/*
 packages/contractor-app/src/profileView.js
 Contractor profile view backed by the shared-logic professionals API.
*/

function createProfileView(professionalsApi) {
  if (!professionalsApi || typeof professionalsApi.getProfessional !== 'function') {
    throw new Error('A professionals API helper is required');
  }

  return {
    async getProfile(professionalId) {
      const result = await professionalsApi.getProfessional(professionalId);
      return result.item || null;
    },

    formatTierLabel(tier) {
      const labels = {
        PREMIUM: 'Premium Partner',
        VERIFIED: 'Verified Professional',
        TRUSTED: 'Trusted Contractor',
        ONBOARDED: 'New Contractor'
      };
      return labels[tier] || tier || 'Unknown';
    }
  };
}

module.exports = { createProfileView };
