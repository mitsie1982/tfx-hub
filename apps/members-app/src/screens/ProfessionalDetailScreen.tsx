import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles';

type Props = {
  professional: any | null;
  associationActions: any[];
  pendingActionReview: any | null;
  professionalRequests: any[];
  warning: string | null;
  onBack: () => void;
  onAssociationAction: (actionType: 'member-review' | 'trade-outreach') => void;
  onCancelActionReview: () => void;
  onConfirmActionReview: () => void;
  onProfessionalAction: (actionType: 'availability-check-in' | 'tier-review-request') => void;
};

export default function ProfessionalDetailScreen({ professional, associationActions, pendingActionReview, professionalRequests, warning, onBack, onAssociationAction, onCancelActionReview, onConfirmActionReview, onProfessionalAction }: Props) {
  if (!professional) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Professional Detail</Text>
        <Text style={styles.subheading}>No professional selected.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{professional.name}</Text>
      {warning ? <Text style={styles.infoBanner}>{warning}</Text> : null}
      <View style={styles.detailGrid}>
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Profile</Text>
          <Text style={styles.bulletRow}>Trade: {professional.trade}</Text>
          <Text style={styles.bulletRow}>Tier: {professional.tier || 'ONBOARDED'}</Text>
          <Text style={styles.bulletRow}>Rating: {professional.rating || 'N/A'}</Text>
        </View>
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Association Actions</Text>
          <View style={styles.actionRow}>
            <Pressable onPress={() => onAssociationAction('member-review')} style={styles.primaryButton}><Text style={styles.buttonText}>Queue Member Review</Text></Pressable>
            <Pressable onPress={() => onAssociationAction('trade-outreach')} style={styles.secondaryButton}><Text style={styles.buttonText}>Queue Trade Outreach</Text></Pressable>
          </View>
        </View>
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Professional Requests</Text>
          <View style={styles.actionRow}>
            <Pressable onPress={() => onProfessionalAction('availability-check-in')} style={styles.primaryButton}><Text style={styles.buttonText}>Check In Availability</Text></Pressable>
            <Pressable onPress={() => onProfessionalAction('tier-review-request')} style={styles.secondaryButton}><Text style={styles.buttonText}>Request Tier Review</Text></Pressable>
          </View>
        </View>
        {pendingActionReview ? (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Review Pending Action</Text>
            <Text style={styles.reviewTitle}>{pendingActionReview.title}</Text>
            <Text style={styles.bulletRow}>{pendingActionReview.summary}</Text>
            <Text style={styles.reviewMeta}>Target: {pendingActionReview.professionalName} · {pendingActionReview.scopeLabel}</Text>
            <View style={styles.actionRow}>
              <Pressable onPress={onConfirmActionReview} style={styles.primaryButton}><Text style={styles.buttonText}>Confirm Action</Text></Pressable>
              <Pressable onPress={onCancelActionReview} style={styles.secondaryButton}><Text style={styles.buttonText}>Cancel</Text></Pressable>
            </View>
          </View>
        ) : null}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Association History</Text>
          {(associationActions || []).length ? associationActions.map((item) => (
            <View key={item.id} style={styles.listCard}>
              <Text style={styles.listTitle}>{item.summary}</Text>
              <Text style={styles.listMeta}>{item.actionType} · {item.createdAt || 'Recently'}</Text>
            </View>
          )) : <Text style={styles.bulletRow}>No association actions recorded yet.</Text>}
        </View>
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Professional Request History</Text>
          {(professionalRequests || []).length ? professionalRequests.map((item) => (
            <View key={item.id} style={styles.listCard}>
              <Text style={styles.listTitle}>{item.summary}</Text>
              <Text style={styles.listMeta}>{item.actionType} · {item.createdAt || 'Recently'}</Text>
            </View>
          )) : <Text style={styles.bulletRow}>No professional requests recorded yet.</Text>}
        </View>
      </View>
      <View style={styles.actionRow}>
        <Pressable onPress={onBack} style={styles.secondaryButton}><Text style={styles.buttonText}>Back</Text></Pressable>
      </View>
    </View>
  );
}
