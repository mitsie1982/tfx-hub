const assert = require('assert');
const { createRequestReview } = require('../../../apps/customer-app/src/requestReview');

async function run() {
  const review = createRequestReview({
    title: ' Bathroom plumbing repair ',
    trade: ' plumber ',
    description: ' Need a plumber for a same-day leak repair. ',
    budget: ' R2,500 - R5,000 ',
    location: ' Sandton ',
    urgency: ' Urgent '
  });

  assert.deepStrictEqual(review, {
    title: 'Bathroom plumbing repair',
    trade: 'plumber',
    description: 'Need a plumber for a same-day leak repair.',
    budget: 'R2,500 - R5,000',
    location: 'Sandton',
    urgency: 'Urgent'
  });

  assert.strictEqual(createRequestReview({ title: ' ', trade: 'plumber', description: 'desc' }), null);
  assert.strictEqual(createRequestReview({ title: 'Fix sink', trade: ' ', description: 'desc' }), null);
  assert.strictEqual(createRequestReview({ title: 'Fix sink', trade: 'plumber', description: ' ' }), null);
  assert.strictEqual(createRequestReview(null), null);

  console.log('unit:test_request_review_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
