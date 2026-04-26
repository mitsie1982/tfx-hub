const assert = require('assert');
const { createProfessionalsDirectory } = require('../../../packages/customer-app/src/professionalsDirectory');

async function run() {
  const professionalsApi = {
    async listProfessionals(filters) {
      return { items: [{ id: 'pro-001', trade: filters.trade || 'plumber' }] };
    },
    async getProfessional(professionalId) {
      return { item: { id: professionalId, name: 'John Smit' } };
    },
    async listShortlist() {
      return { items: ['pro-001'] };
    },
    async addToShortlist() {
      return { shortlisted: true };
    },
    async removeFromShortlist() {
      return { shortlisted: false };
    }
  };

  const directory = createProfessionalsDirectory(professionalsApi);
  const professionals = await directory.browse({ trade: 'plumber' });
  assert.strictEqual(professionals[0].trade, 'plumber');

  const profile = await directory.getProfile('pro-001');
  assert.strictEqual(profile.name, 'John Smit');

  const shortlist = await directory.listShortlist();
  assert.deepStrictEqual(shortlist, ['pro-001']);

  const added = await directory.addToShortlist('pro-001');
  assert.strictEqual(added, true);

  const removed = await directory.removeFromShortlist('pro-001');
  assert.strictEqual(removed, false);

  console.log('unit:test_professionals_directory_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
