// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, StatusBar, ScrollView,
  Pressable, ActivityIndicator, Platform, KeyboardAvoidingView,
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

const PROFESSIONS = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'paramedic', label: 'Paramedic' },
  { value: 'pharmacist', label: 'Pharmacist' },
];

const DOC_TYPES = [
  { value: 'hospital_id', label: 'Hospital ID' },
  { value: 'medical_council', label: 'Medical Council Reg.' },
  { value: 'nursing_license', label: 'Nursing License' },
];

const ACCENT = '#0891B2';

function HealthcareVerifyPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { setIdentity } = useUserIdentityStore();

  const [profession, setProfession] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = useCallback(async () => {
    if (!profession) { setError('Please select your profession'); return; }
    if (!documentType) { setError('Please select a document type'); return; }

    setLoading(true);
    setError('');
    analyticsService.track(IdentityAnalyticsEvents.VERIFICATION_STARTED, { type: 'healthcare' });

    try {
      const result = await identityApi.submitHealthcareVerification({
        documentType,
        profession,
      });

      analyticsService.track(IdentityAnalyticsEvents.VERIFICATION_COMPLETED, {
        type: 'healthcare', autoVerified: result.autoVerified, provisional: result.provisionalUnlock,
      });

      if (!isMounted()) return;
      setIdentity({ segment: 'verified_healthcare', featureLevel: 2, verificationSegment: 'provisional' });

      router.push({
        pathname: '/onboarding/verification-success',
        params: { zone: 'healthcare', type: 'provisional' },
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
  }, [profession, documentType, setIdentity, router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerIcon}>
          <Ionicons name="medkit" size={40} color={ACCENT} />
        </View>
        <ThemedText style={styles.headerTitle}>Healthcare Verification</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Your details are private and never shared</ThemedText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Profession</ThemedText>
          <View style={styles.chipRow}>
            {PROFESSIONS.map((p) => (
              <Pressable
                key={p.value}
                style={[styles.chip, profession === p.value && { backgroundColor: ACCENT }]}
                onPress={() => { setProfession(p.value); setError(''); }}
              >
                <ThemedText style={[styles.chipText, profession === p.value && styles.chipTextActive]}>
                  {p.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Document Type</ThemedText>
          <View style={styles.chipRow}>
            {DOC_TYPES.map((d) => (
              <Pressable
                key={d.value}
                style={[styles.chip, documentType === d.value && { backgroundColor: ACCENT }]}
                onPress={() => { setDocumentType(d.value); setError(''); }}
              >
                <ThemedText style={[styles.chipText, documentType === d.value && styles.chipTextActive]}>
                  {d.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.hintBox}>
          <Ionicons name="time-outline" size={16} color={ACCENT} />
          <ThemedText style={styles.hintBoxText}>
            All healthcare verifications require admin review.{'\n'}
            Provisional access is granted immediately, full unlock in 2-4 hours.
          </ThemedText>
        </View>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <Pressable
          onPress={handleVerify}
          disabled={loading}
          style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <ThemedText style={styles.verifyButtonText}>Verify & Unlock Deals</ThemedText>
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
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, alignItems: 'center',
  },
  backButton: {
    position: 'absolute', left: spacing.base,
    top: Platform.OS === 'ios' ? 56 : 44, padding: spacing.sm,
  },
  headerIcon: { marginBottom: spacing.md },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: colors.text.secondary },
  body: { flex: 1 },
  bodyContent: { padding: spacing.xl, paddingBottom: 120 },
  inputGroup: { marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border.default,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  chipTextActive: { color: '#fff' },
  hintBox: {
    flexDirection: 'row', backgroundColor: '#ECFEFF',
    padding: spacing.base, borderRadius: borderRadius.md, gap: spacing.sm, marginBottom: spacing.xl,
  },
  hintBoxText: { flex: 1, fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  errorText: { fontSize: 13, color: colors.errorScale[600], marginBottom: spacing.md },
  verifyButton: {
    backgroundColor: ACCENT, paddingVertical: 16, borderRadius: borderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    ...shadows.medium,
  },
  verifyButtonDisabled: { opacity: 0.6 },
  verifyButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default withErrorBoundary(HealthcareVerifyPage, 'OnboardingHealthcareVerify');
