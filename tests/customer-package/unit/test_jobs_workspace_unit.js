const assert = require('assert');
const { createJobsWorkspace } = require('../../../packages/customer-app/src/jobsWorkspace');

async function run() {
  const calls = [];
  const jobsApi = {
    async listJobs(filters) {
      calls.push({ method: 'listJobs', filters });
      return { items: [{ id: 'job-001', status: 'OPEN', trade: 'plumber' }] };
    },
    async getJob(jobId) {
      calls.push({ method: 'getJob', jobId });
      return { item: { id: jobId, title: 'Kitchen plumbing repair' } };
    },
    async postJob(jobData) {
      calls.push({ method: 'postJob', jobData });
      return { item: { id: 'job-002', ...jobData } };
    }
  };

  const workspace = createJobsWorkspace(jobsApi);
  const jobs = await workspace.listOpenJobs({ trade: 'plumber' });
  assert.strictEqual(jobs.length, 1);
  assert.strictEqual(calls[0].filters.status, 'OPEN');

  const detail = await workspace.getJobDetail('job-001');
  assert.strictEqual(detail.id, 'job-001');

  const created = await workspace.createJobRequest({ trade: 'plumber', title: 'Fix sink leak' });
  assert.strictEqual(created.item.status, 'OPEN');

  try {
    await workspace.createJobRequest({ title: 'Missing trade' });
    assert.fail('expected error');
  } catch (error) {
    assert.ok(error.message.includes('jobData.trade'));
  }

  console.log('unit:test_jobs_workspace_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}