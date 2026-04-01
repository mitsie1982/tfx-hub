/*
 e2e/appium/run_appium_test.js
 Simple Appium WebDriverIO test that connects to local Appium server.
*/
const { remote } = require('webdriverio');

async function run() {
  const opts = {
    path: '/wd/hub',
    port: 4723,
    capabilities: {
      platformName: 'Android',
      deviceName: 'emulator-5554',
      app: process.env.APP_APK || 'apps/ams-app/android/app/build/outputs/apk/debug/app-debug.apk',
      automationName: 'UiAutomator2'
    }
  };
  const client = await remote(opts);
  const activity = await client.getCurrentActivity();
  console.log('Current activity', activity);
  await client.deleteSession();
}

run().catch(e => { console.error(e); process.exit(1); });
