import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Creator Application Page
// Multi-step form for applying as a creator

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { FormPageSkeleton } from '@/components/skeletons';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import creatorsApi, { EligibilityResult } from '@/services/creatorsApi';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

const categoryOptions = [
  { id: 'fashion', name: 'Fashion', icon: 'shirt-outline' },
  { id: 'beauty', name: 'Beauty', icon: 'sparkles-outline' },
  { id: 'lifestyle', name: 'Lifestyle', icon: 'home-outline' },
  { id: 'tech', name: 'Tech', icon: 'hardware-chip-outline' },
  { id: 'fitness', name: 'Fitness', icon: 'fitness-outline' },
  { id: 'food', name: 'Food', icon: 'restaurant-outline' },
];

const socialPlatforms = [
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram' },
  { id: 'youtube', name: 'YouTube', icon: 'logo-youtube' },
  { id: 'twitter', name: 'Twitter/X', icon: 'logo-twitter' },
  { id: 'tiktok', name: 'TikTok', icon: 'musical-notes' },
];

function CreatorApplyPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [step, setStep] = useState(0); // 0=check eligibility, 1=category, 2=profile, 3=social, 4=review
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [selectedCategory, setSelectedCategory] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([]);

  // Check eligibility on mount and when returning from upload
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    checkEligibility();
  }, [isAuthenticated, authLoading]);

  // Re-check when page regains focus (e.g., returning from upload)
  useEffect(() => {
    const onFocus = () => checkEligibility();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    }
  }, []);

  const checkEligibility = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await creatorsApi.checkEligibility();

      if (response.success && response.data) {
        if (!isMounted()) return;
        setEligibility(response.data);

        // If they have an existing approved profile, redirect directly
        if (response.data.existingProfile?.status === 'approved') {
          router.replace('/creator-dashboard');
          return;
        }

        // If pending, show status
        if (response.data.existingProfile?.status === 'pending') {
          if (!isMounted()) return;
          setStep(-1); // pending status view
          return;
        }

        // If eligible, move to step 1
        if (response.data.eligible) {
          if (!isMounted()) return;
          setStep(1);
        }
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to check eligibility');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to check eligibility');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && tags.length < 5 && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const removeTag = useCallback((index: number) => {
    setTags(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateSocialLink = useCallback((platform: string, url: string) => {
    setSocialLinks(prev => {
      const existing = prev.findIndex(l => l.platform === platform);
      if (existing >= 0) {
        if (!url.trim()) return prev.filter(l => l.platform !== platform);
        const next = [...prev];
        next[existing] = { platform, url: url.trim() };
        return next;
      }
      if (url.trim()) return [...prev, { platform, url: url.trim() }];
      return prev;
    });
  }, []);

  const getSocialUrl = (platform: string) =>
    socialLinks.find(l => l.platform === platform)?.url || '';

  const handleSubmit = async () => {
    if (!selectedCategory || !displayName.trim() || !bio.trim()) {
      platformAlertSimple('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await creatorsApi.applyAsCreator({
        displayName: displayName.trim(),
        bio: bio.trim(),
        category: selectedCategory,
        tags: tags.length > 0 ? tags : undefined,
        socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
      });

      if (response.success) {
        if (!isMounted()) return;
        setStep(5); // success view
      } else {
        platformAlertSimple('Application Failed', response.error || 'Please try again later.');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to submit application.');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!selectedCategory;
    if (step === 2) return displayName.trim().length >= 3 && bio.trim().length >= 20;
    if (step === 3) return true; // social links are optional
    return false;
  };

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />
        <Header onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} title="Become a Creator" />
        <View style={styles.centerContainer}>
          <FormPageSkeleton />
        </View>
      </View>
    );
  }

  // ============================================
  // PENDING APPLICATION
  // ============================================

  if (step === -1) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />
        <Header onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} title="Application Status" />
        <View style={styles.centerContainer}>
          <View style={styles.statusIcon}>
            <Ionicons name="time-outline" size={48} color={Colors.warning} />
          </View>
          <Text style={styles.statusTitle}>Application Under Review</Text>
          <Text style={styles.statusSubtitle}>
            Your creator application is being reviewed. We'll notify you once a decision is made.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ============================================
  // NOT ELIGIBLE
  // ============================================

  if (step === 0 && eligibility && !eligibility.eligible) {
    const needsVideos = eligibility.requirements.some(r => r.label.toLowerCase().includes('video') && !r.met);

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />
        <Header onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} title="Become a Creator" />
        <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
          <View style={styles.eligibilityCard}>
            <View style={[styles.statusIcon, { backgroundColor: Colors.warningScale[50] }]}>
              <Ionicons name={needsVideos ? 'videocam-outline' : 'rocket-outline'} size={48} color={colors.warningScale[700]} />
            </View>
            <Text style={styles.statusTitle}>Almost There!</Text>
            <Text style={styles.statusSubtitle}>
              {needsVideos
                ? 'Upload your first video to unlock creator access'
                : 'Complete the following to get started'}
            </Text>

            <View style={styles.requirementsList}>
              {eligibility.requirements.map((req, index) => (
                <View key={index} style={[styles.requirementRow, { backgroundColor: req.met ? Colors.successScale[50] : Colors.warningScale[50] }]}>
                  <Ionicons
                    name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={req.met ? Colors.success : Colors.warning}
                  />
                  <View style={styles.requirementInfo}>
                    <Text style={[styles.requirementLabel, req.met && { color: Colors.success }]}>{req.label}</Text>
                    <Text style={styles.requirementProgress}>
                      {req.current} / {req.required}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {needsVideos && (
              <Pressable
                style={styles.uploadCta}
                onPress={() => router.push('/ugc-upload')}
               
              >
                <LinearGradient
                  colors={[Colors.brand.purple, Colors.brand.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.uploadCtaGradient}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color={Colors.text.inverse} />
                  <Text style={styles.uploadCtaText}>Upload Your First Video</Text>
                </LinearGradient>
              </Pressable>
            )}

            <Pressable
              style={styles.recheckBtn}
              onPress={checkEligibility}
             
            >
              <Ionicons name="refresh-outline" size={16} color={colors.brand.purple} />
              <Text style={styles.recheckBtnText}>Re-check Eligibility</Text>
            </Pressable>

            {eligibility.existingProfile?.status === 'rejected' && (
              <View style={styles.rejectionBox}>
                <Text style={styles.rejectionTitle}>Previous Application Rejected</Text>
                {eligibility.existingProfile.rejectionReason && (
                  <Text style={styles.rejectionReason}>
                    {eligibility.existingProfile.rejectionReason}
                  </Text>
                )}
              </View>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ============================================
  // SUCCESS
  // ============================================

  if (step === 5) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />
        <Header onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} title="Application Submitted" />
        <View style={styles.centerContainer}>
          <LinearGradient colors={[Colors.brand.purple, colors.brand.pink]} style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color={Colors.text.inverse} />
          </LinearGradient>
          <Text style={styles.statusTitle}>Application Submitted!</Text>
          <Text style={styles.statusSubtitle}>
            Your creator application has been submitted successfully. We'll review it and notify you soon.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/playandearn')}
          >
            <Text style={styles.primaryButtonText}>Back to Play & Earn</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ============================================
  // MULTI-STEP FORM
  // ============================================

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />
      <Header onBack={() => step > 1 ? setStep(step - 1) : router.canGoBack() ? router.back() : router.replace('/(tabs)')} title="Become a Creator" />

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        {[1, 2, 3, 4].map(s => (
          <View
            key={s}
            style={[
              styles.progressDot,
              s <= step && styles.progressDotActive,
              s === step && styles.progressDotCurrent,
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* STEP 1: Category */}
          {step === 1 && (
            <View>
              <Text style={styles.stepTitle}>Choose Your Category</Text>
              <Text style={styles.stepSubtitle}>
                What type of content do you create?
              </Text>
              <View style={styles.categoryGrid}>
                {categoryOptions.map(cat => (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      selectedCategory === cat.id && styles.categoryCardActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={28}
                      color={selectedCategory === cat.id ? Colors.brand.purple : Colors.text.tertiary}
                    />
                    <Text style={[
                      styles.categoryName,
                      selectedCategory === cat.id && styles.categoryNameActive,
                    ]}>
                      {cat.name}
                    </Text>
                    {selectedCategory === cat.id && (
                      <View style={styles.categoryCheck}>
                        <Ionicons name="checkmark-circle" size={20} color="#9333EA" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* STEP 2: Profile */}
          {step === 2 && (
            <View>
              <Text style={styles.stepTitle}>Your Creator Profile</Text>
              <Text style={styles.stepSubtitle}>
                Tell your audience about yourself
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your creator name"
                  placeholderTextColor={colors.neutral[400]}
                  maxLength={50}
                />
                <Text style={styles.charCount}>{displayName.length}/50</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell people what you're about... (min 20 characters)"
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={300}
                />
                <Text style={styles.charCount}>{bio.length}/300</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tags (up to 5)</Text>
                <View style={styles.tagInputRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="Add a tag..."
                    placeholderTextColor={colors.neutral[400]}
                    onSubmitEditing={addTag}
                    maxLength={20}
                  />
                  <Pressable style={styles.addTagButton} onPress={addTag}>
                    <Ionicons name="add" size={20} color={Colors.text.inverse} />
                  </Pressable>
                </View>
                {tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {tags.map((tag, idx) => (
                      <Pressable
                        key={idx}
                        style={styles.tagChip}
                        onPress={() => removeTag(idx)}
                      >
                        <Text style={styles.tagChipText}>{tag}</Text>
                        <Ionicons name="close" size={14} color={Colors.brand.purple} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* STEP 3: Social Links */}
          {step === 3 && (
            <View>
              <Text style={styles.stepTitle}>Social Links</Text>
              <Text style={styles.stepSubtitle}>
                Add your social media profiles (optional)
              </Text>

              {socialPlatforms.map(platform => (
                <View key={platform.id} style={styles.socialInputGroup}>
                  <View style={styles.socialInputLabel}>
                    <Ionicons name={platform.icon as any} size={20} color={Colors.text.tertiary} />
                    <Text style={styles.socialPlatformName}>{platform.name}</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={getSocialUrl(platform.id)}
                    onChangeText={(url) => updateSocialLink(platform.id, url)}
                    placeholder={`Your ${platform.name} URL`}
                    placeholderTextColor={colors.neutral[400]}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              ))}
            </View>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <View>
              <Text style={styles.stepTitle}>Review Your Application</Text>
              <Text style={styles.stepSubtitle}>
                Make sure everything looks good before submitting
              </Text>

              <View style={styles.reviewCard}>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Category</Text>
                  <Text style={styles.reviewValue}>
                    {categoryOptions.find(c => c.id === selectedCategory)?.name || selectedCategory}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Display Name</Text>
                  <Text style={styles.reviewValue}>{displayName}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Bio</Text>
                  <Text style={styles.reviewValue}>{bio}</Text>
                </View>
                {tags.length > 0 && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Tags</Text>
                    <View style={styles.reviewTags}>
                      {tags.map((tag, idx) => (
                        <View key={idx} style={styles.reviewTag}>
                          <Text style={styles.reviewTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {socialLinks.length > 0 && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Social Links</Text>
                    <View>
                      {socialLinks.map((link, idx) => (
                        <Text key={idx} style={styles.reviewValue}>
                          {link.platform}: {link.url}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomBar}>
          {step === 4 ? (
            <Pressable
              style={[styles.submitButton, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <LinearGradient
                colors={[Colors.brand.purple, colors.brand.pink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.text.inverse} />
                ) : (
                  <>
                    <Ionicons name="rocket" size={18} color={Colors.text.inverse} />
                    <Text style={styles.submitText}>Submit Application</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.nextButton, !canProceed() && { opacity: 0.5 }]}
              onPress={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.text.inverse} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ============================================
// HEADER COMPONENT
// ============================================

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <LinearGradient colors={[Colors.nileBlue, '#2d5a7b']} style={headerStyles.header}>
      <View style={headerStyles.content}>
        <Pressable style={headerStyles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
        </Pressable>
        <Text style={headerStyles.title}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>
    </LinearGradient>
  );
}

const headerStyles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },

  // Progress
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.text.inverse,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  progressDot: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.default,
  },
  progressDotActive: {
    backgroundColor: Colors.brand.purple,
  },
  progressDotCurrent: {
    width: 50,
  },

  // Status views
  statusIcon: {
    marginBottom: Spacing.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statusTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  statusSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  primaryButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },

  // Eligibility
  eligibilityCard: {
    backgroundColor: Colors.text.inverse,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  requirementsList: {
    width: '100%',
    gap: Spacing.md,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  requirementInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requirementLabel: {
    ...Typography.body,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  requirementProgress: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  rejectionBox: {
    marginTop: Spacing.base,
    padding: Spacing.md,
    backgroundColor: Colors.errorScale[50],
    borderRadius: BorderRadius.sm,
    width: '100%',
  },
  rejectionTitle: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  rejectionReason: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  uploadCta: {
    width: '100%',
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  uploadCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  uploadCtaText: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  recheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  recheckBtnText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.brand.purple,
  },

  // Step titles
  stepTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },

  // Category
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: Colors.text.inverse,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border.default,
  },
  categoryCardActive: {
    borderColor: Colors.brand.purple,
    backgroundColor: '#FAF5FF',
  },
  categoryName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  categoryNameActive: {
    color: Colors.brand.purple,
  },
  categoryCheck: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },

  // Inputs
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.text.inverse,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },
  charCount: {
    fontSize: 11,
    color: Colors.text.tertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  // Tags
  tagInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addTagButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.brand.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  tagChipText: {
    ...Typography.caption,
    fontWeight: '500',
    color: Colors.brand.purple,
  },

  // Social
  socialInputGroup: {
    marginBottom: Spacing.base,
  },
  socialInputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  socialPlatformName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
  },

  // Review
  reviewCard: {
    backgroundColor: Colors.text.inverse,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.base,
  },
  reviewRow: {
    gap: Spacing.xs,
  },
  reviewLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewValue: {
    ...Typography.body,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  reviewTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  reviewTagText: {
    ...Typography.caption,
    fontWeight: '500',
    color: Colors.brand.purple,
  },

  // Bottom
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: 80,
    backgroundColor: Colors.text.inverse,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.nileBlue,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  nextButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  submitButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  submitText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(CreatorApplyPage, 'CreatorApply');
