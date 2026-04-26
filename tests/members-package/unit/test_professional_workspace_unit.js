const assert = require('assert');
const { createProfessionalWorkspace } = require('../../../packages/members-app/src/professionalWorkspace');

async function run() {
  const professionalsApi = {
    async listProfessionals(filters) {
      return { items: [{ id: 'pro-001', trade: filters.trade || 'plumber' }] };
    },
    async getProfessional(professionalId) {
      return { item: { id: professionalId, name: 'John Smit', tier: 'PREMIUM' } };
    },
    async listOperationalActions() {
      return { items: [{ id: 'op-001', actionType: 'availability-check-in' }] };
    },
    async runOperationalAction(professionalId, actionType) {
      return { item: { id: 'op-002', professionalId, actionType, summary: 'Availability check-in recorded' } };
    }
  };

  const sessionApi = {
    async getCurrentUser() {
      return { id: 'professional-001', professionalId: 'pro-101' };
    }
  };

  const workspace = createProfessionalWorkspace(professionalsApi, sessionApi);
  const items = await workspace.browse({ trade: 'plumber' });
  const profile = await workspace.getProfile('pro-001');
  const missing = await workspace.getProfile('');
  const requests = await workspace.listOperationalRequests();
  const request = await workspace.submitOperationalRequest('availability-check-in', {});

  assert.strictEqual(items[0].trade, 'plumber');
  assert.strictEqual(profile.name, 'John Smit');
  assert.strictEqual(missing, null);
  assert.strictEqual(requests[0].actionType, 'availability-check-in');
  assert.strictEqual(request.actionType, 'availability-check-in');

  console.log('unit:test_professional_workspace_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
