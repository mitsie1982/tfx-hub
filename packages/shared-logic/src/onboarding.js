/*
 packages/shared-logic/src/onboarding.js
 Onboarding state machine and submission helpers.
 Mirrors the 6-stage WhatsApp flow: welcome → name → trade → experience → location → credentials
*/
const { buildAssociationHeaders, mergeHeaders } = require('./requestContext');

const ONBOARDING_STAGES = [
  'welcome',
  'name',
  'trade',
  'experience',
  'location',
  'credentials'
];

function createOnboardingApi(client, context = {}) {
  if (!client || typeof client.get !== 'function') {
    throw new Error('A compatible API client is required');
  }

  function withContext(config = {}) {
    return {
      ...config,
      headers: mergeHeaders(buildAssociationHeaders(context), config.headers)
    };
  }

  return {
    STAGES: ONBOARDING_STAGES,

    async getStatus() {
      const response = await client.get('/onboarding/status', withContext());
      return response.data;
    },

    async submitStep(stage, data) {
      if (!ONBOARDING_STAGES.includes(stage)) {
        throw new Error(`Invalid onboarding stage "${stage}". Valid: ${ONBOARDING_STAGES.join(', ')}`);
      }
      const response = await client.post(`/onboarding/${encodeURIComponent(stage)}`, data || {}, withContext());
      return response.data;
    },

    currentStage(statusPayload) {
      if (!statusPayload || !statusPayload.completedStages) return ONBOARDING_STAGES[0];
      const remaining = ONBOARDING_STAGES.filter(
        (stage) => !statusPayload.completedStages.includes(stage)
      );
      return remaining.length > 0 ? remaining[0] : null;
    },

    isComplete(statusPayload) {
      if (!statusPayload || !statusPayload.completedStages) return false;
      return ONBOARDING_STAGES.every((stage) => statusPayload.completedStages.includes(stage));
    }
  };
}

module.exports = { createOnboardingApi, ONBOARDING_STAGES };
