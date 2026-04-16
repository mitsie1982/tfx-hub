const assert = require('assert');
const membersData = require('../../../apps/members-app/src/services/membersData');

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
  membersData.__setTestDependencies({
    auth: createAuthStub(),
    secureTokenStorage: {
      async getToken() {
        return 'persisted-members-token';
      },
      async setToken() {},
      async clearToken() {}
    },
    createMembersApp() {
      return {
        association: {
          async getOverview() {
            return { totals: { openJobs: 1, inProgressJobs: 2, completedJobs: 3, professionals: 4 } };
          },
          async runOperationalAction(professionalId, actionType) {
            return { id: 'assoc-op-001', professionalId, actionType, summary: 'Member review queued' };
          }
        },
        professionals: {
          async getProfile(professionalId) {
            return { id: professionalId, name: 'Lerato Ndlovu' };
          },
          async submitOperationalRequest(actionType, payload, professionalId) {
            return { id: 'pro-op-001', professionalId, actionType, summary: 'Availability check-in recorded' };
          },
          async listOperationalRequests() {
            return [{ id: 'pro-op-002', actionType: 'availability-check-in' }];
          }
        }
      };
    }
  });

  const overview = await membersData.fetchAssociationMobileOverview();
  const assocAction = await membersData.performAssociationOperationalAction('pro-001', 'member-review');
  const profile = await membersData.fetchProfessionalMobileProfile('pro-101');
  const profAction = await membersData.performProfessionalOperationalAction('availability-check-in', 'pro-101');
  const requests = await membersData.fetchProfessionalOperationalRequests('pro-101');

  assert.strictEqual(overview.source, 'live');
  assert.strictEqual(assocAction.item.actionType, 'member-review');
  assert.strictEqual(profile.item.name, 'Lerato Ndlovu');
  assert.strictEqual(profAction.item.actionType, 'availability-check-in');
  assert.strictEqual(requests.items[0].actionType, 'availability-check-in');

  membersData.__resetTestDependencies();
  console.log('unit:test_members_data_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    membersData.__resetTestDependencies();
    console.error(error);
    process.exit(1);
  });
}
