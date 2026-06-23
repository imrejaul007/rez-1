// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { useUserIdentityStore } from '@/stores/userIdentityStore';
import * as identityApi from '@/services/identityApi';
import analyticsService, { IdentityAnalyticsEvents } from '@/services/analyticsService';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useIsMounted } from '@/hooks/useIsMounted';

function CorporateVerifyPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { setIdentity } = useUserIdentityStore();

  const [companyName, setCompanyName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = useCallback(async () => {
    if (!companyName.trim()) {
      setError('Please enter your company name');
      return;
    }

    setLoading(true);
    setError('');
    analyticsService.track(IdentityAnalyticsEvents.VERIFICATION_STARTED, {
      type: 'corporate',
    });

    try {
      const result = await identityApi.submitCorporateVerification({
        companyName: companyName.trim(),
        email: workEmail.trim() || undefined,
      });

      analyticsService.track(IdentityAnalyticsEvents.VERIFICATION_COMPLETED, {
        type: 'corporate',
        autoVerified: result.autoVerified,
        provisional: result.provisionalUnlock,
      });

      if (!isMounted()) return;
      setIdentity({
        segment: 'verified_employee',
        featureLevel: 2,
        verificationSegment: result.autoVerified ? 'verified' : 'provisional',
        companyName: companyName.trim(),
      });

      router.push({
        pathname: '/onboarding/verification-success',
        params: {
          zone: 'corporate',
          type: result.autoVerified ? 'instant' : 'provisional',
        },
      } as any);
    } catch (e: any) {
      const msg = e?.message || 'Verification failed. Please try again.';
      if (!isMounted()) return;
      setError(msg);
      platformAlertSimple('Error', msg);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [companyName, workEmail, setIdentity, router]);


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerIcon}>
          <Ionicons name="briefcase" size={40} color={colors.secondary[600]} />
        </View>
        <ThemedText style={styles.headerTitle}>Work Verification</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          Your details are private and never shared
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Company Name</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="e.g. Infosys"
            placeholderTextColor={colors.text.tertiary}
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>
            Work Email{' '}
            <ThemedText style={styles.optional}>(recommended)</ThemedText>
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="you@company.com"
            placeholderTextColor={colors.text.tertiary}
            value={workEmail}
            onChangeText={setWorkEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.hintBox}>
          <Ionicons name="flash" size={16} color={colors.warningScale[600]} />
          <ThemedText style={styles.hintBoxText}>
            We send a verification OTP to your work email. One tap = verified.
          </ThemedText>
        </View>

        {error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : null}

        <Pressable
          onPress={handleVerify}
          disabled={loading}
          style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <ThemedText style={styles.verifyButtonText}>
                Verify & Unlock Perks
              </ThemedText>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </Pressable>

      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.tertiary },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: spacing.base,
    top: Platform.OS === 'ios' ? 56 : 44,
    padding: spacing.sm,
  },
  headerIcon: { marginBottom: spacing.md },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: colors.text.secondary },
  body: { flex: 1 },
  bodyContent: { padding: spacing.xl, paddingBottom: 120 },
  inputGroup: { marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.sm },
  optional: { fontSize: 12, fontWeight: '400', color: colors.text.tertiary },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text.primary,
  },
  hintBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary[50],
    padding: spacing.base,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  hintBoxText: { flex: 1, fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  errorText: { fontSize: 13, color: colors.errorScale[600], marginBottom: spacing.md },
  verifyButton: {
    backgroundColor: colors.secondary[600],
    paddingVertical: 16,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.medium,
  },
  verifyButtonDisabled: { opacity: 0.6 },
  verifyButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default withErrorBoundary(CorporateVerifyPage, 'OnboardingCorporateVerify');
