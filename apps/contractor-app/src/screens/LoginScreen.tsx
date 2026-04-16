import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@tfx/shared-ui';

type Mode = 'login' | 'register' | 'reset';

type Props = {
  mode: Mode;
  identifier: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  trade: string;
  phoneNumber: string;
  resetToken: string;
  error: string | null;
  info: string | null;
  loading: boolean;
  actionLabel: string;
  onModeChange: (mode: Mode) => void;
  onIdentifierChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onTradeChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  onResetTokenChange: (value: string) => void;
  onSubmit: () => void;
};

export default function LoginScreen({
  mode,
  identifier,
  email,
  password,
  firstName,
  lastName,
  trade,
  phoneNumber,
  resetToken,
  error,
  info,
  loading,
  actionLabel,
  onModeChange,
  onIdentifierChange,
  onEmailChange,
  onPasswordChange,
  onFirstNameChange,
  onLastNameChange,
  onTradeChange,
  onPhoneNumberChange,
  onResetTokenChange,
  onSubmit
}: Props) {
  const isRegister = mode === 'register';
  const isReset = mode === 'reset';

  return (
    <View>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Contractor access</Text>
        <Text style={styles.title}>Access your TFX Hub workspace</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Sign in to load your contractor profile, live jobs feed, and lead history.' : null}
          {mode === 'register' ? 'Create a contractor account with trade and mobile number so the browser, mobile, and WhatsApp flows stay aligned.' : null}
          {mode === 'reset' ? 'Request a reset token, then submit it with a new password.' : null}
        </Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.modeRow}>
          <Pressable onPress={() => onModeChange('login')} style={[styles.modeChip, mode === 'login' && styles.modeChipActive]}>
            <Text style={[styles.modeChipText, mode === 'login' && styles.modeChipTextActive]}>Sign In</Text>
          </Pressable>
          <Pressable onPress={() => onModeChange('register')} style={[styles.modeChip, mode === 'register' && styles.modeChipActive]}>
            <Text style={[styles.modeChipText, mode === 'register' && styles.modeChipTextActive]}>Register</Text>
          </Pressable>
          <Pressable onPress={() => onModeChange('reset')} style={[styles.modeChip, mode === 'reset' && styles.modeChipActive]}>
            <Text style={[styles.modeChipText, mode === 'reset' && styles.modeChipTextActive]}>Reset</Text>
          </Pressable>
        </View>

        {info ? <Text style={styles.infoBanner}>{info}</Text> : null}
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        {isRegister ? (
          <>
            <Text style={styles.label}>First name</Text>
            <TextInput value={firstName} onChangeText={onFirstNameChange} placeholder="Theuns" placeholderTextColor="#6b7280" style={styles.input} />

            <Text style={styles.label}>Last name</Text>
            <TextInput value={lastName} onChangeText={onLastNameChange} placeholder="Fraser" placeholderTextColor="#6b7280" style={styles.input} />

            <Text style={styles.label}>Trade</Text>
            <TextInput value={trade} onChangeText={onTradeChange} placeholder="electrician" placeholderTextColor="#6b7280" style={styles.input} />

            <Text style={styles.label}>RSA mobile number</Text>
            <TextInput value={phoneNumber} onChangeText={onPhoneNumberChange} placeholder="+27710000001" placeholderTextColor="#6b7280" style={styles.input} />
          </>
        ) : null}

        {isRegister || isReset ? (
          <>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={onEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="contractor@example.com"
              placeholderTextColor="#6b7280"
              style={styles.input}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Email, username, or RSA mobile number</Text>
            <TextInput
              value={identifier}
              onChangeText={onIdentifierChange}
              autoCapitalize="none"
              placeholder="contractor@example.com or +27710000001"
              placeholderTextColor="#6b7280"
              style={styles.input}
            />
          </>
        )}

        {isReset ? (
          <>
            <Text style={styles.label}>Reset token</Text>
            <TextInput
              value={resetToken}
              onChangeText={onResetTokenChange}
              placeholder="Paste the reset token"
              placeholderTextColor="#6b7280"
              style={styles.input}
            />
          </>
        ) : null}

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry
          placeholder="Enter your password"
          placeholderTextColor="#6b7280"
          style={styles.input}
        />

        <Button title={loading ? 'Working...' : actionLabel} onPress={onSubmit} style={styles.primaryButton} />

        <Text style={styles.helperText}>Demo sign-in for Theuns Fraser: contractor@example.com or +27710000001 / password123</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#123524',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20
  },
  eyebrow: {
    color: '#c9ddcb',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8
  },
  title: { color: '#ffffff', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#d6e6d8', fontSize: 15, lineHeight: 21 },
  formCard: {
    backgroundColor: '#fffaf2',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eadfca'
  },
  modeRow: { flexDirection: 'row', marginBottom: 12 },
  modeChip: {
    flex: 1,
    backgroundColor: '#e4e0d6',
    borderRadius: 999,
    paddingVertical: 10,
    marginRight: 6,
    alignItems: 'center'
  },
  modeChipActive: { backgroundColor: '#123524' },
  modeChipText: { color: '#324138', fontWeight: '700' },
  modeChipTextActive: { color: '#ffffff' },
  label: { color: '#18231c', fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d8ddd6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#1f2937',
    fontSize: 15,
    marginBottom: 12
  },
  primaryButton: { backgroundColor: '#e76f51', marginTop: 6 },
  helperText: { color: '#6b7280', fontSize: 12, marginTop: 12 },
  infoBanner: {
    color: '#8b5e34',
    backgroundColor: '#fff3cd',
    borderColor: '#f1d28a',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12
  },
  errorBanner: {
    color: '#991b1b',
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12
  }
});