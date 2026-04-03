const assert = require('assert');
const { createContractorDirectory } = require('../../../packages/ams-app/src/contractorDirectory');

async function run() {
  const professionalsApi = {
    async listProfessionals(filters) {
      return { items: [{ id: 'pro-001', trade: filters.trade || 'plumber' }] };
    },
    async getProfessional(professionalId) {
      return { item: { id: professionalId, tier: 'PREMIUM' } };
    },
    async listAdminActions() {
      return { items: [{ id: 'act-001', actionType: 'tier-review' }] };
    },
    async runAdminAction(professionalId, actionType) {
      return { item: { id: 'act-002', professionalId, actionType } };
    }
  };

  const directory = createContractorDirectory(professionalsApi);
  const contractors = await directory.list({ trade: 'plumber' });
  assert.strictEqual(contractors.length, 1);

  const contractor = await directory.getContractor('pro-001');
  assert.strictEqual(contractor.tier, 'PREMIUM');

  const actions = await directory.listAdminActions('pro-001');
  assert.strictEqual(actions[0].actionType, 'tier-review');

  const createdAction = await directory.runAdminAction('pro-001', 'compliance-review');
  assert.strictEqual(createdAction.actionType, 'compliance-review');

  console.log('unit:test_contractor_directory_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}