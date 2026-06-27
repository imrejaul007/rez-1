// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, StatusBar, ScrollView, TextInput,
  Pressable, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { useUserIdentityStore } from '@/stores/userIdentityStore';
import * as identityApi from '@/services/identityApi';
import analyticsService, { IdentityAnalyticsEvents } from '@/services/analyticsService';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useIsMounted } from '@/hooks/useIsMounted';

const DOC_TYPES = [
  { value: 'school_id', label: 'School ID' },
  { value: 'college_id', label: 'College ID' },
  { value: 'ugc_id', label: 'UGC ID' },
];

const ACCENT = colors.warningScale[600];

function TeacherVerifyPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { setIdentity } = useUserIdentityStore();

  const [instituteName, setInstituteName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = useCallback(async () => {
    if (!instituteName.trim()) { setError('Please enter your institution name'); return; }
    if (!documentType) { setError('Please select a document type'); return; }

    setLoading(true);
    setError('');
    analyticsService.track(IdentityAnalyticsEvents.VERIFICATION_STARTED, { type: 'teacher' });

    try {
      const result = await identityApi.submitTeacherVerification({
        documentType,
        instituteName: instituteName.trim(),
      });

      analyticsService.track(IdentityAnalyticsEvents.VERIFICATION_COMPLETED, {
        type: 'teacher', autoVerified: result.autoVerified, provisional: result.provisionalUnlock,
      });

      if (!isMounted()) return;
      setIdentity({ segment: 'verified_teacher', featureLevel: 2, verificationSegment: 'provisional' });

      router.push({
        pathname: '/onboarding/verification-success',
        params: { zone: 'teacher', type: 'provisional' },
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
  }, [instituteName, documentType, setIdentity, router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerIcon}>
          <Ionicons name="book" size={40} color={ACCENT} />
        </View>
        <ThemedText style={styles.headerTitle}>Teacher Verification</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Your details are private and never shared</ThemedText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Institution Name</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="e.g. Delhi Public School"
            placeholderTextColor={colors.text.tertiary}
            value={instituteName}
            onChangeText={setInstituteName}
            autoCapitalize="words"
          />
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
            All teacher verifications require admin review.{'\n'}
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
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border.default,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: 14,
    fontSize: 15, color: colors.text.primary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border.default,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  chipTextActive: { color: '#fff' },
  hintBox: {
    flexDirection: 'row', backgroundColor: '#FFFBEB',
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

export default withErrorBoundary(TeacherVerifyPage, 'OnboardingTeacherVerify');
