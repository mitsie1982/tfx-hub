import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Button } from '@tfx/shared-ui';
import type { ContractorProfile } from '../types';

type Props = {
  profile: ContractorProfile;
  projectCount: number;
  interestedCount: number;
  historyCount: number;
  dataSource: 'live' | 'sample';
  onBrowseProjects: () => void;
  onOpenHistory: () => void;
};

export default function DashboardScreen({
  profile,
  projectCount,
  interestedCount,
  historyCount,
  dataSource,
  onBrowseProjects,
  onOpenHistory
}: Props) {
  return (
    <View>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Contractor workspace</Text>
        <Text style={styles.title}>{profile.name}</Text>
        <Text style={styles.subtitle}>
          {profile.trade} · {profile.tier} tier · {profile.rating}★ rating
        </Text>
        <Text style={styles.liveBadge}>{dataSource === 'live' ? 'Live jobs feed connected' : 'Sample data mode'}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.completedJobs}</Text>
            <Text style={styles.statLabel}>Completed jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.activeQuotes}</Text>
            <Text style={styles.statLabel}>Active quotes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{projectCount}</Text>
            <Text style={styles.statLabel}>Open leads</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.responseTime}</Text>
            <Text style={styles.statLabel}>Response time</Text>
          </View>
        </View>
        <Button title="Browse Projects" onPress={onBrowseProjects} style={styles.primaryButton} />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Pipeline snapshot</Text>
        <Text style={styles.summaryText}>{interestedCount} leads already marked as interest sent.</Text>
        <Text style={styles.summaryText}>{historyCount} actions tracked in your history feed.</Text>
        <Button title="Open Lead History" onPress={onOpenHistory} style={styles.secondaryButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#123524',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20
  },
  eyebrow: {
    color: '#c9ddcb',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8
  },
  title: { color: '#ffffff', fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#d6e6d8', fontSize: 15, lineHeight: 21, marginBottom: 12 },
  liveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#214c35',
    color: '#d6e6d8',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
    overflow: 'hidden'
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 12
  },
  statCard: { width: '50%', paddingHorizontal: 4, marginBottom: 8 },
  statValue: {
    backgroundColor: '#214c35',
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    paddingTop: 14,
    paddingHorizontal: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  statLabel: {
    backgroundColor: '#214c35',
    color: '#cfe0d1',
    fontSize: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16
  },
  summaryCard: {
    backgroundColor: '#fffaf2',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eadfca'
  },
  sectionTitle: { color: '#18231c', fontSize: 22, fontWeight: '700', marginBottom: 10 },
  summaryText: { color: '#425046', fontSize: 14, marginBottom: 6 },
  primaryButton: { backgroundColor: '#e76f51' },
  secondaryButton: { backgroundColor: '#5b6c60', marginTop: 12 }
});