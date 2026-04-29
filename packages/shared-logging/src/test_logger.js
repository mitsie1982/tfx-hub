const loggerFactory = require('./index');
const logger = loggerFactory('shared-logging-test');
logger.info('logger initialized', { env: process.env.NODE_ENV || 'dev' });
logger.error('test error', { code: 'TEST_ERR', detail: 'This is a test error' });
console.log('Shared logging test complete');
