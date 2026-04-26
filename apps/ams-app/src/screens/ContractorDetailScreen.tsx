import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles';

type Props = {
  contractor: any;
  pendingActionReview: any | null;
  warning: string | null;
  onBack: () => void;
  onCancelActionReview: () => void;
  onConfirmActionReview: () => void;
  onRunAction: (actionType: 'tier-review' | 'compliance-review' | 'dispute-audit') => void;
};

export default function ContractorDetailScreen({ contractor, pendingActionReview, warning, onBack, onCancelActionReview, onConfirmActionReview, onRunAction }: Props) {
  const [activePanel, setActivePanel] = useState<'tier' | 'compliance' | 'disputes'>('tier');

  if (!contractor) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contractor detail</Text>
        <Text style={styles.listBody}>Select a contractor from the directory to inspect their operational profile.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Contractor detail</Text>
      {warning ? <Text style={styles.infoBanner}>{warning}</Text> : null}
      <View style={styles.listCard}>
        <Text style={styles.listTitle}>{contractor.name || contractor.id}</Text>
        <Text style={styles.listMeta}>{contractor.trade} · {contractor.tier} · {contractor.rating || 'N/A'}★</Text>
        <Text style={styles.listBody}>{contractor.summary || 'No operational summary available.'}</Text>
        <Text style={styles.listBody}>Completed jobs: {contractor.completedJobs || 'N/A'}</Text>
        <Text style={styles.listBody}>Active quotes: {contractor.activeQuotes || 'N/A'}</Text>
        <Text style={styles.listBody}>Response time: {contractor.responseTime || 'N/A'}</Text>
      </View>
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Admin actions</Text>
        <View style={styles.actionRow}>
          <Pressable onPress={() => { setActivePanel('tier'); onRunAction('tier-review'); }} style={[styles.actionChip, activePanel === 'tier' && styles.actionChipActive]}><Text style={[styles.actionChipText, activePanel === 'tier' && styles.actionChipTextActive]}>Tier review</Text></Pressable>
          <Pressable onPress={() => { setActivePanel('compliance'); onRunAction('compliance-review'); }} style={[styles.actionChip, activePanel === 'compliance' && styles.actionChipActive]}><Text style={[styles.actionChipText, activePanel === 'compliance' && styles.actionChipTextActive]}>Compliance</Text></Pressable>
          <Pressable onPress={() => { setActivePanel('disputes'); onRunAction('dispute-audit'); }} style={[styles.actionChip, activePanel === 'disputes' && styles.actionChipActive]}><Text style={[styles.actionChipText, activePanel === 'disputes' && styles.actionChipTextActive]}>Disputes</Text></Pressable>
        </View>
      </View>
      {pendingActionReview ? (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Review Pending Action</Text>
          <Text style={styles.reviewTitle}>{pendingActionReview.title}</Text>
          <Text style={styles.bulletRow}>{pendingActionReview.summary}</Text>
          <Text style={styles.reviewMeta}>Target: {pendingActionReview.contractorName} · {pendingActionReview.panelLabel}</Text>
          <View style={styles.actionRow}>
            <Pressable onPress={onConfirmActionReview} style={styles.primaryButton}><Text style={styles.buttonText}>Confirm Action</Text></Pressable>
            <Pressable onPress={onCancelActionReview} style={styles.secondaryButton}><Text style={styles.buttonText}>Cancel</Text></Pressable>
          </View>
        </View>
      ) : null}
      <View style={styles.detailGrid}>
        {activePanel === 'tier' ? (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Tier review</Text>
            <Text style={styles.bulletRow}>Status: {contractor.tierReview?.status || 'N/A'}</Text>
            <Text style={styles.bulletRow}>Reason: {contractor.tierReview?.reason || 'N/A'}</Text>
            <Text style={styles.bulletRow}>Recommended action: {contractor.tierReview?.recommendedAction || 'N/A'}</Text>
          </View>
        ) : null}
        {activePanel === 'compliance' ? (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Compliance status</Text>
            <Text style={styles.bulletRow}>Status: {contractor.compliance?.status || 'N/A'}</Text>
            <Text style={styles.bulletRow}>Last check: {contractor.compliance?.lastCheck || 'N/A'}</Text>
            {(contractor.compliance?.notes || []).map((note: string) => (
              <Text key={note} style={styles.bulletRow}>• {note}</Text>
            ))}
          </View>
        ) : null}
        {activePanel === 'disputes' ? (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Dispute history</Text>
            {(contractor.disputes || []).length ? (contractor.disputes || []).map((dispute: any) => (
              <Text key={dispute.id} style={styles.bulletRow}>• {dispute.status}: {dispute.summary}</Text>
            )) : <Text style={styles.bulletRow}>No dispute records available.</Text>}
          </View>
        ) : null}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Action log</Text>
          {(contractor.adminActions || []).length ? (contractor.adminActions || []).map((action: any) => (
            <Text key={action.id} style={styles.bulletRow}>• {action.summary} ({action.source || 'live'})</Text>
          )) : <Text style={styles.bulletRow}>No admin actions recorded yet.</Text>}
        </View>
      </View>
      <Pressable onPress={onBack} style={styles.secondaryButton}><Text style={styles.buttonText}>Back to Contractors</Text></Pressable>
    </View>
  );
}
