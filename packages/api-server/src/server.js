const logger = require('@tfx/shared-logging')('api-server');
const { createApp, createPostgresRepository } = require('./index');
const { validateAdminBootstrapEnv } = require('./adminAccess');

async function main() {
  validateAdminBootstrapEnv(process.env);

  const repository = createPostgresRepository();
  await repository.initialize({ seedDemoData: String(process.env.TFX_API_ENABLE_DEMO_SEED || '').toLowerCase() === 'true' });

  const app = createApp({ repository, logger });
  const port = Number(process.env.PORT || 3000);

  app.listen(port, () => {
    logger.info('api server listening', { port });
  });
}

main().catch((error) => {
  logger.error('api server failed to start', { message: error.message });
  process.exit(1);
});