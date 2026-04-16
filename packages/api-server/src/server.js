// --- OpenTelemetry Tracing Setup ---
// To enable distributed tracing, install OpenTelemetry dependencies:
//   pnpm add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/instrumentation-express @opentelemetry/auto-instrumentations-node
// This block initializes tracing for Express and outbound HTTP calls.
let otelShutdown = null;
try {
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
  const sdk = new NodeSDK({
    serviceName: 'tfxhub-api-server',
    instrumentations: [getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true }
    })]
  });
  sdk.start();
  otelShutdown = sdk.shutdown;
  process.on('SIGTERM', () => otelShutdown && otelShutdown());
} catch (e) {
  // OpenTelemetry not installed; tracing is disabled.
}

const logger = require('@tfx/shared-logging')('api-server');
const { createApp, createPostgresRepository } = require('./index');
const { validateAdminBootstrapEnv } = require('./adminAccess');

function readAdminAccessPolicyFromEnv(env = process.env) {
  return {
    allowAfterHours: String(env.TFX_ADMIN_ALLOW_AFTER_HOURS || '').trim()
  };
}

async function main() {
  validateAdminBootstrapEnv(process.env);

  const repository = createPostgresRepository();
  await repository.initialize({ seedDemoData: String(process.env.TFX_API_ENABLE_DEMO_SEED || '').toLowerCase() === 'true' });

  const app = createApp({ repository, logger, adminAccessPolicy: readAdminAccessPolicyFromEnv(process.env) });
  const port = Number(process.env.PORT || 3000);

  app.listen(port, () => {
    logger.info('api server listening', { port });
  });
}

main().catch((error) => {
  logger.error('api server failed to start', { message: error.message });
  process.exit(1);
});
