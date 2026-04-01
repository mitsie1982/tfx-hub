/*
 packages/contractor-app/src/jobsView.js
 Available and applied-for jobs view for the contractor app.
*/
const { JOB_STATUS } = require('@tfx/shared-logic');

function createJobsView(jobsApi) {
  if (!jobsApi || typeof jobsApi.listJobs !== 'function') {
    throw new Error('A jobs API helper is required');
  }

  return {
    async getOpenJobs(trade) {
      const result = await jobsApi.listJobs({ trade, status: JOB_STATUS.OPEN });
      return result.items || [];
    },

    async getJobDetail(jobId) {
      const result = await jobsApi.getJob(jobId);
      return result.item || null;
    },

    async applyForJob(jobId, professionalId) {
      if (!professionalId) throw new Error('professionalId is required');
      return jobsApi.applyForJob(jobId, { professionalId });
    }
  };
}

module.exports = { createJobsView };
