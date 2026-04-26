let keychain = null;

try {
  keychain = require('react-native-keychain');
} catch (error) {
  keychain = null;
}

const SERVICE = 'tfxhub.contractor.session';
let memoryToken = null;

async function getToken() {
  if (keychain && typeof keychain.getGenericPassword === 'function') {
    const credentials = await keychain.getGenericPassword({ service: SERVICE });
    return credentials ? credentials.password : null;
  }

  return memoryToken;
}

async function setToken(token) {
  if (keychain && typeof keychain.setGenericPassword === 'function') {
    await keychain.setGenericPassword('session', token, { service: SERVICE });
    return;
  }

  memoryToken = token;
}

async function clearToken() {
  if (keychain && typeof keychain.resetGenericPassword === 'function') {
    await keychain.resetGenericPassword({ service: SERVICE });
    return;
  }

  memoryToken = null;
}

module.exports = {
  getToken,
  setToken,
  clearToken
};
