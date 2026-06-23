import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Zone Verification Page
 *
 * Handles verification flow for exclusive zones that require manual verification
 * (Student, Corporate, Defence, Senior)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FormPageSkeleton } from '@/components/skeletons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Colors
const COLORS = {
  primary: Colors.gold,
  primaryDark: colors.brand.goldRich,
  white: colors.background.primary,
  black: '#000000',
  textDark: Colors.nileBlue,
  textMuted: Colors.text.tertiary,
  background: colors.linen,
  success: Colors.success,
  error: Colors.error,
  pending: Colors.warning,
  cardBg: colors.background.primary,
  border: Colors.border.default,
};

interface ZoneEligibility {
  zone: {
    name: string;
    slug: string;
    description: string;
    eligibilityType: string;
    eligibilityDetails: string;
    verificationRequired: boolean;
  };
  isEligible: boolean;
  autoVerified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected' | null;
  requiresAuth: boolean;
  message: string;
}

interface VerificationFormData {
  documentType?: string;
  email?: string;
  instituteName?: string;
  companyName?: string;
  serviceNumber?: string;
}

const ZONE_CONFIG: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string, string];
  documentTypes: { value: string; label: string }[];
  fields: string[];
  instructions: string;
}> = {
  student: {
    icon: 'school-outline',
    gradient: [colors.infoScale[400], Colors.info, '#1D4ED8'],
    documentTypes: [
      { value: 'student_id', label: 'Student ID Card' },
      { value: 'edu_email', label: 'Educational Email (.edu)' },
      { value: 'enrollment_letter', label: 'Enrollment Letter' },
    ],
    fields: ['documentType', 'instituteName', 'email'],
    instructions: 'Please provide your student verification details. You can verify using your student ID, educational email, or enrollment letter.',
  },
  corporate: {
    icon: 'briefcase-outline',
    gradient: [colors.brand.purpleSoft, Colors.brand.purpleLight, colors.brand.purpleDeep],
    documentTypes: [
      { value: 'corporate_email', label: 'Corporate Email' },
      { value: 'employee_id', label: 'Employee ID' },
    ],
    fields: ['documentType', 'companyName', 'email'],
    instructions: 'Verify your corporate status using your official work email or employee ID to unlock exclusive corporate deals.',
  },
  defence: {
    icon: 'shield-outline',
    gradient: [colors.successScale[400], Colors.success, Colors.success],
    documentTypes: [
      { value: 'service_id', label: 'Service ID Card' },
      { value: 'veteran_card', label: 'Veteran Card' },
    ],
    fields: ['documentType', 'serviceNumber'],
    instructions: 'Thank you for your service! Please provide your service details to verify your defence status.',
  },
  senior: {
    icon: 'heart-outline',
    gradient: ['#FCD34D', Colors.warning, Colors.warning],
    documentTypes: [
      { value: 'age_proof', label: 'Age Proof (ID Card)' },
      { value: 'senior_card', label: 'Senior Citizen Card' },
    ],
    fields: ['documentType'],
    instructions: 'Please verify your senior citizen status (60+ years) to unlock special benefits.',
  },
};

function ZoneVerifyScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const isMounted = useIsMounted();
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<ZoneEligibility | null>(null);
  const [formData, setFormData] = useState<VerificationFormData>({});
  const [error, setError] = useState<string | null>(null);

  const zoneConfig = slug ? ZONE_CONFIG[slug] : null;

  // Fetch eligibility status
  const fetchEligibility = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<any>(`/zones/${slug}/eligibility`);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setEligibility(response.data);

        // If already eligible, redirect to zone page
        if (response.data.isEligible) {
          router.replace(`/offers/zones/${slug}` as any);
        }
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to check eligibility');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!slug || !zoneConfig) return;

    // Validate required fields
    if (zoneConfig.fields.includes('documentType') && !formData.documentType) {
      platformAlertSimple('Required', 'Please select a document type');
      return;
    }
    if (zoneConfig.fields.includes('email') && !formData.email) {
      platformAlertSimple('Required', 'Please enter your email');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await apiClient.post<any>(`/zones/${slug}/verify`, formData);

      if (response.success) {
        platformAlertSimple('Verification Submitted', 'Your verification request has been submitted. You will be notified once it is reviewed.');
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Failed to submit verification');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to submit verification');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <FormPageSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  // Render auth required state
  if (!isAuthenticated || eligibility?.requiresAuth) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.authContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.authTitle}>Login Required</Text>
          <Text style={styles.authSubtitle}>
            Please login to verify your eligibility for this exclusive zone
          </Text>
          <Pressable
            style={styles.loginButton}
            onPress={() => router.push('/sign-in' as any)}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </Pressable>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Render pending verification state
  if (eligibility?.verificationStatus === 'pending') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.statusContainer}>
          <View style={[styles.statusIcon, { backgroundColor: `${COLORS.pending}20` }]}>
            <Ionicons name="time-outline" size={48} color={COLORS.pending} />
          </View>
          <Text style={styles.statusTitle}>Verification Pending</Text>
          <Text style={styles.statusSubtitle}>
            Your verification request for {eligibility.zone.name} is being reviewed.
            You will be notified once it is approved.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Render rejected verification state
  if (eligibility?.verificationStatus === 'rejected') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.statusContainer}>
          <View style={[styles.statusIcon, { backgroundColor: `${COLORS.error}20` }]}>
            <Ionicons name="close-circle-outline" size={48} color={COLORS.error} />
          </View>
          <Text style={styles.statusTitle}>Verification Rejected</Text>
          <Text style={styles.statusSubtitle}>
            Unfortunately, your verification request was not approved.
            Please try again with valid documents.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => setEligibility({ ...eligibility, verificationStatus: null })}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Render verification form
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerBackButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
          </Pressable>
          <Text style={styles.headerTitle}>Verify Your Status</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Zone Info Card */}
          {zoneConfig && (
            <LinearGradient
              colors={zoneConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.zoneCard}
            >
              <View style={styles.zoneIconContainer}>
                <Ionicons name={zoneConfig.icon} size={32} color={COLORS.white} />
              </View>
              <Text style={styles.zoneName}>{eligibility?.zone.name || slug}</Text>
              <Text style={styles.zoneDescription}>
                {eligibility?.zone.description || zoneConfig.instructions}
              </Text>
            </LinearGradient>
          )}

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <View style={styles.instructionsHeader}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.instructionsTitle}>Verification Instructions</Text>
            </View>
            <Text style={styles.instructionsText}>
              {zoneConfig?.instructions || eligibility?.zone.eligibilityDetails}
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Document Type Selector */}
            {zoneConfig?.fields.includes('documentType') && (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Document Type</Text>
                <View style={styles.documentTypeContainer}>
                  {zoneConfig.documentTypes.map((docType) => (
                    <Pressable
                      key={docType.value}
                      style={[
                        styles.documentTypeButton,
                        formData.documentType === docType.value && styles.documentTypeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, documentType: docType.value })}
                    >
                      <Text
                        style={[
                          styles.documentTypeText,
                          formData.documentType === docType.value && styles.documentTypeTextActive,
                        ]}
                      >
                        {docType.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Institute Name (Student) */}
            {zoneConfig?.fields.includes('instituteName') && (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Institution Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your institution name"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.instituteName}
                  onChangeText={(text) => setFormData({ ...formData, instituteName: text })}
                />
              </View>
            )}

            {/* Company Name (Corporate) */}
            {zoneConfig?.fields.includes('companyName') && (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Company Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your company name"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.companyName}
                  onChangeText={(text) => setFormData({ ...formData, companyName: text })}
                />
              </View>
            )}

            {/* Email */}
            {zoneConfig?.fields.includes('email') && (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  {slug === 'corporate' ? 'Corporate Email' : 'Email Address'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={
                    slug === 'corporate'
                      ? 'your.name@company.com'
                      : slug === 'student'
                      ? 'your.name@university.edu'
                      : 'Enter your email'
                  }
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Service Number (Defence) */}
            {zoneConfig?.fields.includes('serviceNumber') && (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Service Number</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your service number"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.serviceNumber}
                  onChangeText={(text) => setFormData({ ...formData, serviceNumber: text })}
                />
              </View>
            )}
          </View>

          {/* Submit Button */}
          <Pressable
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.textDark} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.textDark} />
                <Text style={styles.submitButtonText}>Submit Verification</Text>
              </>
            )}
          </Pressable>

          {/* Note */}
          <Text style={styles.noteText}>
            Your information is securely stored and only used for verification purposes.
            Verification typically takes 24-48 hours.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.base,
  },
  loadingText: {
    ...Typography.bodyLarge,
    color: COLORS.textMuted,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.base,
  },
  authTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: Spacing.base,
  },
  authSubtitle: {
    ...Typography.bodyLarge,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.base,
  },
  loginButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  backButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backButtonText: {
    ...Typography.body,
    color: COLORS.textMuted,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.base,
  },
  statusIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: Spacing.sm,
  },
  statusSubtitle: {
    ...Typography.bodyLarge,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.base,
  },
  primaryButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    gap: Spacing.base,
    paddingBottom: 120,
  },
  zoneCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  zoneIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoneName: {
    ...Typography.h2,
    fontWeight: '800',
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  zoneDescription: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  instructionsTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  instructionsText: {
    ...Typography.body,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  errorCard: {
    backgroundColor: `${COLORS.error}10`,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
  },
  errorText: {
    flex: 1,
    ...Typography.body,
    color: COLORS.error,
  },
  formContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  fieldContainer: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  documentTypeContainer: {
    gap: Spacing.sm,
  },
  documentTypeButton: {
    padding: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  documentTypeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  documentTypeText: {
    ...Typography.body,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  documentTypeTextActive: {
    color: COLORS.textDark,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BorderRadius.md,
    padding: 14,
    ...Typography.bodyLarge,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  noteText: {
    ...Typography.bodySmall,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
});

export default withErrorBoundary(ZoneVerifyScreen, 'OffersZonesSlugVerify');
