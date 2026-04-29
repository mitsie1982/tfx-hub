import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles';

type Props = {
  professional: any;
  warning: string | null;
  shortlisted: boolean;
  onBack: () => void;
  onToggleShortlist: () => void;
  onContact: () => void;
};

export default function ProfessionalDetailScreen({ professional, warning, shortlisted, onBack, onToggleShortlist, onContact }: Props) {
  if (!professional) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Professional detail</Text>
        <Text style={styles.listBody}>Select a professional from the directory to inspect their profile.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Professional detail</Text>
      {warning ? <Text style={styles.infoBanner}>{warning}</Text> : null}
      <View style={styles.listCard}>
        <Text style={styles.listTitle}>{professional.name}</Text>
        <Text style={styles.listMeta}>{professional.trade} · {professional.tier} · {professional.rating || 'N/A'}★</Text>
        <Text style={styles.listBody}>{professional.summary || 'No profile summary available.'}</Text>
        <Text style={styles.listBody}>Completed jobs: {professional.completedJobs || 'N/A'}</Text>
        <Text style={styles.listBody}>Response time: {professional.responseTime || 'N/A'}</Text>
        <Text style={styles.listBody}>Service area: {professional.serviceArea || 'N/A'}</Text>
        <Text style={styles.listBody}>Availability: {professional.availability || 'N/A'}</Text>
      </View>
      <View style={styles.detailGrid}>
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Credentials</Text>
          {(professional.credentials || []).map((credential: string) => (
            <Text key={credential} style={styles.bulletRow}>• {credential}</Text>
          ))}
        </View>
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Portfolio highlights</Text>
          {(professional.portfolioHighlights || []).map((highlight: string) => (
            <Text key={highlight} style={styles.bulletRow}>• {highlight}</Text>
          ))}
        </View>
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Recent review highlights</Text>
          {(professional.reviewHighlights || []).map((highlight: string) => (
            <Text key={highlight} style={styles.bulletRow}>• {highlight}</Text>
          ))}
        </View>
      </View>
      <Pressable onPress={onToggleShortlist} style={styles.primaryButton}><Text style={styles.buttonText}>{shortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}</Text></Pressable>
      <Pressable onPress={onContact} style={styles.secondaryButton}><Text style={styles.buttonText}>Contact Through Request Flow</Text></Pressable>
      <Pressable onPress={onBack} style={styles.secondaryButton}><Text style={styles.buttonText}>Back to Directory</Text></Pressable>
    </View>
  );
}
