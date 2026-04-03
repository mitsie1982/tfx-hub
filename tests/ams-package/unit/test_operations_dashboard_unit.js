const assert = require('assert');
const { createOperationsDashboard } = require('../../../packages/ams-app/src/operationsDashboard');

async function run() {
  const jobsApi = {
    async listJobs(filters) {
      if (filters.status === 'OPEN') {
        return { items: [{ id: 'job-001', trade: 'plumber' }, { id: 'job-002', trade: 'builder' }] };
      }
      if (filters.status === 'IN_PROGRESS') {
        return { items: [{ id: 'job-003', trade: 'plumber' }] };
      }
      if (filters.status === 'COMPLETED') {
        return { items: [{ id: 'job-004', trade: 'electrician' }] };
      }
      return { items: [] };
    }
  };

  const professionalsApi = {
    async listProfessionals() {
      return {
        items: [
          { id: 'pro-001', tier: 'PREMIUM' },
          { id: 'pro-002', tier: 'TRUSTED' },
          { id: 'pro-003', tier: 'TRUSTED' }
        ]
      };
    }
  };

  const dashboard = createOperationsDashboard(jobsApi, professionalsApi);
  const overview = await dashboard.getOverview();

  assert.strictEqual(overview.totals.openJobs, 2);
  assert.strictEqual(overview.totals.inProgressJobs, 1);
  assert.strictEqual(overview.totals.completedJobs, 1);
  assert.strictEqual(overview.totals.professionals, 3);
  assert.strictEqual(overview.professionalsByTier.TRUSTED, 2);
  assert.strictEqual(overview.openJobsByTrade.plumber, 1);
  assert.strictEqual(overview.totalJobsTracked, 4);

  console.log('unit:test_operations_dashboard_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}