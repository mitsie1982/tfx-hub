import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { styles } from '../styles';

type RequestForm = {
  title: string;
  trade: string;
  description: string;
  budget: string;
  location: string;
  urgency: string;
};

type Props = {
  requestForm: RequestForm;
  pendingRequest: RequestForm | null;
  onChange: (patch: Partial<RequestForm>) => void;
  onReview: () => void;
  onConfirm: () => void;
  onCancelReview: () => void;
};

export default function RequestJobScreen({ requestForm, pendingRequest, onChange, onReview, onConfirm, onCancelReview }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Create job request</Text>
      {pendingRequest ? (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Review request before sending</Text>
          <Text style={styles.listBody}>Title: {pendingRequest.title}</Text>
          <Text style={styles.listBody}>Trade: {pendingRequest.trade}</Text>
          <Text style={styles.listBody}>Location: {pendingRequest.location || 'Location pending'}</Text>
          <Text style={styles.listBody}>Budget: {pendingRequest.budget || 'Budget pending'}</Text>
          <Text style={styles.listBody}>Urgency: {pendingRequest.urgency || 'Urgency pending'}</Text>
          <Text style={styles.listBody}>Description: {pendingRequest.description}</Text>
          <Pressable onPress={onConfirm} style={styles.primaryButton}><Text style={styles.buttonText}>Submit Confirmed Request</Text></Pressable>
          <Pressable onPress={onCancelReview} style={styles.secondaryButton}><Text style={styles.buttonText}>Edit Request</Text></Pressable>
        </View>
      ) : (
        <>
          <TextInput value={requestForm.title} onChangeText={(value) => onChange({ title: value })} placeholder="Job title" style={styles.input} />
          <TextInput value={requestForm.trade} onChangeText={(value) => onChange({ trade: value })} placeholder="Trade" style={styles.input} />
          <TextInput value={requestForm.location} onChangeText={(value) => onChange({ location: value })} placeholder="Location" style={styles.input} />
          <TextInput value={requestForm.budget} onChangeText={(value) => onChange({ budget: value })} placeholder="Budget" style={styles.input} />
          <TextInput value={requestForm.urgency} onChangeText={(value) => onChange({ urgency: value })} placeholder="Urgency" style={styles.input} />
          <TextInput value={requestForm.description} onChangeText={(value) => onChange({ description: value })} placeholder="Describe the work" multiline style={[styles.input, styles.textArea]} />
          <Pressable onPress={onReview} style={styles.primaryButton}><Text style={styles.buttonText}>Review Request</Text></Pressable>
        </>
      )}
    </View>
  );
}
