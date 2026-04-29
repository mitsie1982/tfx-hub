/*
 packages/ams-app/src/operationsDashboard.js
 Admin operations overview using shared jobs and professionals APIs.
*/

const { JOB_STATUS } = require('@tfx/shared-logic');

function countBy(values, selector) {
  return values.reduce((accumulator, item) => {
    const key = selector(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function createOperationsDashboard(jobsApi, professionalsApi) {
  if (!jobsApi || typeof jobsApi.listJobs !== 'function') {
    throw new Error('A jobs API helper is required');
  }
  if (!professionalsApi || typeof professionalsApi.listProfessionals !== 'function') {
    throw new Error('A professionals API helper is required');
  }

  return {
    async getOverview() {
      const [openJobs, inProgressJobs, completedJobs, cancelledJobs, professionalsResult] = await Promise.all([
        jobsApi.listJobs({ status: JOB_STATUS.OPEN }),
        jobsApi.listJobs({ status: JOB_STATUS.IN_PROGRESS }),
        jobsApi.listJobs({ status: JOB_STATUS.COMPLETED }),
        jobsApi.listJobs({ status: JOB_STATUS.CANCELLED }),
        professionalsApi.listProfessionals({})
      ]);

      const professionals = professionalsResult.items || professionalsResult || [];
      const allJobs = []
        .concat(openJobs.items || [])
        .concat(inProgressJobs.items || [])
        .concat(completedJobs.items || [])
        .concat(cancelledJobs.items || []);

      return {
        totals: {
          openJobs: (openJobs.items || []).length,
          inProgressJobs: (inProgressJobs.items || []).length,
          completedJobs: (completedJobs.items || []).length,
          cancelledJobs: (cancelledJobs.items || []).length,
          professionals: professionals.length
        },
        professionalsByTier: countBy(professionals, (item) => item.tier || 'UNKNOWN'),
        openJobsByTrade: countBy(openJobs.items || [], (item) => item.trade || 'unknown'),
        recentOpenJobs: (openJobs.items || []).slice(0, 5),
        totalJobsTracked: allJobs.length
      };
    }
  };
}

module.exports = { createOperationsDashboard };
