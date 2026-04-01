import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import { Button } from '@tfx/shared-ui';

export default function ContractorHome() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>TFX Hub Contractor (Example)</Text>
      <Button title="Browse Projects" onPress={() => console.log('Browse Projects pressed')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 20, marginBottom: 16 }
});
