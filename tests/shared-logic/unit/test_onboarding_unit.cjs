/*
 tests/shared-logic/unit/test_onboarding_unit.js
 Unit coverage for onboarding stage management and API helpers.
*/
const assert = require('assert');
const { createOnboardingApi, ONBOARDING_STAGES } = require('../../../packages/shared-logic/src/onboarding');

async function run() {
  const calls = [];
  const client = {
    async get(url, config) {
      calls.push({ method: 'GET', url, config });
      return { data: { completedStages: ['welcome', 'name'] } };
    },
    async post(url, body, config) {
      calls.push({ method: 'POST', url, body, config });
      return { data: { stage: url.split('/').pop(), ok: true } };
    }
  };

  const onboarding = createOnboardingApi(client, { associationId: 'assoc-001' });

  assert.deepStrictEqual(onboarding.STAGES, ONBOARDING_STAGES);
  assert.strictEqual(ONBOARDING_STAGES[0], 'welcome');
  assert.strictEqual(ONBOARDING_STAGES[ONBOARDING_STAGES.length - 1], 'credentials');

  const status = await onboarding.getStatus();
  assert.deepStrictEqual(status.completedStages, ['welcome', 'name']);
  assert.strictEqual(calls[0].config.headers['x-association-id'], 'assoc-001');

  const current = onboarding.currentStage(status);
  assert.strictEqual(current, 'trade');

  const result = await onboarding.submitStep('trade', { value: 'plumber' });
  assert.strictEqual(result.stage, 'trade');

  assert.strictEqual(onboarding.isComplete(status), false);
  const fullStatus = { completedStages: ONBOARDING_STAGES };
  assert.strictEqual(onboarding.isComplete(fullStatus), true);

  // guard: invalid stage
  try {
    await onboarding.submitStep('bad-stage', {});
    assert.fail('expected error');
  } catch (error) {
    assert.ok(error.message.includes('Invalid onboarding stage'));
  }

  console.log('unit:test_onboarding_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => { console.error(error); process.exit(1); });
}
