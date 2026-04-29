import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { styles } from '../styles';

type Props = {
  authInfo: string | null;
  authError: string | null;
  credentials: { identifier: string; password: string };
  onCredentialsChange: (patch: Partial<{ identifier: string; password: string }>) => void;
  onSubmit: () => void;
};

export default function AuthScreen({ authInfo, authError, credentials, onCredentialsChange, onSubmit }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Admin workspace</Text>
        <Text style={styles.title}>Monitor jobs, contractor supply, and platform activity</Text>
        <Text style={styles.subtitle}>Use the admin workspace for an operations snapshot and contractor directory view.</Text>
      </View>

      <View style={styles.card}>
        {authInfo ? <Text style={styles.infoBanner}>{authInfo}</Text> : null}
        {authError ? <Text style={styles.errorBanner}>{authError}</Text> : null}
        <TextInput value={credentials.identifier} onChangeText={(value) => onCredentialsChange({ identifier: value })} placeholder="TFX_ADMIN_USERNAME" autoCapitalize="none" style={styles.input} />
        <TextInput value={credentials.password} onChangeText={(value) => onCredentialsChange({ password: value })} placeholder="TFX_ADMIN_PASSWORD" secureTextEntry style={styles.input} />
        <Pressable onPress={onSubmit} style={styles.primaryButton}><Text style={styles.buttonText}>Sign In</Text></Pressable>
      </View>
    </ScrollView>
  );
}
