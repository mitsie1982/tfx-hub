'use strict';

const { JOB_STATUS } = require('@tfx/shared-logic');

function countBy(items, selector) {
  return items.reduce((accumulator, item) => {
    const key = selector(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function createAssociationWorkspace(jobsApi, professionalsApi) {
  if (!jobsApi || typeof jobsApi.listJobs !== 'function') {
    throw new Error('A jobs API helper is required');
  }
  if (!professionalsApi || typeof professionalsApi.listProfessionals !== 'function') {
    throw new Error('A professionals API helper is required');
  }

  return {
    async getOverview() {
      const [openJobs, inProgressJobs, completedJobs, professionalsResult] = await Promise.all([
        jobsApi.listJobs({ status: JOB_STATUS.OPEN }),
        jobsApi.listJobs({ status: JOB_STATUS.IN_PROGRESS }),
        jobsApi.listJobs({ status: JOB_STATUS.COMPLETED }),
        professionalsApi.listProfessionals({})
      ]);

      const professionals = professionalsResult.items || professionalsResult || [];
      return {
        totals: {
          openJobs: (openJobs.items || []).length,
          inProgressJobs: (inProgressJobs.items || []).length,
          completedJobs: (completedJobs.items || []).length,
          professionals: professionals.length
        },
        openJobsByTrade: countBy(openJobs.items || [], (item) => item.trade || 'unknown'),
        professionalsByTrade: countBy(professionals, (item) => item.trade || 'unknown')
      };
    },

    async browseProfessionals(filters = {}) {
      const result = await professionalsApi.listProfessionals(filters);
      return result.items || result || [];
    },

    async getProfessional(professionalId) {
      if (!professionalId) {
        return null;
      }

      const result = await professionalsApi.getProfessional(professionalId);
      return result.item || result || null;
    },

    async listOperationalActions(professionalId) {
      if (!professionalId || typeof professionalsApi.listOperationalActions !== 'function') {
        return [];
      }

      const result = await professionalsApi.listOperationalActions(professionalId);
      return result.items || result || [];
    },

    async runOperationalAction(professionalId, actionType, payload = {}) {
      if (!professionalId || typeof professionalsApi.runOperationalAction !== 'function') {
        throw new Error('A professionals operational action helper is required');
      }

      const result = await professionalsApi.runOperationalAction(professionalId, actionType, payload);
      return result.item || result || null;
    }
  };
}

module.exports = { createAssociationWorkspace };
