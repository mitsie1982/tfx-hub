const assert = require('assert');
const { createAdminActionReview } = require('../../../apps/ams-app/src/actionReview');

async function run() {
  const contractor = {
    id: 'pro-003',
    name: 'Theuns Fraser',
    trade: 'general contractor'
  };

  const review = createAdminActionReview(contractor, 'compliance-review');
  assert.deepStrictEqual(review, {
    actionType: 'compliance-review',
    contractorId: 'pro-003',
    contractorName: 'Theuns Fraser',
    panelLabel: 'Compliance panel',
    title: 'Review Compliance Action',
    summary: 'Open a compliance review after confirming the contractor needs a compliance follow-up.'
  });

  assert.strictEqual(createAdminActionReview(contractor, 'unknown'), null);
  assert.strictEqual(createAdminActionReview(null, 'tier-review'), null);

  console.log('unit:test_action_review_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
