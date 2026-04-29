import React from 'react';
import MembersHome from './src/MembersHome';
const logger = require('@tfx/shared-logging')('members-app');

logger.info('observability initialized', { env: process.env.NODE_ENV || 'dev' });

export default function App() {
  return <MembersHome />;
}
