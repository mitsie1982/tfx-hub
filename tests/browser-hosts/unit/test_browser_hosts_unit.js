const assert = require('assert');
const contractorServer = require('../../../apps/contractor-app/server');
const customerServer = require('../../../apps/customer-app/server');
const adminServer = require('../../../apps/ams-app/server');
const membersServer = require('../../../apps/members-app/server');

async function startServer(factory) {
  const server = factory.createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  return server;
}

async function fetchHtml(server) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}`);
  const html = await response.text();
  assert.strictEqual(response.status, 200);
  return html;
}

async function fetchText(server, path) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
  const body = await response.text();
  assert.strictEqual(response.status, 200);
  return body;
}

async function postForm(server, path, form) {
  const address = server.address();
  const body = new URLSearchParams(form).toString();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'follow'
  });
  assert.strictEqual(response.status, 200);
  return response.text();
}

async function run() {
  const contractor = await startServer(contractorServer);
  const customer = await startServer(customerServer);
  const admin = await startServer(adminServer);
  const members = await startServer(membersServer);

  try {
    const contractorHtml = await fetchHtml(contractor);
    const customerHtml = await fetchHtml(customer);
    const adminHtml = await fetchHtml(admin);
    const membersHtml = await fetchHtml(members);

    assert.ok(contractorHtml.includes('Contractor Browser'));
    assert.ok(contractorHtml.includes('Matched Leads'));
    assert.ok(!contractorHtml.includes('Placeholder contractor-app'));

    assert.ok(customerHtml.includes('Customer Browser'));
    assert.ok(customerHtml.includes('Professional Directory'));
    assert.ok(!customerHtml.includes('Placeholder customer-app'));

    assert.ok(adminHtml.includes('Admin Browser Workspace'));
    assert.ok(adminHtml.includes('Contractor Directory'));
    assert.ok(adminHtml.includes('Admin Management'));
    assert.ok(!adminHtml.includes('Placeholder ams-app'));

    assert.ok(membersHtml.includes('Members Browser Workspace'));
    assert.ok(membersHtml.includes('Association Overview'));
    assert.ok(membersHtml.includes('Professional Directory'));
    assert.ok(!membersHtml.includes('Placeholder members-app'));

    const contractorPostHtml = await postForm(contractor, '/actions/interest', { projectId: 'job-101' });
    assert.ok(contractorPostHtml.includes('Interest recorded'));

    const contractorQuotePreviewHtml = await postForm(contractor, '/actions/quote', {
      projectId: 'job-101',
      amount: 'R12,500',
      timeline: '3 working days',
      note: 'Includes labour and materials'
    });
    assert.ok(contractorQuotePreviewHtml.includes('Confirm Quote'));
    assert.ok(contractorQuotePreviewHtml.includes('R12,500'));
    assert.ok(contractorQuotePreviewHtml.includes('Includes labour and materials'));

    const contractorQuoteConfirmHtml = await postForm(contractor, '/actions/quote', {
      projectId: 'job-101',
      amount: 'R12,500',
      timeline: '3 working days',
      note: 'Includes labour and materials',
      confirm: 'yes'
    });
    assert.ok(contractorQuoteConfirmHtml.includes('Quote recorded'));

    const contractorMessagePreviewHtml = await postForm(contractor, '/actions/message', {
      projectId: 'job-101',
      body: 'I can inspect this tomorrow morning.'
    });
    assert.ok(contractorMessagePreviewHtml.includes('Preview Message'));
    assert.ok(contractorMessagePreviewHtml.includes('I can inspect this tomorrow morning.'));

    const contractorMessageConfirmHtml = await postForm(contractor, '/actions/message', {
      projectId: 'job-101',
      body: 'I can inspect this tomorrow morning.',
      confirm: 'yes'
    });
    assert.ok(contractorMessageConfirmHtml.includes('Message recorded'));

    const contractorSubscribeHtml = await postForm(contractor, '/actions/subscribe-whatsapp', { phoneNumber: '+27710000001' });
    assert.ok(contractorSubscribeHtml.includes('subscribe') || contractorSubscribeHtml.includes('Subscribed') || contractorSubscribeHtml.includes('Sign in first'));

    const customerShortlistHtml = await postForm(customer, '/actions/shortlist', { professionalId: 'pro-001' });
    assert.ok(customerShortlistHtml.includes('Professional added to shortlist') || customerShortlistHtml.includes('Professional removed from shortlist'));

    const customerRequestHtml = await postForm(customer, '/actions/request-job', {
      title: 'WhatsApp-inspired plumbing request',
      trade: 'plumber',
      location: 'Midrand',
      budget: 'R5,000 - R8,000',
      urgency: 'Urgent',
      description: 'Need a plumber for a same-day leak repair.'
    });
    assert.ok(customerRequestHtml.includes('Job request recorded in sample mode') || customerRequestHtml.includes('Customer job request submitted'));

    const adminActionHtml = await postForm(admin, '/actions/admin-action', { professionalId: 'pro-001', actionType: 'tier-review' });
    assert.ok(adminActionHtml.includes('Tier review queued') || adminActionHtml.includes('Action recorded locally as sample data'));

    const adminSubscribeHtml = await postForm(admin, '/actions/subscribe-whatsapp', { phoneNumber: '+27710000004' });
    assert.ok(adminSubscribeHtml.includes('Admin WhatsApp access is disabled'));

    const adminCreateHtml = await postForm(admin, '/actions/admin-account-create', {
      firstName: 'Ops',
      lastName: 'Admin',
      email: 'ops-admin@example.com',
      username: 'ops.admin',
      password: 'change-me-now'
    });
    assert.ok(adminCreateHtml.includes('Managed admin') || adminCreateHtml.includes('sample admin management') || adminCreateHtml.includes('created'));

    const adminCsvExport = await fetchText(admin, '/exports/admin-audit.csv?outcome=denied');
    assert.ok(adminCsvExport.includes('eventType'));
    assert.ok(adminCsvExport.includes('denied') || adminCsvExport.includes('bootstrap_admin_reset_forbidden'));

    const membersAssociationActionHtml = await postForm(members, '/actions/association-action', { professionalId: 'pro-001', actionType: 'member-review' });
    assert.ok(membersAssociationActionHtml.includes('Member review queued') || membersAssociationActionHtml.includes('Showing association and professional sample data'));

    const membersProfessionalActionHtml = await postForm(members, '/actions/professional-action', { professionalId: 'pro-001', actionType: 'availability-check-in' });
    assert.ok(membersProfessionalActionHtml.includes('Availability check-in recorded') || membersProfessionalActionHtml.includes('Showing association and professional sample data'));

    console.log('unit:test_browser_hosts_unit OK');
  } finally {
    contractor.close();
    customer.close();
    admin.close();
    members.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}