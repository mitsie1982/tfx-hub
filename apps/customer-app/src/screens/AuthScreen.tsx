import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { styles } from '../styles';

type AuthMode = 'login' | 'register' | 'reset';

type Props = {
  authMode: AuthMode;
  authInfo: string | null;
  authError: string | null;
  credentials: { email: string; password: string };
  registration: { email: string; password: string; firstName: string; lastName: string; phoneNumber: string };
  resetEmail: string;
  onModeChange: (mode: AuthMode) => void;
  onCredentialsChange: (patch: Partial<{ email: string; password: string }>) => void;
  onRegistrationChange: (patch: Partial<{ email: string; password: string; firstName: string; lastName: string; phoneNumber: string }>) => void;
  onResetEmailChange: (value: string) => void;
  onSubmit: () => void;
};

export default function AuthScreen({
  authMode,
  authInfo,
  authError,
  credentials,
  registration,
  resetEmail,
  onModeChange,
  onCredentialsChange,
  onRegistrationChange,
  onResetEmailChange,
  onSubmit
}: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Customer workspace</Text>
        <Text style={styles.title}>Manage home projects and compare professionals</Text>
        <Text style={styles.subtitle}>Sign in, create an account with your mobile number, and browse trusted contractors.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.modeRow}>
          {(['login', 'register', 'reset'] as AuthMode[]).map((mode) => (
            <Pressable key={mode} onPress={() => onModeChange(mode)} style={[styles.modeChip, authMode === mode && styles.modeChipActive]}>
              <Text style={[styles.modeChipText, authMode === mode && styles.modeChipTextActive]}>{mode}</Text>
            </Pressable>
          ))}
        </View>

        {authInfo ? <Text style={styles.infoBanner}>{authInfo}</Text> : null}
        {authError ? <Text style={styles.errorBanner}>{authError}</Text> : null}

        {authMode === 'register' ? (
          <>
            <TextInput value={registration.firstName} onChangeText={(value) => onRegistrationChange({ firstName: value })} placeholder="Michelle" style={styles.input} />
            <TextInput value={registration.lastName} onChangeText={(value) => onRegistrationChange({ lastName: value })} placeholder="Brummer" style={styles.input} />
            <TextInput value={registration.phoneNumber} onChangeText={(value) => onRegistrationChange({ phoneNumber: value })} placeholder="RSA mobile number (+27710000003)" autoCapitalize="none" style={styles.input} />
          </>
        ) : null}

        <TextInput
          value={authMode === 'register' ? registration.email : authMode === 'reset' ? resetEmail : credentials.email}
          onChangeText={(value) => {
            if (authMode === 'register') onRegistrationChange({ email: value });
            else if (authMode === 'reset') onResetEmailChange(value);
            else onCredentialsChange({ email: value });
          }}
          placeholder="Email"
          autoCapitalize="none"
          style={styles.input}
        />

        {authMode !== 'reset' ? (
          <TextInput
            value={authMode === 'register' ? registration.password : credentials.password}
            onChangeText={(value) => {
              if (authMode === 'register') onRegistrationChange({ password: value });
              else onCredentialsChange({ password: value });
            }}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
          />
        ) : null}

        <Pressable onPress={onSubmit} style={styles.primaryButton}>
          <Text style={styles.buttonText}>{authMode === 'login' ? 'Sign In' : authMode === 'register' ? 'Create Profile' : 'Request Reset'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}