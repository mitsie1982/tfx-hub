// Observability: Sentry and New Relic integration
const Sentry = require('@sentry/node');
const newrelic = require('newrelic'); // Assumes New Relic agent is installed and configured

function initObservability() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN });
  }
}

function captureError(err, req) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, { extra: { url: req?.originalUrl, method: req?.method } });
  }
  if (typeof newrelic.noticeError === 'function') {
    newrelic.noticeError(err);
  }
}

module.exports = { initObservability, captureError };
