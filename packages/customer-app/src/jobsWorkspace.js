/*
 packages/customer-app/src/jobsWorkspace.js
 Customer job-posting and job-browsing workspace.
*/

const { JOB_STATUS } = require('@tfx/shared-logic');

function createJobsWorkspace(jobsApi) {
  if (!jobsApi || typeof jobsApi.listJobs !== 'function' || typeof jobsApi.postJob !== 'function') {
    throw new Error('A jobs API helper is required');
  }

  return {
    async listOpenJobs(filters = {}) {
      const result = await jobsApi.listJobs({ ...filters, status: JOB_STATUS.OPEN });
      return result.items || [];
    },

    async getJobDetail(jobId) {
      const result = await jobsApi.getJob(jobId);
      return result.item || null;
    },

    async createJobRequest(jobData) {
      if (!jobData || !jobData.trade) {
        throw new Error('jobData.trade is required');
      }

      return jobsApi.postJob({
        status: JOB_STATUS.OPEN,
        ...jobData
      });
    }
  };
}

module.exports = { createJobsWorkspace };
