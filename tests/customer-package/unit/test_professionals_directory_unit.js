const assert = require('assert');
const { createProfessionalsDirectory } = require('../../../packages/customer-app/src/professionalsDirectory');

async function run() {
  const professionalsApi = {
    async listProfessionals(filters) {
      return { items: [{ id: 'pro-001', trade: filters.trade || 'plumber' }] };
    },
    async getProfessional(professionalId) {
      return { item: { id: professionalId, name: 'John Smit' } };
    }
  };

  const directory = createProfessionalsDirectory(professionalsApi);
  const professionals = await directory.browse({ trade: 'plumber' });
  assert.strictEqual(professionals[0].trade, 'plumber');

  const profile = await directory.getProfile('pro-001');
  assert.strictEqual(profile.name, 'John Smit');

  console.log('unit:test_professionals_directory_unit OK');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}