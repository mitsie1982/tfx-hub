import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { styles } from '../styles';

type Props = {
  accounts: any[];
  auditEvents: any[];
  filters: { outcome: 'all' | 'success' | 'denied' };
  draft: { firstName: string; lastName: string; email: string; username: string; password: string };
  warning: string | null;
  actionMessage: string | null;
  csvPreview: string | null;
  onDraftChange: (patch: Partial<Props['draft']>) => void;
  onCreateAccount: () => void;
  onRefresh: () => void;
  onFilterOutcome: (outcome: 'all' | 'success' | 'denied') => void;
  onResetPassword: (adminUserId: string) => void;
  onRotateCredentials: (adminUserId: string, username: string) => void;
  onExportPreview: () => void;
};

export default function AdminManagementScreen(props: Props) {
  const { accounts, auditEvents, filters, draft, warning, actionMessage, csvPreview, onDraftChange, onCreateAccount, onRefresh, onFilterOutcome, onResetPassword, onRotateCredentials, onExportPreview } = props;

  return (
    <>
      <Text style={styles.sectionTitle}>Admin accounts</Text>
      {warning ? <Text style={styles.infoBanner}>{warning}</Text> : null}
      {actionMessage ? <Text style={styles.infoBanner}>{actionMessage}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.detailSectionTitle}>Create managed admin</Text>
        <TextInput value={draft.firstName} onChangeText={(value) => onDraftChange({ firstName: value })} placeholder="First name" placeholderTextColor="#728076" style={styles.input} />
        <TextInput value={draft.lastName} onChangeText={(value) => onDraftChange({ lastName: value })} placeholder="Last name" placeholderTextColor="#728076" style={styles.input} />
        <TextInput value={draft.email} onChangeText={(value) => onDraftChange({ email: value })} placeholder="Email" placeholderTextColor="#728076" autoCapitalize="none" style={styles.input} />
        <TextInput value={draft.username} onChangeText={(value) => onDraftChange({ username: value })} placeholder="Username" placeholderTextColor="#728076" autoCapitalize="none" style={styles.input} />
        <TextInput value={draft.password} onChangeText={(value) => onDraftChange({ password: value })} placeholder="Temporary password" placeholderTextColor="#728076" secureTextEntry style={styles.input} />
        <Pressable onPress={onCreateAccount} style={styles.primaryButton}><Text style={styles.buttonText}>Create admin</Text></Pressable>
      </View>

      {accounts.map((account) => (
        <View key={account.id} style={styles.listCard}>
          <Text style={styles.listTitle}>{account.firstName} {account.lastName}</Text>
          <Text style={styles.listMeta}>{account.username} · {account.email}</Text>
          <Text style={styles.listMeta}>{account.isBootstrapAdmin ? 'Bootstrap admin' : 'Managed admin'}</Text>
          {!account.isBootstrapAdmin ? (
            <View style={styles.actionRow}>
              <Pressable onPress={() => onResetPassword(account.id)} style={styles.actionChip}><Text style={styles.actionChipText}>Issue reset</Text></Pressable>
              <Pressable onPress={() => onRotateCredentials(account.id, account.username)} style={styles.actionChip}><Text style={styles.actionChipText}>Rotate secret</Text></Pressable>
            </View>
          ) : null}
        </View>
      ))}

      <Text style={styles.sectionTitle}>Audit feed</Text>
      <View style={styles.actionRow}>
        {(['all', 'success', 'denied'] as const).map((outcome) => (
          <Pressable key={outcome} onPress={() => onFilterOutcome(outcome)} style={[styles.actionChip, filters.outcome === outcome && styles.actionChipActive]}>
            <Text style={[styles.actionChipText, filters.outcome === outcome && styles.actionChipTextActive]}>{outcome}</Text>
          </Pressable>
        ))}
        <Pressable onPress={onRefresh} style={styles.actionChip}><Text style={styles.actionChipText}>Refresh</Text></Pressable>
        <Pressable onPress={onExportPreview} style={styles.actionChip}><Text style={styles.actionChipText}>CSV preview</Text></Pressable>
      </View>

      {auditEvents.map((event) => (
        <View key={event.id} style={styles.listCard}>
          <Text style={styles.listTitle}>{event.eventType}</Text>
          <Text style={styles.listMeta}>{event.outcome} · {event.reason || 'no reason supplied'}</Text>
          <Text style={styles.listMeta}>{event.requestMethod || 'N/A'} {event.requestPath || ''}</Text>
        </View>
      ))}

      {csvPreview ? (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>CSV preview</Text>
          <Text style={styles.monoPreview}>{csvPreview}</Text>
        </View>
      ) : null}
    </>
  );
}