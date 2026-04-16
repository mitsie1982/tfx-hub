function createAdminWorkspace(adminApi) {
  if (!adminApi || typeof adminApi.listAccounts !== 'function') {
    throw new Error('An admin API helper is required');
  }

  return {
    async listAccounts() {
      const result = await adminApi.listAccounts();
      return result.items || [];
    },

    async createAccount(payload) {
      const result = await adminApi.createAccount(payload);
      return result.item || result;
    },

    async rotateCredentials(adminUserId, payload) {
      const result = await adminApi.rotateCredentials(adminUserId, payload);
      return result.item || result;
    },

    async requestPasswordReset(adminUserId) {
      return adminApi.requestPasswordReset(adminUserId);
    },

    async listAuditEvents(filters) {
      const result = await adminApi.listAuditEvents(filters);
      return result.items || [];
    },

    async exportAuditEvents(filters) {
      return adminApi.exportAuditEvents(filters);
    }
  };
}

module.exports = { createAdminWorkspace };
