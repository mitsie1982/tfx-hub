/*
 tests/contractor-app/unit/test_onboarding_flow_unit.js
 Unit tests for the contractor onboarding flow.
*/
const assert = require('assert');
const { ONBOARDING_STAGES } = require('../../../packages/shared-logic/src/onboarding');
const { createOnboardingFlow } = require('../../../packages/contractor-app/src/onboardingFlow');

async function run() {
  const completed = ['welcome', 'name'];
  let statusPayload = { completedStages: completed };

  const onboardingApi = {
    STAGES: ONBOARDING_STAGES,
    async getStatus() { return statusPayload; },
    currentStage(status) {
      const remaining = ONBOARDING_STAGES.filter((s) => !status.completedStages.includes(s));
      return remaining.length > 0 ? remaining[0] : null;
    },
    isComplete(status) {
      return ONBOARDING_STAGES.every((s) => status.completedStages.includes(s));
    },
    async submitStep(stage, data) {
      return { ok: true, stage, data };
    }
  };

  const flow = createOnboardingFlow(onboardingApi);

  const next = await flow.getNextStep();
  assert.strictEqual(next.nextStage, 'trade');
  assert.strictEqual(next.isComplete, false);
  assert.deepStrictEqual(next.completedStages, completed);

  const stepResult = await flow.submitStep('trade', { value: 'electrician' });
  assert.strictEqual(stepResult.stage, 'trade');
  assert.strictEqual(stepResult.ok, true);

  statusPayload = { completedStages: ONBOARDING_STAGES };
  const nextAfterAll = await flow.getNextStep();
  assert.strictEqual(nextAfterAll.isComplete, true);
  assert.strictEqual(nextAfterAll.nextStage, null);

  console.log('unit:test_onboarding_flow_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => { console.error(error); process.exit(1); });
}
