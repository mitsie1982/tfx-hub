const { createPostgresRepository } = require('../packages/api-server/src');
const { validateAdminBootstrapEnv } = require('../packages/api-server/src/adminAccess');

async function main() {
  validateAdminBootstrapEnv(process.env);
  const repository = createPostgresRepository();
  await repository.applySchema();
  console.log('Applied api-server schema to Postgres without demo seed data.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Postgres schema apply failed:', error && error.message ? error.message : error);
    process.exit(1);
  });
}
