import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput, Pressable,
  ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import * as identityApi from '@/services/identityApi';
import analyticsService, { IdentityAnalyticsEvents } from '@/services/analyticsService';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useEffect } from 'react';
import { useIsMounted } from '@/hooks/useIsMounted';

type InstituteType = 'college' | 'company';

function ReferInstitutePage() {
  const router = useRouter();
  const [instituteName, setInstituteName] = useState('');
  const [instituteType, setInstituteType] = useState<InstituteType>('college');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isMounted = useIsMounted();

  useEffect(() => {
    analyticsService.track(IdentityAnalyticsEvents.INSTITUTE_REFERRAL_STARTED);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!instituteName.trim() || !city.trim()) {
      platformAlertSimple('Required', 'Please enter institute name and city');
      return;
    }

    setLoading(true);
    try {
      await identityApi.referInstitute({
        instituteName: instituteName.trim(),
        instituteType,
        city: city.trim(),
        adminContactEmail: email.trim() || undefined,
      });

      analyticsService.track(IdentityAnalyticsEvents.INSTITUTE_REFERRAL_SUBMITTED, {
        instituteName: instituteName.trim(),
      });

      if (!isMounted()) return;
      setSubmitted(true);
    } catch (e: any) {
      platformAlertSimple('Error', e?.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [instituteName, instituteType, city, email]);

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color={colors.successScale[500]} />
        </View>
        <ThemedText style={styles.successTitle}>Referral submitted!</ThemedText>
        <ThemedText style={styles.successBody}>
          We'll contact them. You'll earn coins when they join.
        </ThemedText>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.ctaButton}>
          <ThemedText style={styles.ctaText}>Explore Deals</ThemedText>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Refer Your Institute</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Reward callout */}
        <View style={styles.rewardBox}>
          <ThemedText style={styles.rewardAmount}>{'\u20B9'}300</ThemedText>
          <ThemedText style={styles.rewardLabel}>credited when they join</ThemedText>
        </View>

        {/* Form */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Institute Name</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="e.g. Christ University"
            placeholderTextColor={colors.text.tertiary}
            value={instituteName}
            onChangeText={setInstituteName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Type</ThemedText>
          <View style={styles.typeRow}>
            {(['college', 'company'] as InstituteType[]).map((t) => (
              <Pressable
                key={t}
                style={[styles.typeChip, instituteType === t && styles.typeChipActive]}
                onPress={() => setInstituteType(t)}
              >
                <ThemedText
                  style={[styles.typeChipText, instituteType === t && styles.typeChipTextActive]}
                >
                  {t === 'college' ? 'College' : 'Company'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>City</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="e.g. Bangalore"
            placeholderTextColor={colors.text.tertiary}
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>
            Admin Contact Email <ThemedText style={styles.optional}>(optional)</ThemedText>
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="admin@institute.com"
            placeholderTextColor={colors.text.tertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.submitText}>Submit Referral</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingHorizontal: spacing.base, paddingBottom: spacing.md,
  },
  backButton: { padding: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  bodyContent: { padding: spacing.xl, paddingBottom: 120 },
  rewardBox: {
    backgroundColor: colors.primary[50], borderRadius: borderRadius.lg,
    padding: spacing.lg, alignItems: 'center', marginBottom: spacing.xl,
  },
  rewardAmount: { fontSize: 28, fontWeight: '800', color: colors.primary[600] },
  rewardLabel: { fontSize: 13, color: colors.text.secondary },
  inputGroup: { marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.sm },
  optional: { fontSize: 12, fontWeight: '400', color: colors.text.tertiary },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border.default,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: 14,
    fontSize: 15, color: colors.text.primary,
  },
  typeRow: { flexDirection: 'row', gap: spacing.md },
  typeChip: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border.default,
  },
  typeChipActive: { backgroundColor: colors.brand.purple, borderColor: colors.brand.purple },
  typeChipText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
  typeChipTextActive: { color: '#fff' },
  submitButton: {
    backgroundColor: colors.brand.purple, paddingVertical: 16, borderRadius: borderRadius.md,
    alignItems: 'center', marginTop: spacing.md, ...shadows.medium,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  successContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: spacing['2xl'], backgroundColor: colors.background.primary,
  },
  successIcon: { marginBottom: spacing.xl },
  successTitle: { fontSize: 22, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.md },
  successBody: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing['2xl'] },
  ctaButton: {
    backgroundColor: colors.brand.purple, paddingVertical: 14, paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    ...shadows.medium,
  },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default withErrorBoundary(ReferInstitutePage, 'ReferInstitute');
