/*
 packages/shared-logging/src/index.js
 Structured logger with adapters for console and external providers.
 Usage:
   const logger = require('@tfx/shared-logging')('service-name');
   logger.info('message', { requestId, userId });
*/
const { v4: uuidv4 } = require('uuid');

function createLogger(serviceName = 'app') {
  const level = process.env.LOG_LEVEL || 'info';

  function format(levelStr, msg, meta) {
    const ts = new Date().toISOString();
    const base = { ts, level: levelStr, service: serviceName };
    const payload = Object.assign({}, base, { message: msg }, meta || {});
    // Structured JSON output for ingestion
    return JSON.stringify(payload);
  }

  function sendToConsole(levelStr, msg, meta) {
    const out = format(levelStr, msg, meta);
    if (levelStr === 'error') console.error(out);
    else if (levelStr === 'warn') console.warn(out);
    else console.log(out);
  }

  // Placeholder adapter for Sentry
  function sendToSentry(levelStr, msg, meta) {
    // In production, call Sentry.captureException or captureMessage
    // Example: Sentry.captureMessage(msg, { level: levelStr, extra: meta })
  }

  // Placeholder adapter for Crashlytics
  function sendToCrashlytics(levelStr, msg, meta) {
    // In production, call Crashlytics logging APIs
  }

  return {
    child: (name) => createLogger(`${serviceName}:${name}`),
    info: (msg, meta) => { sendToConsole('info', msg, meta); },
    warn: (msg, meta) => { sendToConsole('warn', msg, meta); sendToSentry('warning', msg, meta); },
    error: (msg, meta) => { sendToConsole('error', msg, meta); sendToSentry('error', msg, meta); sendToCrashlytics('error', msg, meta); },
    debug: (msg, meta) => { if (process.env.LOG_LEVEL === 'debug') sendToConsole('debug', msg, meta); },
    startRequest: (reqMeta = {}) => {
      const requestId = reqMeta.requestId || uuidv4();
      return { requestId, log: createLogger(`${serviceName}:request`) , meta: Object.assign({ requestId }, reqMeta) };
    }
  };
}

module.exports = (serviceName) => createLogger(serviceName);
