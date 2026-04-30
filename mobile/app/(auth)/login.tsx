import React, { useState } from 'react';
import {
  View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui';
import { theme } from '@/theme';
import { APP_NAME, APP_TAGLINE } from '@/config';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || t('commonModal.genericError') || 'Login failed';
      Alert.alert(t('auth.loginSuccess') ? 'KBEX' : 'Error', String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <Text style={{
              fontSize: 42,
              color: theme.colors.gold,
              letterSpacing: 8,
              fontWeight: '300',
            }}>{APP_NAME}</Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 8, fontSize: 13, letterSpacing: 1 }}>
              {APP_TAGLINE}
            </Text>
          </View>

          <View style={{ gap: 14 }}>
            <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '300', marginBottom: 6 }}>
              {t('auth.welcomeBack') || 'Welcome Back'}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 16 }}>
              {t('auth.loginDescription') || 'Sign in to access your account'}
            </Text>

            <TextInput
              placeholder={t('auth.email') || 'Email'}
              placeholderTextColor={theme.colors.textFaint}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={inputStyle}
              testID="login-email-input"
            />

            <TextInput
              placeholder={t('auth.password') || 'Password'}
              placeholderTextColor={theme.colors.textFaint}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              style={inputStyle}
              testID="login-password-input"
            />

            <View style={{ height: 8 }} />
            <Button
              label={submitting ? (t('auth.processing') || '…') : (t('auth.signIn') || 'Sign In')}
              onPress={onSubmit}
              loading={submitting}
              testID="login-submit-btn"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const inputStyle = {
  backgroundColor: theme.colors.surface,
  color: theme.colors.text,
  borderRadius: theme.radius.lg,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 15,
  borderWidth: 1,
  borderColor: theme.colors.border,
};
