const assert = require('assert');
const { createMemoryRepository } = require('../../../packages/api-server/src');
const { createWhatsappAdminService } = require('../../../packages/api-server/src/whatsappAdmin');

async function run() {
  const repository = await createMemoryRepository();
  await repository.initialize();

  const service = createWhatsappAdminService({
    repository,
    logger: { info() {}, warn() {}, error() {} },
    createId(prefix) {
      return `${prefix}-unit`;
    }
  });

  const menuResponse = await service.handleIncomingMessage({ phoneNumber: '+27710000004', message: 'Hi' });
  assert.ok(menuResponse.reply.includes('Welcome back, Platform.'));

  const emptyActionsResponse = await service.handleIncomingMessage({ phoneNumber: '+27710000004', message: '3' });
  assert.ok(emptyActionsResponse.reply.includes('No admin actions recorded yet.'));
  assert.strictEqual(emptyActionsResponse.session.screen, 'recent_actions');
  assert.strictEqual(emptyActionsResponse.session.activeActionPageOffset, 0);

  for (let index = 1; index <= 6; index += 1) {
    await repository.createAdminAction({
      id: `admin-action-${index}`,
      professionalId: index % 2 === 0 ? 'pro-003' : 'pro-001',
      actionType: index % 3 === 0 ? 'compliance-review' : 'tier-review',
      summary: `Admin action ${index}`,
      note: 'Seeded for admin WhatsApp pagination.',
      createdBy: 'admin-001'
    });
  }

  const firstPageResponse = await service.handleIncomingMessage({ phoneNumber: '+27710000004', message: '3' });
  assert.ok(firstPageResponse.reply.includes('Recent admin actions'));
  assert.ok(firstPageResponse.reply.includes('Showing 1-5 of 6 actions'));
  assert.ok(firstPageResponse.reply.includes('Reply MORE for older actions.'));
  assert.strictEqual(firstPageResponse.session.screen, 'recent_actions');
  assert.strictEqual(firstPageResponse.session.activeActionPageOffset, 0);

  const secondPageResponse = await service.handleIncomingMessage({ phoneNumber: '+27710000004', message: 'MORE' });
  assert.ok(secondPageResponse.reply.includes('Showing 6-6 of 6 actions'));
  assert.ok(secondPageResponse.reply.includes('Admin action'));
  assert.ok(!secondPageResponse.reply.includes('Reply MORE for older actions.'));
  assert.strictEqual(secondPageResponse.session.screen, 'recent_actions');
  assert.strictEqual(secondPageResponse.session.activeActionPageOffset, 5);

  const menuAgainResponse = await service.handleIncomingMessage({ phoneNumber: '+27710000004', message: 'M' });
  assert.ok(menuAgainResponse.reply.includes('Operations Overview'));

  console.log('unit:test_whatsapp_admin_service_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}