import React from 'react';
import CustomerHome from './src/CustomerHome';
const logger = require('@tfx/shared-logging')('customer-app');

logger.info('observability initialized', { env: process.env.NODE_ENV || 'dev' });

export default function App() {
  return <CustomerHome />;
}