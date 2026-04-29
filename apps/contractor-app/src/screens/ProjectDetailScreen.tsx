import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@tfx/shared-ui';
import type { ContractorProject, MessageDraft, PendingProjectAction, QuoteDraft } from '../types';

type Props = {
  project: ContractorProject | null;
  interested: boolean;
  quoteDraft: QuoteDraft;
  messageDraft: MessageDraft;
  pendingAction: PendingProjectAction | null;
  onQuoteChange: (patch: Partial<QuoteDraft>) => void;
  onMessageChange: (patch: Partial<MessageDraft>) => void;
  onExpressInterest: () => void;
  onReviewQuote: () => void;
  onConfirmQuote: () => void;
  onPreviewMessage: () => void;
  onConfirmMessage: () => void;
  onCancelReview: () => void;
};

export default function ProjectDetailScreen({
  project,
  interested,
  quoteDraft,
  messageDraft,
  pendingAction,
  onQuoteChange,
  onMessageChange,
  onExpressInterest,
  onReviewQuote,
  onConfirmQuote,
  onPreviewMessage,
  onConfirmMessage,
  onCancelReview
}: Props) {
  if (!project) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>Select a project</Text>
        <Text style={styles.emptyStateText}>Choose a lead from Browse to review its scope and respond.</Text>
      </View>
    );
  }

  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailHeading}>Project detail</Text>
      <Text style={styles.detailTitle}>{project.title}</Text>
      <Text style={styles.detailMeta}>{project.location} · {project.budget} · {project.urgency}</Text>
      <Text style={styles.detailBody}>{project.description}</Text>
      <Text style={styles.requirementsHeading}>Homeowner requirements</Text>
      {project.requirements.map((item) => (
        <Text key={item} style={styles.requirementItem}>• {item}</Text>
      ))}

      <View style={styles.actionRow}>
        <Text style={styles.detailLeadType}>{project.leadType}</Text>
        <Button
          title={interested ? 'Interest Sent' : 'Express Interest'}
          onPress={onExpressInterest}
          style={interested ? styles.secondaryButton : styles.primaryButton}
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formTitle}>Submit quote</Text>
        {pendingAction && pendingAction.type === 'quote' ? (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewTitle}>Review quote before sending</Text>
            <Text style={styles.reviewLine}>Amount: {pendingAction.quote.amount}</Text>
            <Text style={styles.reviewLine}>Timeline: {pendingAction.quote.timeline || 'Timeline pending'}</Text>
            <Text style={styles.reviewLine}>Note: {pendingAction.quote.note || 'No note added'}</Text>
            <View style={styles.reviewActions}>
              <Button title="Confirm Quote" onPress={onConfirmQuote} style={styles.primaryButton} />
              <Button title="Edit Quote" onPress={onCancelReview} style={styles.secondaryButton} />
            </View>
          </View>
        ) : (
          <>
            <TextInput
              value={quoteDraft.amount}
              onChangeText={(value) => onQuoteChange({ amount: value })}
              placeholder="Quoted amount, e.g. R12,500"
              placeholderTextColor="#6b7280"
              style={styles.input}
            />
            <TextInput
              value={quoteDraft.timeline}
              onChangeText={(value) => onQuoteChange({ timeline: value })}
              placeholder="Timeline, e.g. 3 working days"
              placeholderTextColor="#6b7280"
              style={styles.input}
            />
            <TextInput
              value={quoteDraft.note}
              onChangeText={(value) => onQuoteChange({ note: value })}
              placeholder="Brief quote note"
              placeholderTextColor="#6b7280"
              style={[styles.input, styles.textArea]}
              multiline
            />
            <Button title="Review Quote" onPress={onReviewQuote} style={styles.primaryButton} />
          </>
        )}
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formTitle}>Send homeowner message</Text>
        {pendingAction && pendingAction.type === 'message' ? (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewTitle}>Preview message before sending</Text>
            <Text style={styles.reviewLine}>{pendingAction.message.body}</Text>
            <View style={styles.reviewActions}>
              <Button title="Confirm Message" onPress={onConfirmMessage} style={styles.secondaryButton} />
              <Button title="Edit Message" onPress={onCancelReview} style={styles.primaryButton} />
            </View>
          </View>
        ) : (
          <>
            <TextInput
              value={messageDraft.body}
              onChangeText={(value) => onMessageChange({ body: value })}
              placeholder="Write an opening message"
              placeholderTextColor="#6b7280"
              style={[styles.input, styles.textArea]}
              multiline
            />
            <Button title="Preview Message" onPress={onPreviewMessage} style={styles.secondaryButton} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailCard: {
    backgroundColor: '#fffaf2',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eadfca'
  },
  detailHeading: {
    color: '#8b5e34',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  detailTitle: { color: '#18231c', fontSize: 22, fontWeight: '700', marginBottom: 6 },
  detailMeta: { color: '#5f6d64', fontSize: 14, marginBottom: 12 },
  detailBody: { color: '#324138', fontSize: 15, lineHeight: 22, marginBottom: 12 },
  requirementsHeading: { color: '#18231c', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  requirementItem: { color: '#425046', fontSize: 14, lineHeight: 20, marginBottom: 4 },
  actionRow: {
    marginTop: 14,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  detailLeadType: { flex: 1, color: '#8b5e34', fontSize: 13, fontWeight: '700' },
  formSection: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eadfca'
  },
  formTitle: { color: '#18231c', fontSize: 17, fontWeight: '700', marginBottom: 10 },
  reviewCard: {
    borderRadius: 16,
    backgroundColor: '#f8f7f3',
    borderWidth: 1,
    borderColor: '#dde1d8',
    padding: 14
  },
  reviewTitle: { color: '#18231c', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  reviewLine: { color: '#324138', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  reviewActions: { gap: 10 },
  input: {
    backgroundColor: '#f8f7f3',
    borderColor: '#dde1d8',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#1f2937',
    fontSize: 14,
    marginBottom: 10
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top'
  },
  primaryButton: { backgroundColor: '#e76f51' },
  secondaryButton: { backgroundColor: '#5b6c60' },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center'
  },
  emptyStateTitle: { color: '#18231c', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyStateText: { color: '#5f6d64', fontSize: 14, textAlign: 'center' }
});
