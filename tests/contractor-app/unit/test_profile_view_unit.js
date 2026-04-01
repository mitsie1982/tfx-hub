/*
 tests/contractor-app/unit/test_profile_view_unit.js
 Unit tests for the contractor profileView.
*/
const assert = require('assert');
const { createProfileView } = require('../../../packages/contractor-app/src/profileView');

async function run() {
  const professionalsApi = {
    async getProfessional(id) {
      return { item: { id, name: 'John Smit', tier: 'PREMIUM' } };
    }
  };

  const view = createProfileView(professionalsApi);

  const profile = await view.getProfile('pro-001');
  assert.strictEqual(profile.id, 'pro-001');
  assert.strictEqual(profile.tier, 'PREMIUM');

  assert.strictEqual(view.formatTierLabel('PREMIUM'), 'Premium Partner');
  assert.strictEqual(view.formatTierLabel('VERIFIED'), 'Verified Professional');
  assert.strictEqual(view.formatTierLabel('TRUSTED'), 'Trusted Contractor');
  assert.strictEqual(view.formatTierLabel('ONBOARDED'), 'New Contractor');
  assert.strictEqual(view.formatTierLabel('UNKNOWN_TIER'), 'UNKNOWN_TIER');

  console.log('unit:test_profile_view_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => { console.error(error); process.exit(1); });
}
