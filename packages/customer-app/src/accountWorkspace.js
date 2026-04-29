/*
 packages/customer-app/src/accountWorkspace.js
 Session-backed account workspace for the customer app.
*/

function createAccountWorkspace(sessionApi) {
  if (!sessionApi || typeof sessionApi.login !== 'function' || typeof sessionApi.register !== 'function') {
    throw new Error('A session API helper is required');
  }

  return {
    async signIn(credentials) {
      return sessionApi.login(credentials);
    },

    async register(payload) {
      return sessionApi.register({ ...payload, role: payload.role || 'client' });
    },

    async requestPasswordReset(email) {
      if (!email) {
        throw new Error('email is required');
      }
      return sessionApi.requestPasswordReset({ email });
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
