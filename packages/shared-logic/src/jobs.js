/*
 packages/shared-logic/src/jobs.js
 Shared API helpers for job posting, listing, and applications.
*/
const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');

const JOB_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

function createJobsApi(client, context = {}) {
  if (!client || typeof client.get !== 'function') {
    throw new Error('A compatible API client is required');
  }

  function withContext(config = {}) {
    return {
      ...config,
      headers: mergeHeaders(buildAssociationHeaders(context), config.headers)
    };
  }

  return {
    async listJobs(filters = {}) {
      const response = await client.get('/jobs', withContext({ params: filters }));
      return response.data;
    },

    async getJob(jobId) {
      if (!jobId) throw new Error('jobId is required');
      const response = await client.get(`/jobs/${encodeURIComponent(jobId)}`, withContext());
      return response.data;
    },

    async postJob(jobData) {
      if (!jobData || !jobData.trade) throw new Error('jobData.trade is required');
      const response = await client.post('/jobs', jobData, withContext());
      return response.data;
    },

    async applyForJob(jobId, application) {
      if (!jobId) throw new Error('jobId is required');
      if (!application || !application.professionalId) throw new Error('application.professionalId is required');
      const response = await client.post(
        `/jobs/${encodeURIComponent(jobId)}/applications`,
        application,
        withContext()
      );
      return response.data;
    }
  };
}

module.exports = { createJobsApi, JOB_STATUS };
