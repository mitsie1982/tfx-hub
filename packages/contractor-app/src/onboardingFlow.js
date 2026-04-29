/*
 packages/contractor-app/src/onboardingFlow.js
 Contractor onboarding flow driven by the shared-logic onboarding API.
*/

function createOnboardingFlow(onboardingApi) {
  if (!onboardingApi || typeof onboardingApi.getStatus !== 'function') {
    throw new Error('An onboarding API helper is required');
  }

  return {
    async getNextStep() {
      const status = await onboardingApi.getStatus();
      return {
        nextStage: onboardingApi.currentStage(status),
        isComplete: onboardingApi.isComplete(status),
        completedStages: status.completedStages || []
      };
    },

    async submitStep(stage, data) {
      return onboardingApi.submitStep(stage, data);
    },

    async runAutoOnboarding(answers = {}) {
      for (const stage of onboardingApi.STAGES) {
        const result = await onboardingApi.submitStep(stage, answers[stage] || {});
        if (!result.ok) {
          return { success: false, failedStage: stage, result };
        }
      }
      return { success: true };
    }
  };
}

module.exports = { createOnboardingFlow };
