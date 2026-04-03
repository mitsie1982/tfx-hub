import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LeadHistoryItem } from '../types';

type Props = {
  history: LeadHistoryItem[];
};

export default function LeadHistoryScreen({ history }: Props) {
  return (
    <View>
      <Text style={styles.title}>Lead history</Text>
      <Text style={styles.subtitle}>Quotes, messages, and interest actions are tracked here.</Text>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptyText}>When you send interest, a quote, or a message, it will appear here.</Text>
        </View>
      ) : null}

      {history.map((item) => (
        <View key={item.id} style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyType}>{item.type.toUpperCase()}</Text>
            <Text style={styles.historyDate}>{item.createdAt}</Text>
          </View>
          <Text style={styles.historyJob}>{item.jobTitle}</Text>
          <Text style={styles.historySummary}>{item.summary}</Text>
          <Text style={styles.historyMeta}>{item.status} · {item.source}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: '#18231c', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#5f6d64', marginBottom: 14 },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12
  },
  emptyTitle: { color: '#18231c', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#5f6d64', fontSize: 14, textAlign: 'center' },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e4dfd5'
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  historyType: { color: '#123524', fontSize: 12, fontWeight: '700' },
  historyDate: { color: '#6b7280', fontSize: 12 },
  historyJob: { color: '#18231c', fontSize: 17, fontWeight: '700', marginBottom: 6 },
  historySummary: { color: '#425046', fontSize: 14, marginBottom: 6 },
  historyMeta: { color: '#8b5e34', fontSize: 12, fontWeight: '700' }
});