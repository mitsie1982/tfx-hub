const assert = require('assert');
const contractorData = require('../../../apps/contractor-app/src/services/contractorData');

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
  contractorData.__setTestDependencies({
    auth: createAuthStub(),
    secureTokenStorage: {
      async getToken() {
        storageCalls.push('get');
        return 'persisted-session-token';
      },
      async setToken(token) {
        storageCalls.push(`set:${token}`);
      },
      async clearToken() {
        storageCalls.push('clear');
      }
    },
    createSharedLogicClient() {
      return {
        session: {
          async getCurrentUser() {
            return { id: 'user-001', email: 'contractor@example.com' };
          }
        }
      };
    }
  });

  const restored = await contractorData.restoreContractorSession();
  assert.strictEqual(restored.authenticated, true);
  assert.strictEqual(restored.user.email, 'contractor@example.com');
  assert.deepStrictEqual(storageCalls, ['get']);

  const expiredStorageCalls = [];
  contractorData.__setTestDependencies({
    auth: createAuthStub(),
    secureTokenStorage: {
      async getToken() {
        expiredStorageCalls.push('get');
        return 'expired-token';
      },
      async setToken(token) {
        expiredStorageCalls.push(`set:${token}`);
      },
      async clearToken() {
        expiredStorageCalls.push('clear');
      }
    },
    createSharedLogicClient() {
      return {
        session: {
          async getCurrentUser() {
            throw new Error('expired');
          }
        }
      };
    }
  });

  const expired = await contractorData.restoreContractorSession();
  assert.strictEqual(expired.authenticated, false);
  assert.strictEqual(expired.warning, 'Saved session expired. Please sign in again.');
  assert.deepStrictEqual(expiredStorageCalls, ['get', 'clear']);

  contractorData.__setTestDependencies({
    auth: createAuthStub(),
    secureTokenStorage: {
      async getToken() {
        return null;
      },
      async setToken() {},
      async clearToken() {}
    }
  });

  const sampleProjects = await contractorData.fetchProjects({ trade: 'All', search: 'plumbing' });
  assert.strictEqual(sampleProjects.source, 'sample');

  contractorData.__setTestDependencies({
    auth: createAuthStub(),
    secureTokenStorage: {
      async getToken() {
        return 'persisted-session-token';
      },
      async setToken() {},
      async clearToken() {}
    },
    createSharedLogicClient() {
      return {
        session: {
          async subscribeWhatsapp(phoneNumber) {
            return { item: { role: 'contractor', phoneNumber, subscribed: true } };
          }
        }
      };
    }
  });

  const subscription = await contractorData.subscribeContractorWhatsapp('+27710000001');
  assert.strictEqual(subscription.item.subscribed, true);
  assert.strictEqual(subscription.source, 'live');

  contractorData.__resetTestDependencies();
  console.log('unit:test_contractor_data_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    contractorData.__resetTestDependencies();
    console.error(error);
    process.exit(1);
  });
}