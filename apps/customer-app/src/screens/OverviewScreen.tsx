import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles';

type Props = {
  jobs: any[];
};

export default function OverviewScreen({ jobs }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Open jobs</Text>
      {jobs.map((job) => (
        <View key={job.id} style={styles.listCard}>
          <Text style={styles.listTitle}>{job.title}</Text>
          <Text style={styles.listMeta}>{job.location || 'Location TBC'} · {job.budget || 'Budget TBC'} · {job.trade}</Text>
          <Text style={styles.listBody}>{job.description}</Text>
        </View>
      ))}
    </View>
  );
}
