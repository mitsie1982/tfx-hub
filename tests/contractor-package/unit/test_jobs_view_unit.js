/*
 tests/contractor-package/unit/test_jobs_view_unit.js
 Unit tests for the contractor jobsView.
*/
const assert = require('assert');
const { createJobsView } = require('../../../packages/contractor-app/src/jobsView');

async function run() {
  const calls = [];
  const jobsApi = {
    async listJobs(filters) {
      calls.push({ method: 'listJobs', filters });
      return { items: [{ id: 'job-001', trade: filters.trade, status: 'OPEN' }] };
    },
    async getJob(jobId) {
      calls.push({ method: 'getJob', jobId });
      return { item: { id: jobId, trade: 'plumber' } };
    },
    async applyForJob(jobId, application) {
      calls.push({ method: 'applyForJob', jobId, application });
      return { applicationId: 'app-001' };
    }
  };

  const view = createJobsView(jobsApi);

  const open = await view.getOpenJobs('plumber');
  assert.strictEqual(open.length, 1);
  assert.strictEqual(open[0].status, 'OPEN');
  assert.strictEqual(calls[0].filters.status, 'OPEN');

  const detail = await view.getJobDetail('job-001');
  assert.strictEqual(detail.id, 'job-001');

  const result = await view.applyForJob('job-001', 'pro-001');
  assert.strictEqual(result.applicationId, 'app-001');
  assert.strictEqual(calls[2].application.professionalId, 'pro-001');

  try {
    await view.applyForJob('job-001', '');
    assert.fail('expected error');
  } catch (error) {
    assert.ok(error.message.includes('professionalId'));
  }

  console.log('unit:test_jobs_view_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => { console.error(error); process.exit(1); });
}
