/*
 tests/shared-logic/integration/run_integration_test.js
 Starts the integration server and verifies shared-logic consumer flows end to end.
*/
const assert = require('assert');
const child = require('child_process');
const path = require('path');
const { createSharedLogicClient } = require('../../../packages/shared-logic/src/sharedLogicClient');
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
    const client = createSharedLogicClient({
      baseURL: 'http://localhost:5005',
      context: {
        associationId: 'assoc-contractor-demo',
        platform: 'android',
        appVersion: '1.0.0'
      }
    });

    const registerResponse = await client.session.register({
      email: 'newcontractor@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'Contractor',
      role: 'contractor',
      trade: 'electrician'
    });
    const resetRequestResponse = await client.session.requestPasswordReset({ email: 'contractor@example.com' });
    const resetConfirmResponse = await client.session.confirmPasswordReset({ token: resetRequestResponse.resetToken, password: 'password123' });
    const loginResponse = await client.session.login({ email: 'contractor@example.com', password: 'password123' });
    const currentUserResponse = await client.session.getCurrentUser();
    const protectedResponse = await client.api.get('/protected');
    const listResponse = await client.professionals.listProfessionals({ trade: 'plumber' });
    const detailResponse = await client.professionals.getProfessional('pro-001');
    const jobsListResponse = await client.jobs.listJobs({ trade: 'plumber', status: 'OPEN' });
    const jobDetailResponse = await client.jobs.getJob('job-001');
    const postedJobResponse = await client.jobs.postJob({ trade: 'electrician', description: 'Panel upgrade' });
    const postedJobResponseTwo = await client.jobs.postJob({ trade: 'builder', title: 'Boundary wall extension', description: 'Extend an existing boundary wall and add coping.', location: 'Roodepoort' });
    const applicationResponse = await client.jobs.applyForJob('job-001', { professionalId: 'pro-001' });
    const contractorProfileResponse = await client.contractor.getProfile();
    const quoteResponse = await client.contractor.submitQuote('job-001', { amount: 'R12,500', timeline: '3 days' });
    const messageResponse = await client.contractor.sendMessage('job-001', { body: 'I can inspect this tomorrow morning.' });
    const quoteResponseTwo = await client.contractor.submitQuote('job-002', { amount: 'R18,500', timeline: '4 days' });
    const messageResponseTwo = await client.contractor.sendMessage('job-002', { body: 'Available this week for the boundary wall extension.' });
    const contractorHistoryResponse = await client.contractor.listLeadHistory();
    const onboardingStatusResponse = await client.onboarding.getStatus();
    const onboardingStepResponse = await client.onboarding.submitStep('welcome', { data: 'hello' });
    const whatsappSessionBefore = await client.whatsappContractor.getSession('+27710000001');
    const whatsappMenuResponse = await client.whatsappContractor.sendMessage('+27710000001', 'Hi');
    const whatsappAccountHelpResponse = await client.whatsappContractor.sendMessage('+27710000001', '7');
    const whatsappLinkedResetPromptResponse = await client.whatsappContractor.sendMessage('+27710000001', '1');
    const whatsappLinkedResetRequestResponse = await client.whatsappContractor.sendMessage('+27710000001', 'YES');
    const whatsappLinkedResetTokenMatch = whatsappLinkedResetRequestResponse.reply.match(/Token: (reset-[^\n]+)/);
    assert.ok(whatsappLinkedResetTokenMatch);
    const whatsappLinkedResetTokenResponse = await client.whatsappContractor.sendMessage('+27710000001', whatsappLinkedResetTokenMatch[1]);
    const whatsappLinkedResetPasswordResponse = await client.whatsappContractor.sendMessage('+27710000001', 'password123');
    const whatsappLeadsResponse = await client.whatsappContractor.sendMessage('+27710000001', '2');
    const whatsappMoreLeadsResponse = await client.whatsappContractor.sendMessage('+27710000001', 'MORE');
    const whatsappSearchPromptResponse = await client.whatsappContractor.sendMessage('+27710000001', 'S');
    const whatsappSearchResultsResponse = await client.whatsappContractor.sendMessage('+27710000001', 'kitchen');
    const whatsappClearSearchResponse = await client.whatsappContractor.sendMessage('+27710000001', 'C');
    const whatsappLeadDetailResponse = await client.whatsappContractor.sendMessage('+27710000001', '1');
    const whatsappInterestResponse = await client.whatsappContractor.sendMessage('+27710000001', '1');
    const whatsappQuoteStartResponse = await client.whatsappContractor.sendMessage('+27710000001', '1');
    const whatsappQuoteAmountResponse = await client.whatsappContractor.sendMessage('+27710000001', 'R12,500');
    const whatsappQuoteTimelineResponse = await client.whatsappContractor.sendMessage('+27710000001', '3 working days');
    const whatsappQuoteNoteResponse = await client.whatsappContractor.sendMessage('+27710000001', 'Includes labour and materials');
    const whatsappQuoteConfirmResponse = await client.whatsappContractor.sendMessage('+27710000001', 'YES');
    const whatsappMenuBeforeActivityResponse = await client.whatsappContractor.sendMessage('+27710000001', 'M');
    const whatsappActivityResponse = await client.whatsappContractor.sendMessage('+27710000001', '3');
    const whatsappMoreActivityResponse = await client.whatsappContractor.sendMessage('+27710000001', 'MORE');
    const whatsappResetStartResponse = await client.whatsappContractor.sendMessage('+27718880008', 'Hi');
    const whatsappResetChoiceResponse = await client.whatsappContractor.sendMessage('+27718880008', '3');
    const whatsappResetRequestResponse = await client.whatsappContractor.sendMessage('+27718880008', 'contractor@example.com');
    const whatsappResetTokenMatch = whatsappResetRequestResponse.reply.match(/Token: (reset-[^\n]+)/);
    const whatsappResetTokenResponse = await client.whatsappContractor.sendMessage('+27718880008', whatsappResetTokenMatch[1]);
    const whatsappResetPasswordResponse = await client.whatsappContractor.sendMessage('+27718880008', 'password123');
    const whatsappRegisterStartResponse = await client.whatsappContractor.sendMessage('+27719999999', 'Hi');
    const whatsappRegisterChoiceResponse = await client.whatsappContractor.sendMessage('+27719999999', '2');
    await client.whatsappContractor.sendMessage('+27719999999', 'Jane Dlamini');
    await client.whatsappContractor.sendMessage('+27719999999', 'electrician');
    await client.whatsappContractor.sendMessage('+27719999999', 'Soweto');
    await client.whatsappContractor.sendMessage('+27719999999', '5 years');
    const whatsappRegisterCompleteResponse = await client.whatsappContractor.sendMessage('+27719999999', 'jane@example.com');
    const whatsappCustomerResetStart = await client.whatsappCustomer.sendMessage('+27716660003', 'Hi');
    const whatsappCustomerResetChoice = await client.whatsappCustomer.sendMessage('+27716660003', '3');
    const whatsappCustomerResetRequest = await client.whatsappCustomer.sendMessage('+27716660003', 'client@example.com');
    const whatsappCustomerResetTokenMatch = whatsappCustomerResetRequest.reply.match(/Token: (reset-[^\n]+)/);
    assert.ok(whatsappCustomerResetTokenMatch);
    const whatsappCustomerResetToken = await client.whatsappCustomer.sendMessage('+27716660003', whatsappCustomerResetTokenMatch[1]);
    const whatsappCustomerResetPassword = await client.whatsappCustomer.sendMessage('+27716660003', 'client-new-password-123');
    const whatsappCustomerSession = await client.whatsappCustomer.getSession('+27710000003');
    const whatsappCustomerMenu = await client.whatsappCustomer.sendMessage('+27710000003', 'Hi');
    const whatsappCustomerJobs = await client.whatsappCustomer.sendMessage('+27710000003', '1');
    const whatsappCustomerJobDetail = await client.whatsappCustomer.sendMessage('+27710000003', '1');
    const whatsappCustomerProfessionals = await client.whatsappCustomer.sendMessage('+27710000003', '1');
    const whatsappCustomerProfessional = await client.whatsappCustomer.sendMessage('+27710000003', '1');
    const whatsappCustomerShortlist = await client.whatsappCustomer.sendMessage('+27710000003', '1');
    const whatsappAssociationSession = await client.whatsappAssociation.getSession('+27710000005');
    const whatsappAssociationMenu = await client.whatsappAssociation.sendMessage('+27710000005', 'Hi');
    const whatsappAssociationOverview = await client.whatsappAssociation.sendMessage('+27710000005', '1');
    const whatsappAssociationDirectory = await client.whatsappAssociation.sendMessage('+27710000005', '2');
    const whatsappAssociationDetail = await client.whatsappAssociation.sendMessage('+27710000005', '1');
    const whatsappAssociationAction = await client.whatsappAssociation.sendMessage('+27710000005', '1');
    const whatsappAdminSession = await client.whatsappAdmin.getSession('+27710000004');
    let whatsappAdminBlocked = null;
    try {
      await client.whatsappAdmin.sendMessage('+27710000004', 'Hi');
    } catch (error) {
      whatsappAdminBlocked = error;
    }
    const whatsappProfessionalSession = await client.whatsappProfessional.getSession('+27710000006');
    const whatsappProfessionalMenu = await client.whatsappProfessional.sendMessage('+27710000006', 'Hi');
    const whatsappProfessionalProfile = await client.whatsappProfessional.sendMessage('+27710000006', '1');
    const whatsappProfessionalDirectory = await client.whatsappProfessional.sendMessage('+27710000006', '1');
    const whatsappProfessionalDetail = await client.whatsappProfessional.sendMessage('+27710000006', '1');
    const whatsappProfessionalAvailability = await client.whatsappProfessional.sendMessage('+27710000006', '3');
    const whatsappProfessionalRequests = await client.whatsappProfessional.sendMessage('+27710000006', '5');
    const whatsappSubscriptionResponse = await client.session.subscribeWhatsapp('+27710000009');

    assert.strictEqual(registerResponse.user.email, 'newcontractor@example.com');
    assert.strictEqual(resetConfirmResponse.ok, true);
    assert.strictEqual(loginResponse.user.email, 'contractor@example.com');
    assert.strictEqual(currentUserResponse.email, 'contractor@example.com');
    assert.strictEqual(protectedResponse.status, 200);
    assert.strictEqual(listResponse.meta.associationId, 'assoc-contractor-demo');
    assert.strictEqual(listResponse.items.length, 1);
    assert.strictEqual(detailResponse.item.id, 'pro-001');
    assert.ok(Array.isArray(jobsListResponse.items));
    assert.strictEqual(jobDetailResponse.item.trade, 'plumber');
    assert.ok(postedJobResponse.item.id);
    assert.ok(applicationResponse.applicationId);
    assert.strictEqual(contractorProfileResponse.item.professionalId, 'pro-003');
    assert.ok(quoteResponse.item.id);
    assert.ok(messageResponse.item.id);
    assert.ok(quoteResponseTwo.item.id);
    assert.ok(messageResponseTwo.item.id);
    assert.ok(Array.isArray(contractorHistoryResponse.items));
    assert.ok(Array.isArray(onboardingStatusResponse.completedStages));
    assert.strictEqual(onboardingStepResponse.ok, true);
    assert.strictEqual(whatsappSessionBefore.item.linked, true);
    assert.ok(whatsappMenuResponse.reply.includes('Welcome back'));
    assert.ok(whatsappMenuResponse.reply.includes('Contractor snapshot'));
    assert.ok(whatsappMenuResponse.reply.includes('Completed jobs: 67'));
    assert.ok(whatsappMenuResponse.reply.includes('7. Account Help'));
    assert.ok(whatsappAccountHelpResponse.reply.includes('Account help'));
    assert.ok(whatsappLinkedResetPromptResponse.reply.includes('Reset password for contractor@example.com'));
    assert.ok(whatsappLinkedResetTokenResponse.reply.includes('Enter your new password'));
    assert.ok(whatsappLinkedResetPasswordResponse.reply.includes('Password reset complete'));
    assert.ok(whatsappLeadsResponse.reply.includes('Top leads for you'));
    assert.ok(whatsappLeadsResponse.reply.includes('Showing 1-3 of 4 matched leads'));
    assert.ok(whatsappLeadsResponse.reply.includes('Reply MORE for the next leads'));
    assert.ok(whatsappMoreLeadsResponse.reply.includes('Showing 4-4 of 4 matched leads'));
    assert.ok(whatsappMoreLeadsResponse.reply.includes('Boundary wall extension'));
    assert.ok(whatsappSearchPromptResponse.reply.includes('Enter text to search your leads'));
    assert.ok(whatsappSearchResultsResponse.reply.includes('Current text search: kitchen'));
    assert.ok(!whatsappClearSearchResponse.reply.includes('Current text search:'));
    assert.ok(whatsappLeadDetailResponse.reply.includes('Reply:'));
    assert.ok(whatsappInterestResponse.reply.includes('Interest sent'));
    assert.ok(whatsappQuoteStartResponse.reply.includes('Step 1 of 3'));
    assert.ok(whatsappQuoteAmountResponse.reply.includes('Step 2 of 3'));
    assert.ok(whatsappQuoteTimelineResponse.reply.includes('Step 3 of 3'));
    assert.ok(whatsappQuoteNoteResponse.reply.includes('Confirm quote'));
    assert.ok(whatsappQuoteConfirmResponse.reply.includes('Quote sent successfully'));
    assert.ok(whatsappMenuBeforeActivityResponse.reply.includes('Contractor snapshot'));
    assert.ok(whatsappActivityResponse.reply.includes('Recent activity'));
    assert.ok(whatsappActivityResponse.reply.includes('Showing 1-5 of'));
    assert.ok(whatsappActivityResponse.reply.includes('Reply MORE for older activity'));
    assert.ok(whatsappMoreActivityResponse.reply.includes('Showing 6-'));
    assert.ok(whatsappResetStartResponse.reply.includes('Reset contractor password'));
    assert.ok(whatsappResetChoiceResponse.reply.includes('Enter the email address on your contractor account'));
    assert.ok(whatsappResetRequestResponse.reply.includes('Password reset requested for contractor@example.com'));
    assert.ok(whatsappResetTokenMatch);
    assert.ok(whatsappResetTokenResponse.reply.includes('Enter your new password'));
    assert.ok(whatsappResetPasswordResponse.reply.includes('Password reset complete'));
    assert.ok(whatsappRegisterStartResponse.reply.includes('Welcome to TFX Hub contractor WhatsApp'));
    assert.ok(whatsappRegisterChoiceResponse.reply.includes('What is your full name'));
    assert.ok(whatsappRegisterCompleteResponse.reply.includes('Your contractor account is ready on WhatsApp'));
    assert.ok(whatsappCustomerResetStart.reply.includes('Reset customer password'));
    assert.ok(whatsappCustomerResetChoice.reply.includes('Enter the email address on your customer account'));
    assert.ok(whatsappCustomerResetRequest.reply.includes('Password reset requested for client@example.com'));
    assert.ok(whatsappCustomerResetToken.reply.includes('Enter your new password'));
    assert.ok(whatsappCustomerResetPassword.reply.includes('Password reset complete'));
    assert.strictEqual(whatsappCustomerSession.item.linked, true);
    assert.ok(whatsappCustomerMenu.reply.includes('Welcome back, Ayanda'));
    assert.ok(whatsappCustomerJobs.reply.includes('Your open jobs'));
    assert.ok(whatsappCustomerJobDetail.reply.includes('Description:'));
    assert.ok(whatsappCustomerProfessionals.reply.includes('Top professionals'));
    assert.ok(whatsappCustomerProfessional.reply.includes('Reply:'));
    assert.ok(whatsappCustomerShortlist.reply.includes('Shortlist updated'));
    assert.strictEqual(whatsappAssociationSession.item.linked, true);
    assert.ok(whatsappAssociationMenu.reply.includes('Welcome back, TFX'));
    assert.ok(whatsappAssociationOverview.reply.includes('Association overview'));
    assert.ok(whatsappAssociationDirectory.reply.includes('Professional directory'));
    assert.ok(whatsappAssociationDetail.reply.includes('Reply:'));
    assert.ok(whatsappAssociationAction.reply.includes('Member review queued'));
    assert.strictEqual(whatsappAdminSession.item.screen, 'blocked');
    assert.ok(whatsappAdminBlocked);
    assert.strictEqual(whatsappProfessionalSession.item.linked, true);
    assert.ok(whatsappProfessionalMenu.reply.includes('Welcome back, Lerato'));
    assert.ok(whatsappProfessionalProfile.reply.includes('Your professional profile'));
    assert.ok(whatsappProfessionalDirectory.reply.includes('Professional directory'));
    assert.ok(whatsappProfessionalDetail.reply.includes('Reply:'));
    assert.ok(whatsappProfessionalAvailability.reply.includes('Availability check-in recorded'));
    assert.ok(whatsappProfessionalRequests.reply.includes('Recent professional requests'));
    assert.strictEqual(whatsappSubscriptionResponse.item.phoneNumber, '+27710000009');

    console.log('register:', registerResponse.user.email);
    console.log('password reset:', resetRequestResponse.resetToken);
    console.log('login:', loginResponse.user.email);
    console.log('user:', currentUserResponse.id);
    console.log('protected status:', protectedResponse.status);
    console.log('jobs list:', jobsListResponse.items.length, 'items');
    console.log('job detail:', jobDetailResponse.item.id);
    console.log('posted job:', postedJobResponse.item.id);
    console.log('posted job 2:', postedJobResponseTwo.item.id);
    console.log('application:', applicationResponse.applicationId);
    console.log('contractor profile:', contractorProfileResponse.item.professionalId);
    console.log('quote:', quoteResponse.item.id);
    console.log('message:', messageResponse.item.id);
    console.log('quote 2:', quoteResponseTwo.item.id);
    console.log('message 2:', messageResponseTwo.item.id);
    console.log('contractor history:', contractorHistoryResponse.items.length, 'items');
    console.log('onboarding status:', onboardingStatusResponse.completedStages);
    console.log('onboarding step:', onboardingStepResponse.stage);
    console.log('whatsapp menu:', whatsappMenuResponse.session.screen);
    console.log('whatsapp quote:', whatsappQuoteConfirmResponse.session.screen);
    console.log('whatsapp register:', whatsappRegisterCompleteResponse.session.userId);
    console.log('whatsapp customer reset:', whatsappCustomerResetPassword.session.screen);
    console.log('whatsapp customer:', whatsappCustomerMenu.session.screen);
    console.log('whatsapp association:', whatsappAssociationMenu.session.screen);
    console.log('whatsapp admin:', whatsappAdminSession.item.screen);
    console.log('whatsapp professional:', whatsappProfessionalMenu.session.screen);
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
