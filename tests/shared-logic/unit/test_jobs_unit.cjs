/*
 tests/shared-logic/unit/test_jobs_unit.js
 Unit coverage for the jobs API helper.
*/
const assert = require('assert');
const { createJobsApi, JOB_STATUS } = require('../../../packages/shared-logic/src/jobs');

async function run() {
  const calls = [];
  const client = {
    async get(url, config) {
      calls.push({ method: 'GET', url, config });
      if (url === '/jobs') return { data: { items: [{ id: 'job-001', trade: 'plumber', status: JOB_STATUS.OPEN }] } };
      return { data: { item: { id: 'job-001', trade: 'plumber', status: JOB_STATUS.OPEN } } };
    },
    async post(url, body, config) {
      calls.push({ method: 'POST', url, body, config });
      if (url === '/jobs') return { data: { item: { id: 'job-002', trade: body.trade } } };
      return { data: { applicationId: 'app-001' } };
    }
  };

  const jobs = createJobsApi(client, { associationId: 'assoc-001', platform: 'android' });

  const list = await jobs.listJobs({ trade: 'plumber' });
  assert.strictEqual(list.items[0].status, JOB_STATUS.OPEN);
  assert.strictEqual(calls[0].config.headers['x-association-id'], 'assoc-001');
  assert.strictEqual(calls[0].config.params.trade, 'plumber');

  const detail = await jobs.getJob('job-001');
  assert.strictEqual(detail.item.id, 'job-001');

  const posted = await jobs.postJob({ trade: 'electrician', description: 'Fix wiring' });
  assert.strictEqual(posted.item.trade, 'electrician');

  const application = await jobs.applyForJob('job-001', { professionalId: 'pro-001' });
  assert.ok(application.applicationId);

  // guard: missing jobId
  try {
    await jobs.applyForJob('', { professionalId: 'pro-001' });
    assert.fail('expected error');
  } catch (error) {
    assert.ok(error.message.includes('jobId'));
  }

  // constants exposed
  assert.strictEqual(JOB_STATUS.OPEN, 'OPEN');
  assert.strictEqual(JOB_STATUS.COMPLETED, 'COMPLETED');

  console.log('unit:test_jobs_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => { console.error(error); process.exit(1); });
}
