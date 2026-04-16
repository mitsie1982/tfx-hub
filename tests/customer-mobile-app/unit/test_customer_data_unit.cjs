const assert = require('assert');
const customerData = require('../../../apps/customer-app/src/services/customerData');

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
  customerData.__setTestDependencies({
    auth: createAuthStub(),
    secureTokenStorage: {
      async getToken() {
        storageCalls.push('get');
        return 'persisted-token';
      },
      async setToken(token) {
        storageCalls.push(`set:${token}`);
      },
      async clearToken() {
        storageCalls.push('clear');
      }
    },
    createCustomerApp() {
      return {
        account: {
          async getCurrentUser() {
            return { id: 'client-001', email: 'client@example.com' };
          }
        }
      };
    }
  });

  const restored = await customerData.restoreCustomerSession();
  assert.strictEqual(restored.authenticated, true);
  assert.strictEqual(restored.user.email, 'client@example.com');
  assert.deepStrictEqual(storageCalls, ['get']);

  customerData.__setTestDependencies({
    auth: createAuthStub(),
    secureTokenStorage: {
      async getToken() {
        return 'persisted-token';
      },
      async setToken() {},
      async clearToken() {}
    },
    createCustomerApp() {
      return {
        professionals: {
          async getProfile(id) {
            return { id, name: 'John Smit' };
          }
        }
      };
    }
  });

  const detail = await customerData.fetchCustomerProfessionalDetail('pro-001');
  assert.strictEqual(detail.item.name, 'John Smit');
  assert.strictEqual(detail.source, 'live');
  assert.ok(Array.isArray(detail.item.credentials));
  assert.ok(Array.isArray(detail.item.portfolioHighlights));
  assert.ok(Array.isArray(detail.item.reviewHighlights));

  let registerPayload = null;
  customerData.__setTestDependencies({
    auth: createAuthStub(),
    secureTokenStorage: {
      async getToken() {
        return null;
      },
      async setToken() {},
      async clearToken() {}
    },
    createCustomerApp() {
      return {
        account: {
          async register(payload) {
            registerPayload = payload;
            return { user: { id: 'client-002', email: payload.email } };
          }
        }
      };
    }
  });

  const registered = await customerData.registerCustomer({
    email: 'new-client@example.com',
    password: 'password123',
    firstName: 'New',
    lastName: 'Client',
    phoneNumber: '+27710000998'
  });
  assert.strictEqual(registered.user.email, 'new-client@example.com');
  assert.strictEqual(registerPayload.phoneNumber, '+27710000998');

  const shortlistAdd = await customerData.toggleCustomerProfessionalShortlist('pro-001');
  assert.strictEqual(shortlistAdd.shortlisted, true);
  assert.deepStrictEqual(await customerData.getCustomerProfessionalShortlist(), ['pro-001']);

  const contactRequest = customerData.buildCustomerContactRequest({
    id: 'pro-001',
    name: 'John Smit',
    trade: 'plumber',
    serviceArea: 'Johannesburg North',
    availability: 'Available this afternoon',
    summary: 'Residential plumbing specialist.'
  });
  assert.ok(contactRequest.title.includes('John Smit'));
  assert.strictEqual(contactRequest.trade, 'plumber');

  const shortlistRemove = await customerData.toggleCustomerProfessionalShortlist('pro-001');
  assert.strictEqual(shortlistRemove.shortlisted, false);

  customerData.__resetTestDependencies();
  console.log('unit:test_customer_data_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    customerData.__resetTestDependencies();
    console.error(error);
    process.exit(1);
  });
}
