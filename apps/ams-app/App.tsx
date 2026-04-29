import React from 'react';
import AMSHome from './src/AMSHome';
// OBSERVABILITY INIT - DO NOT REMOVE
const logger = require('@tfx/shared-logging')('ams-app');
logger.info('observability initialized', { env: process.env.NODE_ENV || 'dev' });

export default function App() {
  return <AMSHome />;
}
