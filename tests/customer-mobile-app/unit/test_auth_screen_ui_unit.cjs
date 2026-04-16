const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  const filePath = path.join(__dirname, '../../../apps/customer-app/src/screens/AuthScreen.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes('create an account with your mobile number'));
  assert.ok(source.includes('RSA mobile number (+27710000003)'));
  assert.ok(source.includes("registration: { email: string; password: string; firstName: string; lastName: string; phoneNumber: string }"));
  assert.ok(source.includes("authMode === 'register' ? 'Create Profile' : 'Request Reset'"));

  console.log('unit:test_auth_screen_ui_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
