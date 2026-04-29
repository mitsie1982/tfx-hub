'use strict';

function createProfessionalWorkspace(professionalsApi, sessionApi) {
  if (!professionalsApi || typeof professionalsApi.listProfessionals !== 'function') {
    throw new Error('A professionals API helper is required');
  }

  async function resolveProfessionalId(professionalId) {
    if (professionalId) {
      return professionalId;
    }
    if (!sessionApi || typeof sessionApi.getCurrentUser !== 'function') {
      return null;
    }

    const user = await sessionApi.getCurrentUser();
    return user && (user.professionalId || user.id) ? (user.professionalId || user.id) : null;
  }

  return {
    async browse(filters = {}) {
      const result = await professionalsApi.listProfessionals(filters);
      return result.items || result;
    },

    async getProfile(professionalId) {
      if (!professionalId) {
        return null;
      }

      const result = await professionalsApi.getProfessional(professionalId);
      return result.item || result || null;
    },

    async listOperationalRequests(professionalId) {
      const resolvedId = await resolveProfessionalId(professionalId);
      if (!resolvedId || typeof professionalsApi.listOperationalActions !== 'function') {
        return [];
      }

      const result = await professionalsApi.listOperationalActions(resolvedId);
      return result.items || result || [];
    },

    async submitOperationalRequest(actionType, payload = {}, professionalId) {
      const resolvedId = await resolveProfessionalId(professionalId);
      if (!resolvedId || typeof professionalsApi.runOperationalAction !== 'function') {
        throw new Error('A professionals operational action helper is required');
      }

      const result = await professionalsApi.runOperationalAction(resolvedId, actionType, payload);
      return result.item || result || null;
    }
  };
}

module.exports = { createProfessionalWorkspace };
