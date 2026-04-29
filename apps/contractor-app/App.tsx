import React from 'react';
import ContractorHome from './src/ContractorHome';
// OBSERVABILITY INIT - DO NOT REMOVE
const logger = require('@tfx/shared-logging')('contractor-app');
// Example: initialize Sentry here using process.env.SENTRY_DSN
// if (process.env.SENTRY_DSN) { /* Sentry.init({ dsn: process.env.SENTRY_DSN }) */ }
logger.info('observability initialized', { env: process.env.NODE_ENV || 'dev' });

export default function App() { return <ContractorHome />; }
