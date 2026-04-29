import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles';

type Props = {
  overview: any;
};

export default function AssociationOverviewScreen({ overview }: Props) {
  const totals = overview?.totals || { openJobs: 0, inProgressJobs: 0, completedJobs: 0, professionals: 0 };
  const openJobsByTrade = overview?.openJobsByTrade || {};
  const professionalsByTrade = overview?.professionalsByTrade || {};

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Association Overview</Text>
      <Text style={styles.subheading}>Mobile shell for the association operations summary and trade mix.</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>{totals.openJobs}</Text><Text style={styles.statLabel}>Open jobs</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{totals.professionals}</Text><Text style={styles.statLabel}>Professionals</Text></View>
      </View>
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Open Jobs By Trade</Text>
        <View style={styles.chipRow}>
          {Object.entries(openJobsByTrade).map(([trade, count]) => (
            <View key={`open-${trade}`} style={styles.chip}><Text style={styles.chipText}>{trade}: {String(count)}</Text></View>
          ))}
        </View>
      </View>
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Professionals By Trade</Text>
        <View style={styles.chipRow}>
          {Object.entries(professionalsByTrade).map(([trade, count]) => (
            <View key={`pro-${trade}`} style={styles.chip}><Text style={styles.chipText}>{trade}: {String(count)}</Text></View>
          ))}
        </View>
      </View>
    </View>
  );
}
