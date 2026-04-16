const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  const filePath = path.join(__dirname, '../../../apps/contractor-app/src/screens/LoginScreen.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes('Create a contractor account with trade and mobile number'));
  assert.ok(source.includes('RSA mobile number'));
  assert.ok(source.includes('placeholder="+27710000001"'));
  assert.ok(source.includes('phoneNumber: string;'));
  assert.ok(source.includes('onPhoneNumberChange: (value: string) => void;'));

  console.log('unit:test_login_screen_ui_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
