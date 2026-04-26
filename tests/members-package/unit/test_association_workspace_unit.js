const assert = require('assert');
const { createAssociationWorkspace } = require('../../../packages/members-app/src/associationWorkspace');

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
        return { items: [{ id: 'job-004', trade: 'electrician' }, { id: 'job-005', trade: 'plumber' }] };
      }
      return { items: [] };
    }
  };

  const professionalsApi = {
    async listProfessionals() {
      return {
        items: [
          { id: 'pro-001', trade: 'plumber' },
          { id: 'pro-002', trade: 'plumber' },
          { id: 'pro-003', trade: 'builder' }
        ]
      };
    },
    async getProfessional(professionalId) {
      return { item: { id: professionalId, name: 'John Smit', trade: 'plumber' } };
    },
    async listOperationalActions() {
      return { items: [{ id: 'op-001', actionType: 'member-review' }] };
    },
    async runOperationalAction(professionalId, actionType) {
      return { item: { id: 'op-002', professionalId, actionType, summary: 'Member review queued' } };
    }
  };

  const workspace = createAssociationWorkspace(jobsApi, professionalsApi);
  const overview = await workspace.getOverview();
  const professional = await workspace.getProfessional('pro-001');
  const actions = await workspace.listOperationalActions('pro-001');
  const action = await workspace.runOperationalAction('pro-001', 'member-review');

  assert.strictEqual(overview.totals.openJobs, 2);
  assert.strictEqual(overview.totals.inProgressJobs, 1);
  assert.strictEqual(overview.totals.completedJobs, 2);
  assert.strictEqual(overview.totals.professionals, 3);
  assert.strictEqual(overview.openJobsByTrade.plumber, 1);
  assert.strictEqual(overview.professionalsByTrade.plumber, 2);
  assert.strictEqual(professional.id, 'pro-001');
  assert.strictEqual(actions[0].actionType, 'member-review');
  assert.strictEqual(action.actionType, 'member-review');

  console.log('unit:test_association_workspace_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
