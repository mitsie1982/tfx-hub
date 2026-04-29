import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles';

type Props = {
  overview: any;
};

export default function OverviewScreen({ overview }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Trade demand</Text>
      {Object.entries(overview?.openJobsByTrade || {}).map(([trade, count]) => (
        <View key={trade} style={styles.metricRow}><Text style={styles.metricLabel}>{trade}</Text><Text style={styles.metricValue}>{String(count)}</Text></View>
      ))}
      <Text style={styles.sectionTitle}>Professional tiers</Text>
      {Object.entries(overview?.professionalsByTier || {}).map(([tier, count]) => (
        <View key={tier} style={styles.metricRow}><Text style={styles.metricLabel}>{tier}</Text><Text style={styles.metricValue}>{String(count)}</Text></View>
      ))}
    </View>
  );
}
