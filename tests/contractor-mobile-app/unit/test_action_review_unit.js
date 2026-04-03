const assert = require('assert');
const { createMessageReview, createQuoteReview } = require('../../../apps/contractor-app/src/actionReview');

async function run() {
  const project = {
    id: 'job-101',
    title: 'Kitchen plumbing and leak repair'
  };

  const quoteReview = createQuoteReview(project, {
    amount: ' R12,500 ',
    timeline: ' 3 working days ',
    note: ' Includes labour and materials '
  });
  assert.deepStrictEqual(quoteReview, {
    type: 'quote',
    projectId: 'job-101',
    projectTitle: 'Kitchen plumbing and leak repair',
    quote: {
      amount: 'R12,500',
      timeline: '3 working days',
      note: 'Includes labour and materials'
    }
  });

  const messageReview = createMessageReview(project, {
    body: ' I can inspect this tomorrow morning. '
  });
  assert.deepStrictEqual(messageReview, {
    type: 'message',
    projectId: 'job-101',
    projectTitle: 'Kitchen plumbing and leak repair',
    message: {
      body: 'I can inspect this tomorrow morning.'
    }
  });

  assert.strictEqual(createQuoteReview(project, { amount: ' ', timeline: '', note: '' }), null);
  assert.strictEqual(createMessageReview(project, { body: ' ' }), null);
  assert.strictEqual(createQuoteReview(null, { amount: 'R12,500', timeline: '', note: '' }), null);
  assert.strictEqual(createMessageReview(null, { body: 'Hello' }), null);

  console.log('unit:test_action_review_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}