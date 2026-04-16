function normalizeWhatsAppRecipient(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (digits.startsWith('27')) {
    return digits;
  }

  if (digits.startsWith('0')) {
    return `27${digits.slice(1)}`;
  }

  return digits;
}

function maskValue(value) {
  const text = String(value || '');
  if (!text) {
    return 'missing';
  }
  if (text.length <= 8) {
    return `${text.slice(0, 2)}***${text.slice(-1)}`;
  }
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
}

function isLikelyPhoneNumberId(value) {
  return /^\d{6,}$/.test(String(value || '').trim());
}

function buildReport(env) {
  const verifyToken = String(env.WHATSAPP_WEBHOOK_TOKEN || '').trim();
  const accessToken = String(env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneNumberId = String(env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const senderNumber = normalizeWhatsAppRecipient(env.WHATSAPP_SENDER_NUMBER || '');
  const rawRecipient = String(env.WHATSAPP_TEST_RECIPIENT || '').trim();
  const normalizedRecipient = normalizeWhatsAppRecipient(rawRecipient);
  const graphBaseUrl = String(env.WHATSAPP_GRAPH_API_BASE_URL || '').trim() || 'https://graph.facebook.com/v18.0';

  const issues = [];
  const warnings = [];

  if (!verifyToken) {
    issues.push('WHATSAPP_WEBHOOK_TOKEN is missing');
  }

  if (!accessToken) {
    issues.push('WHATSAPP_ACCESS_TOKEN is missing');
  }

  if (!phoneNumberId) {
    issues.push('WHATSAPP_PHONE_NUMBER_ID is missing');
  } else if (!isLikelyPhoneNumberId(phoneNumberId)) {
    warnings.push('WHATSAPP_PHONE_NUMBER_ID does not look like a numeric Meta phone_number_id');
  }

  if (!rawRecipient) {
    issues.push('WHATSAPP_TEST_RECIPIENT is missing');
  } else if (!normalizedRecipient) {
    issues.push('WHATSAPP_TEST_RECIPIENT could not be normalized');
  }

  if (normalizedRecipient && normalizedRecipient.length < 10) {
    warnings.push('WHATSAPP_TEST_RECIPIENT looks shorter than an expected WhatsApp number');
  }

  if (senderNumber && normalizedRecipient && senderNumber === normalizedRecipient) {
    issues.push('WHATSAPP_SENDER_NUMBER matches WHATSAPP_TEST_RECIPIENT; sender and recipient must be different numbers');
  }

  if (graphBaseUrl.includes('127.0.0.1') || graphBaseUrl.includes('localhost')) {
    warnings.push('WHATSAPP_GRAPH_API_BASE_URL points to a local endpoint, not live Meta');
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    details: {
      verifyTokenPresent: Boolean(verifyToken),
      accessTokenMasked: maskValue(accessToken),
      phoneNumberId,
      senderNumber: senderNumber || 'not provided',
      rawRecipient: rawRecipient || 'missing',
      normalizedRecipient: normalizedRecipient || 'missing',
      graphBaseUrl
    }
  };
}

function printReport(report) {
  console.log('Meta WhatsApp Option 1 preflight');
  console.log(`status: ${report.ok ? 'ready' : 'not-ready'}`);
  console.log(`verify token present: ${report.details.verifyTokenPresent ? 'yes' : 'no'}`);
  console.log(`access token: ${report.details.accessTokenMasked}`);
  console.log(`phone number id: ${report.details.phoneNumberId || 'missing'}`);
  console.log(`sender number: ${report.details.senderNumber}`);
  console.log(`recipient raw: ${report.details.rawRecipient}`);
  console.log(`recipient normalized: ${report.details.normalizedRecipient}`);
  console.log(`graph base url: ${report.details.graphBaseUrl}`);

  if (report.warnings.length) {
    console.log('warnings:');
    report.warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (report.issues.length) {
    console.log('issues:');
    report.issues.forEach((issue) => console.log(`- ${issue}`));
  }
}

function main() {
  const report = buildReport(process.env);
  printReport(report);
  process.exit(report.ok ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildReport,
  normalizeWhatsAppRecipient
};
