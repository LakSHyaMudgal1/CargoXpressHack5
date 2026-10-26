import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../constants/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setErrorMessage('Please enter your email address or registered mobile number.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    const isEmail = trimmedId.includes('@');
    const result = await login({
      emailId: isEmail ? trimmedId : undefined,
      phone: !isEmail ? trimmedId : undefined,
      password,
    });
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Branding */}
          <View style={styles.brandContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="bus-outline" size={40} color={THEME.colors.primaryLight} />
            </View>
            <Text style={styles.brandTitle}>CargoXpress</Text>
            <Text style={styles.brandTagline}>Driver Cockpit & Fleet Navigation</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>Driver Login</Text>
            <Text style={styles.formSubtitle}>
              Sign in with your company-registered email or mobile number to access your assigned trips.
            </Text>

            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={THEME.colors.danger} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            <Input
              label="Email or Mobile Number"
              placeholder="e.g. driver@cargoxpress.com"
              iconName="person-outline"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Input
              label="Password"
              placeholder="Enter your driver password"
              iconName="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              isPassword
            />

            <Button
              title="Sign In to Cockpit"
              onPress={handleLogin}
              loading={loading}
              variant="primary"
              size="large"
              style={styles.submitButton}
            />
          </View>

          {/* Footer Assistance */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={16} color={THEME.colors.textMuted} />
            <Text style={styles.footerText}>
              Protected by CargoXpress Enterprise Authentication
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  brandTitle: {
    ...THEME.typography.titleLarge,
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  brandTagline: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  formTitle: {
    ...THEME.typography.titleMedium,
    color: THEME.colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.textMuted,
    lineHeight: 20,
    marginBottom: THEME.spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.dangerBg,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorBannerText: {
    ...THEME.typography.caption,
    color: THEME.colors.danger,
    flex: 1,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: THEME.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.xl,
    gap: 6,
  },
  footerText: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
});
