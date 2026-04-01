import React from 'react';
import { SafeAreaView, Text } from 'react-native';
// OBSERVABILITY INIT - DO NOT REMOVE
const logger = require('@tfx/shared-logging')('ams-app');
logger.info('observability initialized', { env: process.env.NODE_ENV || 'dev' });

export default function App() {
  return (
    <SafeAreaView>
      <Text>ams-app - observability placeholder</Text>
    </SafeAreaView>
  );
}
