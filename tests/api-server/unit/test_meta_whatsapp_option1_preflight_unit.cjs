const assert = require('assert');
const { buildReport, normalizeWhatsAppRecipient } = require('../../../scripts/meta_whatsapp_option1_preflight.cjs');

async function run() {
  assert.strictEqual(normalizeWhatsAppRecipient('082 345 3105'), '27823453105');
  assert.strictEqual(normalizeWhatsAppRecipient('+27823453105'), '27823453105');

  const ready = buildReport({
    WHATSAPP_WEBHOOK_TOKEN: 'verify-token',
    WHATSAPP_ACCESS_TOKEN: 'EAAExampleAccessToken',
    WHATSAPP_PHONE_NUMBER_ID: '123456789012345',
    WHATSAPP_TEST_RECIPIENT: '082 345 3105',
    WHATSAPP_SENDER_NUMBER: '082 555 0101'
  });
  assert.strictEqual(ready.ok, true);
  assert.strictEqual(ready.details.normalizedRecipient, '27823453105');
  assert.strictEqual(ready.issues.length, 0);

  const sameNumber = buildReport({
    WHATSAPP_WEBHOOK_TOKEN: 'verify-token',
    WHATSAPP_ACCESS_TOKEN: 'EAAExampleAccessToken',
    WHATSAPP_PHONE_NUMBER_ID: '123456789012345',
    WHATSAPP_TEST_RECIPIENT: '082 345 3105',
    WHATSAPP_SENDER_NUMBER: '27823453105'
  });
  assert.strictEqual(sameNumber.ok, false);
  assert.ok(sameNumber.issues.some((issue) => issue.includes('sender and recipient must be different')));

  const localGraph = buildReport({
    WHATSAPP_WEBHOOK_TOKEN: 'verify-token',
    WHATSAPP_ACCESS_TOKEN: 'EAAExampleAccessToken',
    WHATSAPP_PHONE_NUMBER_ID: 'abc-123',
    WHATSAPP_TEST_RECIPIENT: '27823453105',
    WHATSAPP_GRAPH_API_BASE_URL: 'http://127.0.0.1:3999/mock-meta'
  });
  assert.strictEqual(localGraph.ok, true);
  assert.ok(localGraph.warnings.some((warning) => warning.includes('local endpoint')));
  assert.ok(localGraph.warnings.some((warning) => warning.includes('does not look like a numeric Meta phone_number_id')));

  console.log('unit:test_meta_whatsapp_option1_preflight_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
