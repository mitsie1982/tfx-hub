/*
 packages/ams-app/src/accountWorkspace.js
 Session-backed account workspace for the admin app.
*/

function createAccountWorkspace(sessionApi) {
  if (!sessionApi || typeof sessionApi.login !== 'function' || typeof sessionApi.getCurrentUser !== 'function') {
    throw new Error('A session API helper is required');
  }

  return {
    async signIn(credentials) {
      return sessionApi.login(credentials);
    },

    async subscribeWhatsapp(phoneNumber) {
      return sessionApi.subscribeWhatsapp(phoneNumber);
    },

    async getCurrentUser() {
      const result = await sessionApi.getCurrentUser();
      return result.user || result.item || result;
    }
  };
}

module.exports = { createAccountWorkspace };
