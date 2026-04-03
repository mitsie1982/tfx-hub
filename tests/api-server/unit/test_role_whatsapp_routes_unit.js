const assert = require('assert');
const { createApp, createMemoryRepository } = require('../../../packages/api-server/src');

const ADMIN_TEST_USERNAME = process.env.TFX_ADMIN_USERNAME || 'set-admin-username';
const ADMIN_TEST_EMAIL = process.env.TFX_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_TEST_PASSWORD = process.env.TFX_ADMIN_PASSWORD || 'set-admin-password';
const BUSINESS_HOURS_DATE = () => new Date('2026-04-02T07:00:00.000Z');

async function run() {
  const repository = await createMemoryRepository();
  await repository.initialize();
  await repository.createJob({
    id: 'job-003',
    title: 'Electrical compliance inspection',
    description: 'Homeowner needs a same-day electrical compliance inspection and certificate review.',
    trade: 'electrician',
    status: 'OPEN',
    budget: 'R2,000 - R3,500',
    location: 'Sandton',
    urgency: 'Today',
    posted: '5 min ago',
    leadType: 'Verified homeowner',
    matchScore: 88,
    clientId: 'client-001'
  });
  await repository.createJob({
    id: 'job-004',
    title: 'Bathroom repaint and tile sealing',
    description: 'Client needs bathroom prep, repainting, and tile resealing before move-in.',
    trade: 'painter',
    status: 'OPEN',
    budget: 'R6,500 - R9,000',
    location: 'Fourways',
    urgency: 'This week',
    posted: '9 min ago',
    leadType: 'Repeat customer',
    matchScore: 79,
    clientId: 'client-001'
  });
  await repository.appendContractorEvent({
    id: 'evt-001',
    professionalId: 'pro-003',
    jobId: 'job-001',
    type: 'quote',
    summary: 'Quote R8,900 sent for leak repair',
    status: 'sent'
  });
  await repository.appendContractorEvent({
    id: 'evt-002',
    professionalId: 'pro-003',
    jobId: 'job-002',
    type: 'message',
    summary: 'Follow-up message sent to homeowner',
    status: 'sent'
  });
  await repository.appendContractorEvent({
    id: 'evt-003',
    professionalId: 'pro-003',
    jobId: 'job-003',
    type: 'interest',
    summary: 'Interest sent for compliance inspection',
    status: 'sent'
  });
  await repository.appendContractorEvent({
    id: 'evt-004',
    professionalId: 'pro-003',
    jobId: 'job-004',
    type: 'message',
    summary: 'Painter quote follow-up sent',
    status: 'sent'
  });
  await repository.appendContractorEvent({
    id: 'evt-005',
    professionalId: 'pro-003',
    jobId: 'job-001',
    type: 'interest',
    summary: 'Second interest confirmation logged',
    status: 'sent'
  });
  await repository.appendContractorEvent({
    id: 'evt-006',
    professionalId: 'pro-003',
    jobId: 'job-002',
    type: 'quote',
    summary: 'Quote R18,500 sent for boundary wall work',
    status: 'sent'
  });

  const app = createApp({ repository, logger: { info() {}, warn() {}, error() {} }, getCurrentDate: BUSINESS_HOURS_DATE });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-association-id': 'assoc-contractor-demo' },
      body: JSON.stringify({ identifier: 'contractor@example.com', password: 'password123' })
    });
    const loginPayload = await loginResponse.json();
    assert.strictEqual(loginResponse.status, 200);

    const phoneLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-association-id': 'assoc-contractor-demo' },
      body: JSON.stringify({ identifier: '+27710000001', password: 'password123' })
    });
    assert.strictEqual(phoneLoginResponse.status, 200);

    const adminLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-association-id': 'assoc-admin-demo' },
      body: JSON.stringify({ identifier: ADMIN_TEST_USERNAME, password: ADMIN_TEST_PASSWORD })
    });
    assert.strictEqual(adminLoginResponse.status, 200);

    const adminEmailLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-association-id': 'assoc-admin-demo' },
      body: JSON.stringify({ identifier: ADMIN_TEST_EMAIL, password: ADMIN_TEST_PASSWORD })
    });
    if (ADMIN_TEST_EMAIL !== ADMIN_TEST_USERNAME) {
      assert.strictEqual(adminEmailLoginResponse.status, 401);
    } else {
      assert.strictEqual(adminEmailLoginResponse.status, 200);
    }

    const closedApp = createApp({ repository, logger: { info() {}, warn() {}, error() {} }, getCurrentDate: () => new Date('2026-04-02T18:00:00.000Z') });
    const closedServer = await new Promise((resolve) => {
      const instance = closedApp.listen(0, () => resolve(instance));
    });

    try {
      const closedBaseUrl = `http://127.0.0.1:${closedServer.address().port}`;
      const closedAdminLoginResponse = await fetch(`${closedBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-association-id': 'assoc-admin-demo' },
        body: JSON.stringify({ identifier: ADMIN_TEST_USERNAME, password: ADMIN_TEST_PASSWORD })
      });
      const closedAdminLoginPayload = await closedAdminLoginResponse.json();
      assert.strictEqual(closedAdminLoginResponse.status, 403);
      assert.strictEqual(closedAdminLoginPayload.error, 'admin_access_closed');
    } finally {
      closedServer.close();
    }

    const subscriptionResponse = await fetch(`${baseUrl}/user/whatsapp-subscription`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${loginPayload.token}`, 'x-association-id': 'assoc-contractor-demo' },
      body: JSON.stringify({ phoneNumber: '+27712223333' })
    });
    const subscriptionPayload = await subscriptionResponse.json();
    assert.strictEqual(subscriptionResponse.status, 200);
    assert.strictEqual(subscriptionPayload.item.phoneNumber, '+27712223333');
    const contractorPhoneNumber = subscriptionPayload.item.phoneNumber;

    const contractorResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: 'Hi' })
    });
    const contractorPayload = await contractorResponse.json();
    assert.strictEqual(contractorResponse.status, 200);
    assert.ok(contractorPayload.reply.includes('Welcome back, Naledi'));
    assert.ok(contractorPayload.reply.includes('Contractor snapshot'));
    assert.ok(contractorPayload.reply.includes('Completed jobs: 67'));
    assert.ok(contractorPayload.reply.includes('Response time: 12 min'));
    assert.ok(contractorPayload.reply.includes('7. Account Help'));

    const contractorAccountHelpResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: '7' })
    });
    const contractorAccountHelpPayload = await contractorAccountHelpResponse.json();
    assert.strictEqual(contractorAccountHelpResponse.status, 200);
    assert.ok(contractorAccountHelpPayload.reply.includes('Account help'));
    assert.ok(contractorAccountHelpPayload.reply.includes('contractor@example.com'));

    const contractorLinkedResetPromptResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: '1' })
    });
    const contractorLinkedResetPromptPayload = await contractorLinkedResetPromptResponse.json();
    assert.strictEqual(contractorLinkedResetPromptResponse.status, 200);
    assert.ok(contractorLinkedResetPromptPayload.reply.includes('Reset password for contractor@example.com'));

    const contractorLinkedResetRequestResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: 'YES' })
    });
    const contractorLinkedResetRequestPayload = await contractorLinkedResetRequestResponse.json();
    assert.strictEqual(contractorLinkedResetRequestResponse.status, 200);
    const contractorLinkedResetTokenMatch = contractorLinkedResetRequestPayload.reply.match(/Token: (reset-[^\n]+)/);
    assert.ok(contractorLinkedResetTokenMatch);

    const contractorLinkedResetTokenResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: contractorLinkedResetTokenMatch[1] })
    });
    const contractorLinkedResetTokenPayload = await contractorLinkedResetTokenResponse.json();
    assert.strictEqual(contractorLinkedResetTokenResponse.status, 200);
    assert.ok(contractorLinkedResetTokenPayload.reply.includes('Enter your new password'));

    const contractorLinkedResetPasswordResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: 'password123' })
    });
    const contractorLinkedResetPasswordPayload = await contractorLinkedResetPasswordResponse.json();
    assert.strictEqual(contractorLinkedResetPasswordResponse.status, 200);
    assert.ok(contractorLinkedResetPasswordPayload.reply.includes('Password reset complete'));

    const contractorLeadsResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: '2' })
    });
    const contractorLeadsPayload = await contractorLeadsResponse.json();
    assert.strictEqual(contractorLeadsResponse.status, 200);
    assert.ok(contractorLeadsPayload.reply.includes('Top leads for you'));
    assert.ok(contractorLeadsPayload.reply.includes('Showing 1-3 of 4 matched leads'));
    assert.ok(contractorLeadsPayload.reply.includes('Build garden wall'));
    assert.ok(contractorLeadsPayload.reply.includes('Electrical compliance inspection'));
    assert.ok(!contractorLeadsPayload.reply.includes('Bathroom repaint and tile sealing'));
    assert.ok(contractorLeadsPayload.reply.includes('Reply MORE for the next leads'));

    const contractorMoreLeadsResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: 'MORE' })
    });
    const contractorMoreLeadsPayload = await contractorMoreLeadsResponse.json();
    assert.strictEqual(contractorMoreLeadsResponse.status, 200);
    assert.ok(contractorMoreLeadsPayload.reply.includes('Showing 4-4 of 4 matched leads'));
    assert.ok(contractorMoreLeadsPayload.reply.includes('Bathroom repaint and tile sealing'));
    assert.ok(!contractorMoreLeadsPayload.reply.includes('Kitchen plumbing and leak repair'));

    const contractorFilterPromptResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: 'F' })
    });
    const contractorFilterPromptPayload = await contractorFilterPromptResponse.json();
    assert.strictEqual(contractorFilterPromptResponse.status, 200);
    assert.ok(contractorFilterPromptPayload.reply.includes('Enter a trade to filter your leads'));

    const contractorFilteredLeadsResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: 'plumber' })
    });
    const contractorFilteredLeadsPayload = await contractorFilteredLeadsResponse.json();
    assert.strictEqual(contractorFilteredLeadsResponse.status, 200);
    assert.ok(contractorFilteredLeadsPayload.reply.includes('Current trade filter: plumber'));
    assert.ok(contractorFilteredLeadsPayload.reply.includes('Kitchen plumbing and leak repair'));
    assert.ok(!contractorFilteredLeadsPayload.reply.includes('Build garden wall'));

    const contractorSearchPromptResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: 'S' })
    });
    const contractorSearchPromptPayload = await contractorSearchPromptResponse.json();
    assert.strictEqual(contractorSearchPromptResponse.status, 200);
    assert.ok(contractorSearchPromptPayload.reply.includes('Enter text to search your leads'));

    const contractorSearchResultsResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: 'kitchen' })
    });
    const contractorSearchResultsPayload = await contractorSearchResultsResponse.json();
    assert.strictEqual(contractorSearchResultsResponse.status, 200);
    assert.ok(contractorSearchResultsPayload.reply.includes('Current trade filter: plumber'));
    assert.ok(contractorSearchResultsPayload.reply.includes('Current text search: kitchen'));
    assert.ok(contractorSearchResultsPayload.reply.includes('Kitchen plumbing and leak repair'));
    assert.ok(!contractorSearchResultsPayload.reply.includes('Build garden wall'));

    const contractorClearSearchResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: 'C' })
    });
    const contractorClearSearchPayload = await contractorClearSearchResponse.json();
    assert.strictEqual(contractorClearSearchResponse.status, 200);
    assert.ok(!contractorClearSearchPayload.reply.includes('Current text search:'));
    assert.ok(contractorClearSearchPayload.reply.includes('Kitchen plumbing and leak repair'));

    const contractorAllTradesResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: 'A' })
    });
    const contractorAllTradesPayload = await contractorAllTradesResponse.json();
    assert.strictEqual(contractorAllTradesResponse.status, 200);
    assert.ok(contractorAllTradesPayload.reply.includes('Build garden wall'));
    assert.ok(contractorAllTradesPayload.reply.includes('Reply MORE for the next leads'));

    const contractorMenuBeforeActivityResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: 'M' })
    });
    assert.strictEqual(contractorMenuBeforeActivityResponse.status, 200);

    const contractorActivityResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: '3' })
    });
    const contractorActivityPayload = await contractorActivityResponse.json();
    assert.strictEqual(contractorActivityResponse.status, 200);
    assert.ok(contractorActivityPayload.reply.includes('Recent activity'));
    assert.ok(contractorActivityPayload.reply.includes('Showing 1-5 of'));
    assert.ok(contractorActivityPayload.reply.includes('Reply MORE for older activity'));
    assert.strictEqual(contractorActivityPayload.session.activeActivityPageOffset, 0);

    const contractorMoreActivityResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: contractorPhoneNumber, message: 'MORE' })
    });
    const contractorMoreActivityPayload = await contractorMoreActivityResponse.json();
    assert.strictEqual(contractorMoreActivityResponse.status, 200);
    assert.ok(contractorMoreActivityPayload.reply.includes('Showing 6-'));
    assert.ok(!contractorMoreActivityPayload.reply.includes('Showing 1-5 of'));
    assert.strictEqual(contractorMoreActivityPayload.session.activeActivityPageOffset, 5);

    const contractorResetStartResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660007', message: 'Hi' })
    });
    const contractorResetStartPayload = await contractorResetStartResponse.json();
    assert.strictEqual(contractorResetStartResponse.status, 200);
    assert.ok(contractorResetStartPayload.reply.includes('Reset contractor password'));

    const contractorResetChoiceResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660007', message: '3' })
    });
    const contractorResetChoicePayload = await contractorResetChoiceResponse.json();
    assert.strictEqual(contractorResetChoiceResponse.status, 200);
    assert.ok(contractorResetChoicePayload.reply.includes('Enter the email address on your contractor account'));

    const contractorResetRequestResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660007', message: 'contractor@example.com' })
    });
    const contractorResetRequestPayload = await contractorResetRequestResponse.json();
    assert.strictEqual(contractorResetRequestResponse.status, 200);
    assert.ok(contractorResetRequestPayload.reply.includes('Password reset requested for contractor@example.com'));
    const contractorResetTokenMatch = contractorResetRequestPayload.reply.match(/Token: (reset-[^\n]+)/);
    assert.ok(contractorResetTokenMatch);

    const contractorResetTokenResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660007', message: contractorResetTokenMatch[1] })
    });
    const contractorResetTokenPayload = await contractorResetTokenResponse.json();
    assert.strictEqual(contractorResetTokenResponse.status, 200);
    assert.ok(contractorResetTokenPayload.reply.includes('Enter your new password'));

    const contractorResetPasswordResponse = await fetch(`${baseUrl}/whatsapp/contractor/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660007', message: 'new-password-123' })
    });
    const contractorResetPasswordPayload = await contractorResetPasswordResponse.json();
    assert.strictEqual(contractorResetPasswordResponse.status, 200);
    assert.ok(contractorResetPasswordPayload.reply.includes('Password reset complete'));

    const contractorResetLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-association-id': 'assoc-contractor-demo' },
      body: JSON.stringify({ identifier: 'contractor@example.com', password: 'new-password-123' })
    });
    assert.strictEqual(contractorResetLoginResponse.status, 200);

    const customerResponse = await fetch(`${baseUrl}/whatsapp/customer/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000003', message: 'Hi' })
    });
    const customerPayload = await customerResponse.json();
    assert.strictEqual(customerResponse.status, 200);
    assert.ok(customerPayload.reply.includes('Welcome back, Ayanda'));

    const customerProfessionalsResponse = await fetch(`${baseUrl}/whatsapp/customer/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000003', message: '2' })
    });
    const customerProfessionalsPayload = await customerProfessionalsResponse.json();
    assert.strictEqual(customerProfessionalsResponse.status, 200);
    assert.ok(customerProfessionalsPayload.reply.includes('Top professionals'));

    const customerDetailResponse = await fetch(`${baseUrl}/whatsapp/customer/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000003', message: '1' })
    });
    const customerDetailPayload = await customerDetailResponse.json();
    assert.strictEqual(customerDetailResponse.status, 200);
    assert.ok(customerDetailPayload.reply.includes('Reply:'));

    const customerResetStartResponse = await fetch(`${baseUrl}/whatsapp/customer/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660003', message: 'Hi' })
    });
    const customerResetStartPayload = await customerResetStartResponse.json();
    assert.strictEqual(customerResetStartResponse.status, 200);
    assert.ok(customerResetStartPayload.reply.includes('Reset customer password'));

    const customerResetChoiceResponse = await fetch(`${baseUrl}/whatsapp/customer/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660003', message: '3' })
    });
    const customerResetChoicePayload = await customerResetChoiceResponse.json();
    assert.strictEqual(customerResetChoiceResponse.status, 200);
    assert.ok(customerResetChoicePayload.reply.includes('Enter the email address on your customer account'));

    const customerResetRequestResponse = await fetch(`${baseUrl}/whatsapp/customer/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660003', message: 'client@example.com' })
    });
    const customerResetRequestPayload = await customerResetRequestResponse.json();
    assert.strictEqual(customerResetRequestResponse.status, 200);
    assert.ok(customerResetRequestPayload.reply.includes('Password reset requested for client@example.com'));
    const customerResetTokenMatch = customerResetRequestPayload.reply.match(/Token: (reset-[^\n]+)/);
    assert.ok(customerResetTokenMatch);

    const customerResetTokenResponse = await fetch(`${baseUrl}/whatsapp/customer/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660003', message: customerResetTokenMatch[1] })
    });
    const customerResetTokenPayload = await customerResetTokenResponse.json();
    assert.strictEqual(customerResetTokenResponse.status, 200);
    assert.ok(customerResetTokenPayload.reply.includes('Enter your new password'));

    const customerResetPasswordResponse = await fetch(`${baseUrl}/whatsapp/customer/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660003', message: 'client-new-password-123' })
    });
    const customerResetPasswordPayload = await customerResetPasswordResponse.json();
    assert.strictEqual(customerResetPasswordResponse.status, 200);
    assert.ok(customerResetPasswordPayload.reply.includes('Password reset complete'));

    const customerResetLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-association-id': 'assoc-customer-demo' },
      body: JSON.stringify({ identifier: 'client@example.com', password: 'client-new-password-123' })
    });
    assert.strictEqual(customerResetLoginResponse.status, 200);

    const associationResponse = await fetch(`${baseUrl}/whatsapp/association/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000005', message: 'Hi' })
    });
    const associationPayload = await associationResponse.json();
    assert.strictEqual(associationResponse.status, 200);
    assert.ok(associationPayload.reply.includes('Welcome back, TFX'));

    const associationDirectoryResponse = await fetch(`${baseUrl}/whatsapp/association/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000005', message: '2' })
    });
    const associationDirectoryPayload = await associationDirectoryResponse.json();
    assert.strictEqual(associationDirectoryResponse.status, 200);
    assert.ok(associationDirectoryPayload.reply.includes('Professional directory'));

    const associationDetailResponse = await fetch(`${baseUrl}/whatsapp/association/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000005', message: '1' })
    });
    const associationDetailPayload = await associationDetailResponse.json();
    assert.strictEqual(associationDetailResponse.status, 200);
    assert.ok(associationDetailPayload.reply.includes('Reply:'));

    const associationActionResponse = await fetch(`${baseUrl}/whatsapp/association/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000005', message: '1' })
    });
    const associationActionPayload = await associationActionResponse.json();
    assert.strictEqual(associationActionResponse.status, 200);
    assert.ok(associationActionPayload.reply.includes('Member review queued'));

    const associationRegisterStartResponse = await fetch(`${baseUrl}/whatsapp/association/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660005', message: 'Hi' })
    });
    const associationRegisterStartPayload = await associationRegisterStartResponse.json();
    assert.strictEqual(associationRegisterStartResponse.status, 200);
    assert.ok(associationRegisterStartPayload.reply.includes('Register new association account'));

    const associationRegisterChoiceResponse = await fetch(`${baseUrl}/whatsapp/association/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660005', message: '2' })
    });
    const associationRegisterChoicePayload = await associationRegisterChoiceResponse.json();
    assert.strictEqual(associationRegisterChoiceResponse.status, 200);
    assert.ok(associationRegisterChoicePayload.reply.includes('full name'));

    await fetch(`${baseUrl}/whatsapp/association/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660005', message: 'Demo Association' })
    });
    const associationRegisterDoneResponse = await fetch(`${baseUrl}/whatsapp/association/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660005', message: 'association-new@example.com' })
    });
    const associationRegisterDonePayload = await associationRegisterDoneResponse.json();
    assert.strictEqual(associationRegisterDoneResponse.status, 200);
    assert.ok(associationRegisterDonePayload.reply.includes('Welcome back'));

    const adminResponse = await fetch(`${baseUrl}/whatsapp/admin/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000004', message: 'Hi' })
    });
    const adminPayload = await adminResponse.json();
    assert.strictEqual(adminResponse.status, 403);
    assert.ok(adminPayload.message.includes('disabled'));

    const professionalResponse = await fetch(`${baseUrl}/whatsapp/professional/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000006', message: 'Hi' })
    });
    const professionalPayload = await professionalResponse.json();
    assert.strictEqual(professionalResponse.status, 200);
    assert.ok(professionalPayload.reply.includes('Welcome back, Lerato'));

    const professionalDirectoryResponse = await fetch(`${baseUrl}/whatsapp/professional/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000006', message: '2' })
    });
    const professionalDirectoryPayload = await professionalDirectoryResponse.json();
    assert.strictEqual(professionalDirectoryResponse.status, 200);
    assert.ok(professionalDirectoryPayload.reply.includes('Professional directory'));

    const professionalDetailResponse = await fetch(`${baseUrl}/whatsapp/professional/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000006', message: '1' })
    });
    const professionalDetailPayload = await professionalDetailResponse.json();
    assert.strictEqual(professionalDetailResponse.status, 200);
    assert.ok(professionalDetailPayload.reply.includes('Reply:'));

    const professionalAvailabilityResponse = await fetch(`${baseUrl}/whatsapp/professional/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000006', message: '3' })
    });
    const professionalAvailabilityPayload = await professionalAvailabilityResponse.json();
    assert.strictEqual(professionalAvailabilityResponse.status, 200);
    assert.ok(professionalAvailabilityPayload.reply.includes('Availability check-in recorded'));

    const professionalRequestsResponse = await fetch(`${baseUrl}/whatsapp/professional/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27710000006', message: '5' })
    });
    const professionalRequestsPayload = await professionalRequestsResponse.json();
    assert.strictEqual(professionalRequestsResponse.status, 200);
    assert.ok(professionalRequestsPayload.reply.includes('Recent professional requests'));

    const professionalRegisterStartResponse = await fetch(`${baseUrl}/whatsapp/professional/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660006', message: 'Hi' })
    });
    const professionalRegisterStartPayload = await professionalRegisterStartResponse.json();
    assert.strictEqual(professionalRegisterStartResponse.status, 200);
    assert.ok(professionalRegisterStartPayload.reply.includes('Register new professional account'));

    await fetch(`${baseUrl}/whatsapp/professional/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660006', message: '2' })
    });
    await fetch(`${baseUrl}/whatsapp/professional/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660006', message: 'Lebo Sparks' })
    });
    await fetch(`${baseUrl}/whatsapp/professional/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660006', message: 'electrician' })
    });
    const professionalRegisterDoneResponse = await fetch(`${baseUrl}/whatsapp/professional/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+27716660006', message: 'professional-new@example.com' })
    });
    const professionalRegisterDonePayload = await professionalRegisterDoneResponse.json();
    assert.strictEqual(professionalRegisterDoneResponse.status, 200);
    assert.ok(professionalRegisterDonePayload.reply.includes('Welcome back'));

    const roleSelectResponse = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{ from: '27718889999', text: { body: 'Hi' } }]
            }
          }]
        }]
      })
    });
    const roleSelectPayload = await roleSelectResponse.json();
    assert.strictEqual(roleSelectResponse.status, 200);
    assert.ok(roleSelectPayload.replies[0].reply.reply.includes('Reply with your role'));
    assert.ok(!roleSelectPayload.replies[0].reply.reply.includes('Admin'));

    console.log('unit:test_role_whatsapp_routes_unit OK');
  } finally {
    server.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}