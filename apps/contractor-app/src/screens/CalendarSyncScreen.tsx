import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { fetchCalendarSync, upsertCalendarSync } from '../services/contractorData';

export default function CalendarSyncScreen() {
  const [googleStatus, setGoogleStatus] = useState('disconnected');
  const [outlookStatus, setOutlookStatus] = useState('disconnected');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    async function loadStatus() {
      setLoading(true);
      setError(null);
      try {
        const google = await fetchCalendarSync('google');
        setGoogleStatus(google ? 'connected' : 'disconnected');
        const outlook = await fetchCalendarSync('outlook');
        setOutlookStatus(outlook ? 'connected' : 'disconnected');
      } catch (e) {
        setError('Failed to load sync status');
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  const handleConnect = async (provider) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // In a real app, this would launch OAuth flow and get tokens
      await upsertCalendarSync(provider, { accessToken: 'demo-token', refreshToken: '', expiresAt: null });
      setSuccess(`${provider} connected!`);
      if (provider === 'google') setGoogleStatus('connected');
      if (provider === 'outlook') setOutlookStatus('connected');
    } catch (e) {
      setError(`Failed to connect ${provider}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendar Sync</Text>
      <View style={styles.row}>
        <Text>Google Calendar: {googleStatus}</Text>
        {googleStatus === 'disconnected' && <Button title="Connect" onPress={() => handleConnect('google')} />}
      </View>
      <View style={styles.row}>
        <Text>Outlook Calendar: {outlookStatus}</Text>
        {outlookStatus === 'disconnected' && <Button title="Connect" onPress={() => handleConnect('outlook')} />}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>{success}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' },
  error: { color: 'red', marginTop: 8 },
  success: { color: 'green', marginTop: 8 },
});
