/*
 tests/shared-logic/integration/run_integration_test.js
 Starts the integration server and verifies shared-logic consumer flows end to end.
*/
const assert = require('assert');
const child = require('child_process');
const path = require('path');
const { createSharedLogicClient } = require('../../../packages/shared-logic/src/sharedLogicClient');
const { signToken } = require('../../../packages/shared-logic/src/auth');
const { ONBOARDING_STAGES } = require('../../../packages/shared-logic/src/onboarding');

const serverPath = path.join(__dirname, 'server.js');
const proc = child.spawn(process.execPath, [serverPath], {
  stdio: ['ignore', 'pipe', 'pipe']
});

function stopServer() {
  if (!proc.killed) {
    proc.kill();
  }
}

proc.stdout.on('data', (chunk) => process.stdout.write(chunk));
proc.stderr.on('data', (chunk) => process.stderr.write(chunk));

proc.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error('Integration server exited early with code', code);
  }
});

setTimeout(async () => {
  try {
    const token = signToken({ sub: 'int-user', associationId: 'assoc-int' }, { expiresIn: '1h' });
    const client = createSharedLogicClient({
      baseURL: 'http://localhost:5005',
      getToken: async () => token,
      context: {
        associationId: 'assoc-int',
        platform: 'android',
        appVersion: '1.0.0'
      }
    });

    const protectedResponse = await client.api.get('/protected');
    const listResponse = await client.professionals.listProfessionals({ trade: 'plumber' });
    const detailResponse = await client.professionals.getProfessional('pro-001');
    const jobsListResponse = await client.jobs.listJobs({ trade: 'plumber', status: 'OPEN' });
    const jobDetailResponse = await client.jobs.getJob('job-001');
    const postedJobResponse = await client.jobs.postJob({ trade: 'electrician', description: 'Panel upgrade' });
    const applicationResponse = await client.jobs.applyForJob('job-001', { professionalId: 'pro-001' });
    const onboardingStatusResponse = await client.onboarding.getStatus();
    const onboardingStepResponse = await client.onboarding.submitStep('welcome', { data: 'hello' });

    assert.strictEqual(protectedResponse.status, 200);
    assert.strictEqual(listResponse.meta.associationId, 'assoc-int');
    assert.strictEqual(listResponse.items.length, 1);
    assert.strictEqual(detailResponse.item.id, 'pro-001');
    assert.ok(Array.isArray(jobsListResponse.items));
    assert.strictEqual(jobDetailResponse.item.trade, 'plumber');
    assert.ok(postedJobResponse.item.id);
    assert.ok(applicationResponse.applicationId);
    assert.ok(Array.isArray(onboardingStatusResponse.completedStages));
    assert.strictEqual(onboardingStepResponse.ok, true);

    console.log('protected status:', protectedResponse.status);
    console.log('jobs list:', jobsListResponse.items.length, 'items');
    console.log('job detail:', jobDetailResponse.item.id);
    console.log('posted job:', postedJobResponse.item.id);
    console.log('application:', applicationResponse.applicationId);
    console.log('onboarding status:', onboardingStatusResponse.completedStages);
    console.log('onboarding step:', onboardingStepResponse.stage);
    stopServer();
    process.exit(0);
  } catch (error) {
    console.error('Integration test failed', error && error.message);
    stopServer();
    process.exit(2);
  }
}, 800);

process.on('exit', stopServer);
process.on('SIGINT', () => {
  stopServer();
  process.exit(130);
});
