const assert = require('assert');
const amsData = require('../../../apps/ams-app/src/services/amsData');

function createAuthStub() {
  let token = null;
  let persistence = null;

  return {
    tokenStore: {
      set(nextToken) {
        token = nextToken;
        if (persistence && persistence.set) {
          Promise.resolve(persistence.set(nextToken)).catch(() => undefined);
        }
      },
      get() {
        return token;
      },
      clear() {
        token = null;
        if (persistence && persistence.clear) {
          Promise.resolve(persistence.clear()).catch(() => undefined);
        }
      },
      async hydrate() {
        token = persistence && persistence.get ? await persistence.get() : null;
        return token;
      },
      setPersistence(adapter) {
        persistence = adapter;
      }
    }
  };
}

async function run() {
  const storageCalls = [];
  amsData.__setTestDependencies({
    auth: createAuthStub(),
    secureTokenStorage: {
      async getToken() {
        storageCalls.push('get');
        return 'persisted-admin-token';
      },
      async setToken(token) {
        storageCalls.push(`set:${token}`);
      },
      async clearToken() {
        storageCalls.push('clear');
      }
    },
    createAMSApp() {
      return {
        account: {
          async getCurrentUser() {
            return { id: 'admin-001', email: 'admin@example.com' };
          }
        }
      };
    }
  });

  const restored = await amsData.restoreAdminSession();
  assert.strictEqual(restored.authenticated, true);
  assert.strictEqual(restored.user.email, 'admin@example.com');
  assert.deepStrictEqual(storageCalls, ['get']);

  amsData.__setTestDependencies({
    auth: createAuthStub(),
    secureTokenStorage: {
      async getToken() {
        return 'persisted-admin-token';
      },
      async setToken() {},
      async clearToken() {}
    },
    createAMSApp() {
      return {
        admin: {
          async listAccounts() {
            return [{ id: 'admin-001', username: 'local-admin-secret' }];
          },
          async listAuditEvents() {
            return [{ id: 'audit-001', outcome: 'success' }];
          },
          async exportAuditEvents() {
            return 'id,eventType\naudit-001,admin_login';
          },
          async createAccount(payload) {
            return { id: 'admin-ops-001', ...payload };
          },
          async requestPasswordReset(adminUserId) {
            return { ok: true, targetUserId: adminUserId, resetToken: 'reset-ops-001' };
          },
          async rotateCredentials(adminUserId, payload) {
            return { id: adminUserId, username: payload.username };
          }
        },
        contractors: {
          async getContractor(id) {
            return { id, name: 'Naledi Khumalo' };
          },
          async listAdminActions() {
            return [{ id: 'act-001', actionType: 'tier-review' }];
          },
          async runAdminAction(id, actionType) {
            return { id: 'act-002', professionalId: id, actionType };
          }
        }
      };
    }
  });

  const detail = await amsData.fetchAdminContractorDetail('pro-002');
  assert.strictEqual(detail.item.name, 'Naledi Khumalo');
  assert.strictEqual(detail.source, 'live');
  assert.ok(detail.item.tierReview);
  assert.ok(detail.item.compliance);
  assert.ok(Array.isArray(detail.item.disputes));
  assert.ok(Array.isArray(detail.item.adminActions));

  const action = await amsData.performAdminContractorAction('pro-002', 'tier-review');
  assert.strictEqual(action.item.actionType, 'tier-review');
  assert.strictEqual(action.source, 'live');

  const management = await amsData.fetchAdminManagement({ outcome: 'success' });
  assert.strictEqual(management.source, 'live');
  assert.strictEqual(management.accounts[0].id, 'admin-001');
  assert.ok(management.csvPreview.includes('eventType'));

  const createdAdmin = await amsData.createManagedAdminAccount({
    email: 'ops-admin@example.com',
    username: 'ops.admin',
    password: 'change-me-now',
    firstName: 'Ops',
    lastName: 'Admin'
  });
  assert.strictEqual(createdAdmin.item.username, 'ops.admin');

  const resetAdmin = await amsData.requestManagedAdminPasswordReset('admin-ops-001');
  assert.strictEqual(resetAdmin.item.targetUserId, 'admin-ops-001');

  const rotatedAdmin = await amsData.rotateManagedAdminCredentials('admin-ops-001', { username: 'ops.admin', password: 'temp-123456' });
  assert.strictEqual(rotatedAdmin.item.id, 'admin-ops-001');

  const subscription = await amsData.subscribeAdminWhatsapp('+27710000004');
  assert.strictEqual(subscription.item.subscribed, false);
  assert.strictEqual(subscription.source, 'sample');
  assert.ok(subscription.warning.includes('disabled'));

  amsData.__resetTestDependencies();
  console.log('unit:test_ams_data_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    amsData.__resetTestDependencies();
    console.error(error);
    process.exit(1);
  });
}