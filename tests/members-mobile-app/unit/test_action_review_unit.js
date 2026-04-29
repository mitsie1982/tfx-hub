const assert = require('assert');
const { createAssociationActionReview, createProfessionalActionReview } = require('../../../apps/members-app/src/actionReview');

async function run() {
  const professional = {
    id: 'pro-101',
    name: 'Lerato Ndlovu',
    trade: 'electrician'
  };

  const associationReview = createAssociationActionReview(professional, 'member-review');
  assert.deepStrictEqual(associationReview, {
    scope: 'association',
    scopeLabel: 'Association workflow',
    actionType: 'member-review',
    professionalId: 'pro-101',
    professionalName: 'Lerato Ndlovu',
    title: 'Review Member Review Queue',
    summary: 'Queue a member review so the association can inspect readiness and follow-up actions.'
  });

  const professionalReview = createProfessionalActionReview(professional, 'availability-check-in');
  assert.deepStrictEqual(professionalReview, {
    scope: 'professional',
    scopeLabel: 'Professional workflow',
    actionType: 'availability-check-in',
    professionalId: 'pro-101',
    professionalName: 'Lerato Ndlovu',
    title: 'Review Availability Check-In',
    summary: 'Record an availability check-in request for this professional before sending it.'
  });

  assert.strictEqual(createAssociationActionReview(professional, 'unknown'), null);
  assert.strictEqual(createProfessionalActionReview(null, 'availability-check-in'), null);

  console.log('unit:test_action_review_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
