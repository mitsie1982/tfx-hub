const { createSharedLogicClient } = require('../packages/shared-logic/src/sharedLogicClient');
const { createApp, createPostgresRepository } = require('../packages/api-server/src');

function hasDatabaseConfig() {
  return Boolean(
    process.env.DATABASE_URL
    || (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME)
  );
}

async function main() {
  if (!hasDatabaseConfig()) {
    console.error('Postgres smoke test skipped: DATABASE_URL or DB_HOST/DB_USER/DB_NAME is not configured.');
    process.exit(2);
  }

  const repository = createPostgresRepository();
  await repository.initialize();

  const app = createApp({ repository });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address();
  const baseURL = `http://127.0.0.1:${address.port}`;
  const client = createSharedLogicClient({
    baseURL,
    context: {
      associationId: 'assoc-contractor-demo',
      platform: 'node',
      appVersion: 'smoke-test'
    }
  });

  try {
    const login = await client.session.login({ email: 'contractor@example.com', password: 'password123' });
    const user = await client.session.getCurrentUser();
    const jobs = await client.jobs.listJobs({ status: 'OPEN' });
    const profile = await client.contractor.getProfile();

    console.log('login:', login.user.email);
    console.log('user:', user.id);
    console.log('jobs:', Array.isArray(jobs.items) ? jobs.items.length : 0);
    console.log('profile:', profile.item.professionalId);
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error('Postgres smoke test failed:', error && error.message ? error.message : error);
  process.exit(1);
});