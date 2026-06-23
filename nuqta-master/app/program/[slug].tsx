import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Standalone Program Detail Screen
 *
 * Deep-linkable screen for Special Programs (Student Zone, Corporate Perks, Nuqta Privé).
 * Supports push notification deep links and sharing.
 * Uses the same API and state-machine rendering as ProgramDetailModal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import specialProgramApi, {
  EligibilityResult,
  SpecialProgramSlug,
} from '@/services/specialProgramApi';
import { platformAlert } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/DesignSystem';
import { DetailPageSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const VALID_SLUGS: SpecialProgramSlug[] = ['student_zone', 'corporate_perks', 'nuqta_prive'];

const PROGRAM_ICONS: Record<string, { name: string; color: string; bgColor: string }> = {
  student_zone: { name: 'school', color: colors.infoScale[400], bgColor: colors.tint.blueLight },
  corporate_perks: { name: 'briefcase', color: colors.warningScale[400], bgColor: colors.tint.amberLight },
  nuqta_prive: { name: 'diamond', color: colors.brand.goldAccent, bgColor: colors.deepNavy },
};

function ProgramDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const programSlug = VALID_SLUGS.includes(slug as SpecialProgramSlug)
    ? (slug as SpecialProgramSlug)
    : null;

  const iconConfig = programSlug ? PROGRAM_ICONS[programSlug] : PROGRAM_ICONS.student_zone;
  const isPrive = programSlug === 'nuqta_prive';

  const fetchEligibility = useCallback(async () => {
    if (!programSlug) return;
    setLoading(true);
    setError(null);
    try {
      const response = await specialProgramApi.checkEligibility(programSlug);
      if (response.success && response.data) {
        setEligibility(response.data);
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Failed to check eligibility');
      }
    } catch {
      if (!isMounted()) return;
      setError('Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [programSlug]);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (programSlug) {
      fetchEligibility();
    } else {
      setError('Invalid program');
      setLoading(false);
    }
  }, [programSlug, fetchEligibility]);

  const handleActivate = async () => {
    if (!programSlug) return;
    setActivating(true);
    try {
      const response = await specialProgramApi.activate(programSlug);
      if (response.success) {
        platformAlert('Welcome!', `You are now a ${eligibility?.program.name} member!`);
        await fetchEligibility();
      } else {
        platformAlert('Activation Failed', response.message || 'Please try again.');
      }
    } catch {
      platformAlert('Error', 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setActivating(false);
    }
  };

  const handleVerify = () => {
    const zone = eligibility?.program.slug === 'student_zone' ? 'student'
      : eligibility?.program.slug === 'corporate_perks' ? 'corporate' : null;
    if (zone) {
      router.push({ pathname: '/profile/verification', params: { zone } } as any);
    }
  };

  if (!programSlug) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>Invalid program</Text>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const renderActiveMember = () => {
    const membership = eligibility!.membership!;
    const cap = membership.monthlyCap;
    const earned = membership.currentMonthEarnings;
    const progress = cap > 0 ? Math.min((earned / cap) * 100, 100) : 0;

    return (
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.statusBanner}>
          <LinearGradient
            colors={[iconConfig.color + '20', iconConfig.color + '10']}
            style={styles.statusGradient}
          >
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.statusText}>Active Member</Text>
          </LinearGradient>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Earnings</Text>
          <View style={styles.meterContainer}>
            <View style={styles.meterBg}>
              <View style={[styles.meterFill, { width: `${progress}%`, backgroundColor: iconConfig.color }]} />
            </View>
            <View style={styles.meterLabels}>
              <Text style={styles.meterValue}>{earned.toLocaleString()} coins</Text>
              {cap > 0 && <Text style={styles.meterCap}>/ {cap.toLocaleString()} cap</Text>}
            </View>
          </View>
        </View>

        {membership.multiplier > 1 && (
          <View style={styles.card}>
            <View style={styles.multiplierRow}>
              <View style={[styles.multiplierBadge, { backgroundColor: iconConfig.color + '20' }]}>
                <Text style={[styles.multiplierText, { color: iconConfig.color }]}>
                  {membership.multiplier}x
                </Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Active Multiplier</Text>
                <Text style={styles.cardSubtitle}>Applied to qualifying earnings</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{membership.totalEarnings.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>+{membership.totalMultiplierBonus.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Bonus Coins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{membership.monthsActive}</Text>
            <Text style={styles.statLabel}>Months Active</Text>
          </View>
        </View>

        {/* Exclusive Campaigns */}
        {membership.linkedCampaigns && membership.linkedCampaigns.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Exclusive Campaigns</Text>
            {membership.linkedCampaigns.map((campaign, idx) => (
              <View key={idx} style={styles.campaignRow}>
                <Text style={styles.campaignBadge}>{campaign.badge || '🎯'}</Text>
                <Text style={styles.campaignTitle}>{campaign.title}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Benefits</Text>
          {eligibility!.program.benefits.map((benefit, idx) => (
            <View key={idx} style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>{benefit.icon}</Text>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDesc}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderEligible = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.heroSection}>
        <Text style={styles.heroEmoji}>{eligibility!.program.badge}</Text>
        <Text style={styles.heroTitle}>You're Eligible!</Text>
        <Text style={styles.heroSubtitle}>{eligibility!.message}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What You'll Get</Text>
        {eligibility!.program.benefits.map((benefit, idx) => (
          <View key={idx} style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>{benefit.icon}</Text>
            <View style={styles.benefitTextContainer}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDesc}>{benefit.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.earningsHighlight}>
          <Ionicons name="trending-up" size={20} color={iconConfig.color} />
          <Text style={[styles.earningsText, { color: iconConfig.color }]}>
            {eligibility!.program.earningsDisplayText}
          </Text>
        </View>
      </View>

      <Pressable
        style={[styles.activateButton, { backgroundColor: iconConfig.color }]}
        onPress={handleActivate}
        disabled={activating}
       
      >
        {activating ? (
          <ActivityIndicator color={colors.background.primary} />
        ) : (
          <Text style={styles.activateButtonText}>Activate Now</Text>
        )}
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderNotEligible = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.heroSection}>
        <Text style={styles.heroEmoji}>{eligibility!.program.badge}</Text>
        <Text style={styles.heroTitle}>{eligibility!.program.name}</Text>
        <Text style={styles.heroSubtitle}>{eligibility!.program.description}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Requirements</Text>
        {eligibility!.requirements.map((req, idx) => (
          <View key={idx} style={styles.requirementRow}>
            <Ionicons
              name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={req.met ? Colors.success : Colors.text.tertiary}
            />
            <Text style={[styles.requirementText, req.met && styles.requirementMet]}>
              {req.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What You'll Unlock</Text>
        {eligibility!.program.benefits.map((benefit, idx) => (
          <View key={idx} style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>{benefit.icon}</Text>
            <View style={styles.benefitTextContainer}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDesc}>{benefit.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {!isPrive && eligibility!.requirements.some(r => !r.met && r.type === 'verification') && (
        <Pressable
          style={[styles.activateButton, { backgroundColor: iconConfig.color }]}
          onPress={handleVerify}
         
        >
          <Text style={styles.activateButtonText}>Verify Now</Text>
        </Pressable>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderPendingVerification = () => (
    <View style={styles.centerContent}>
      <View style={styles.pendingIcon}>
        <Ionicons name="time" size={48} color={colors.warningScale[400]} />
      </View>
      <Text style={styles.pendingTitle}>Verification Under Review</Text>
      <Text style={styles.pendingSubtitle}>{eligibility!.message}</Text>
      <View style={styles.pendingTimeline}>
        <View style={styles.timelineStep}>
          <View style={[styles.timelineDot, styles.timelineDotComplete]} />
          <Text style={styles.timelineLabel}>Application Submitted</Text>
        </View>
        <View style={styles.timelineLine} />
        <View style={styles.timelineStep}>
          <View style={[styles.timelineDot, styles.timelineDotActive]} />
          <Text style={styles.timelineLabel}>Under Review</Text>
        </View>
        <View style={styles.timelineLine} />
        <View style={styles.timelineStep}>
          <View style={styles.timelineDot} />
          <Text style={[styles.timelineLabel, { color: Colors.text.tertiary }]}>Approved</Text>
        </View>
      </View>
    </View>
  );

  const renderInactive = () => (
    <View style={styles.centerContent}>
      <Ionicons
        name={eligibility!.state === 'suspended' ? 'pause-circle' : 'close-circle'}
        size={48}
        color={eligibility!.state === 'suspended' ? colors.warningScale[400] : Colors.error}
      />
      <Text style={styles.inactiveTitle}>
        {eligibility!.state === 'suspended' ? 'Membership Suspended' :
         eligibility!.state === 'expired' ? 'Membership Expired' : 'Membership Revoked'}
      </Text>
      <Text style={styles.inactiveSubtitle}>{eligibility!.message}</Text>
      {eligibility!.state === 'expired' && !isPrive && (
        <Pressable
          style={[styles.activateButton, { backgroundColor: iconConfig.color, marginTop: Spacing.lg }]}
          onPress={handleVerify}
         
        >
          <Text style={styles.activateButtonText}>Re-verify</Text>
        </Pressable>
      )}
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return <DetailPageSkeleton />;
    }

    if (error) {
      return (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchEligibility}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (!eligibility) return null;

    switch (eligibility.state) {
      case 'active_member':
        return renderActiveMember();
      case 'eligible':
        return renderEligible();
      case 'not_eligible':
        return renderNotEligible();
      case 'pending_verification':
        return renderPendingVerification();
      case 'suspended':
      case 'expired':
      case 'revoked':
        return renderInactive();
      default:
        return renderNotEligible();
    }
  };

  return (
    <SafeAreaView style={[styles.container, isPrive && styles.containerDark]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.headerButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={isPrive ? colors.background.primary : Colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, isPrive && styles.headerTitleDark]}>
          {eligibility?.program.name || 'Program Details'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  containerDark: {
    backgroundColor: colors.midGrayAlt,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  headerTitleDark: {
    color: colors.background.primary,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
  backButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  backButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },

  // Status Banner
  statusBanner: {
    marginBottom: Spacing.base,
  },
  statusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  statusText: {
    ...Typography.label,
    color: Colors.success,
    fontWeight: '700',
  },

  // Cards
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  cardTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  cardSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },

  // Meter
  meterContainer: {
    marginTop: Spacing.sm,
  },
  meterBg: {
    height: 10,
    backgroundColor: Colors.gray[100],
    borderRadius: 5,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 5,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  meterValue: {
    ...Typography.labelSmall,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  meterCap: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },

  // Multiplier
  multiplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  multiplierBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiplierText: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  statValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },

  // Campaigns
  campaignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  campaignBadge: {
    fontSize: 20,
  },
  campaignTitle: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
  },

  // Benefits
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  benefitIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  benefitDesc: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  heroTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.base,
  },

  // Earnings
  earningsHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  earningsText: {
    ...Typography.h4,
    fontWeight: '700',
  },

  // Activate button
  activateButton: {
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  activateButtonText: {
    ...Typography.button,
    color: colors.background.primary,
    fontWeight: '600',
  },

  // Requirements
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  requirementText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
  },
  requirementMet: {
    color: Colors.success,
  },

  // Pending
  pendingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.tint.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  pendingTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  pendingSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  pendingTimeline: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.gray[200],
    borderWidth: 2,
    borderColor: Colors.gray[300],
  },
  timelineDotComplete: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  timelineDotActive: {
    backgroundColor: colors.warningScale[400],
    borderColor: colors.warningScale[400],
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.gray[200],
    marginLeft: 7,
  },
  timelineLabel: {
    ...Typography.body,
    color: Colors.text.primary,
  },

  // Inactive
  inactiveTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  inactiveSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(ProgramDetailScreen, 'ProgramSlug');
