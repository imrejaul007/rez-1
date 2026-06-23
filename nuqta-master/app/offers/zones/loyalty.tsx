import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Loyalty Rewards Page
 * Production-ready loyalty progress and rewards page
 * Fetches real data from backend API
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Dimensions,
  RefreshControl
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import { useGetCurrencySymbol } from '@/stores/selectors';
import realOffersApi from '@/services/realOffersApi';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types based on backend model
interface LoyaltyMilestone {
  _id: string;
  title: string;
  description: string;
  targetType: 'orders' | 'spend' | 'referrals' | 'reviews' | 'checkins' | 'purchases';
  targetValue: number;
  reward: string;
  rewardType: 'coins' | 'badge' | 'discount' | 'freebie' | 'tier_upgrade';
  rewardCoins?: number;
  rewardDiscount?: number;
  icon: string;
  color: string;
  badgeImage?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  order: number;
  isActive: boolean;
  // Progress fields (from getLoyaltyProgress)
  currentValue?: number;
  progress?: number;
  isCompleted?: boolean;
  claimedAt?: string;
}

// Shimmer animation component
const ShimmerPlaceholder: React.FC<{ style?: any }> = ({ style }) => {
  const shimmerAnim = useSharedValue(0);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerAnim.value, [0, 1], [-SCREEN_WIDTH, SCREEN_WIDTH]) }],
  }));

  useEffect(() => {
    shimmerAnim.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1
    );
    return () => { shimmerAnim.value = 0; };
  }, []);

  return (
    <View style={[styles.shimmerContainer, style]}>
      <Animated.View
        style={[
          styles.shimmerGradient,
          shimmerStyle,
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// Skeleton card for loading state
const SkeletonMilestoneCard: React.FC = () => (
  <View style={styles.loyaltyCard}>
    <View style={styles.loyaltyContent}>
      <ShimmerPlaceholder style={styles.skeletonLogo} />
      <View style={styles.loyaltyInfo}>
        <View style={styles.loyaltyHeader}>
          <View style={styles.loyaltyStoreInfo}>
            <ShimmerPlaceholder style={styles.skeletonTitle} />
            <ShimmerPlaceholder style={styles.skeletonSubtitle} />
          </View>
          <ShimmerPlaceholder style={styles.skeletonBadge} />
        </View>
        <ShimmerPlaceholder style={styles.skeletonProgress} />
        <ShimmerPlaceholder style={styles.skeletonMilestone} />
      </View>
    </View>
  </View>
);

// Map icon names to Ionicons
const mapIcon = (icon: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    trophy: 'trophy-outline',
    cart: 'cart-outline',
    star: 'star-outline',
    wallet: 'wallet-outline',
    diamond: 'diamond-outline',
    people: 'people-outline',
    medal: 'medal-outline',
    chatbubble: 'chatbubble-outline',
    create: 'create-outline',
    flame: 'flame-outline',
    ribbon: 'ribbon-outline',
    gift: 'gift-outline',
    flag: 'flag-outline' };
  return iconMap[icon] || 'star-outline';
};

// Get progress label based on target type
const getProgressLabel = (milestone: LoyaltyMilestone, currencySymbol: string): string => {
  const current = milestone.currentValue || 0;
  const target = milestone.targetValue;

  switch (milestone.targetType) {
    case 'orders':
      return `${current}/${target} orders`;
    case 'spend':
      return `${currencySymbol}${current.toLocaleString()}/${currencySymbol}${target.toLocaleString()} spent`;
    case 'referrals':
      return `${current}/${target} referrals`;
    case 'reviews':
      return `${current}/${target} reviews`;
    case 'checkins':
      return `${current}/${target} days`;
    case 'purchases':
      return `${current}/${target} purchases`;
    default:
      return `${current}/${target}`;
  }
};

// Get remaining label
const getRemainingLabel = (milestone: LoyaltyMilestone, currencySymbol: string): string => {
  const current = milestone.currentValue || 0;
  const remaining = Math.max(0, milestone.targetValue - current);

  switch (milestone.targetType) {
    case 'orders':
      return `${remaining} more order${remaining !== 1 ? 's' : ''}`;
    case 'spend':
      return `Spend ${currencySymbol}${remaining.toLocaleString()} more`;
    case 'referrals':
      return `${remaining} more referral${remaining !== 1 ? 's' : ''}`;
    case 'reviews':
      return `${remaining} more review${remaining !== 1 ? 's' : ''}`;
    case 'checkins':
      return `${remaining} more day${remaining !== 1 ? 's' : ''}`;
    case 'purchases':
      return `${remaining} more purchase${remaining !== 1 ? 's' : ''}`;
    default:
      return `${remaining} more`;
  }
};

function LoyaltyRewardsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [milestones, setMilestones] = useState<LoyaltyMilestone[]>([]);
  const [completedMilestones, setCompletedMilestones] = useState<LoyaltyMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bottom padding = Fixed CTA height (80px) + Bottom nav bar (70px) + Safe area bottom
  const bottomPadding = 80 + 70 + insets.bottom;

  const fetchMilestones = async () => {
    try {
      setError(null);
      const [milestonesResponse, progressResponse] = await Promise.all([
        realOffersApi.getLoyaltyMilestones(),
        realOffersApi.getLoyaltyProgress(),
      ]);

      // Merge milestones with progress data
      const milestonesData = milestonesResponse?.data || [];
      const progressData = progressResponse?.data || [];

      // Create a map of progress by milestone ID
      const progressMap = new Map();
      progressData.forEach((p: any) => {
        progressMap.set(p._id, p);
      });

      // Merge data
      const mergedMilestones = milestonesData.map((milestone: any) => {
        const progress = progressMap.get(milestone._id) || {};
        return {
          ...milestone,
          currentValue: progress.currentValue || 0,
          progress: progress.progress || 0,
          isCompleted: progress.isCompleted || false,
          claimedAt: progress.claimedAt };
      });

      // Separate active and completed
      const active = mergedMilestones.filter((m: LoyaltyMilestone) => !m.isCompleted);
      const completed = mergedMilestones.filter((m: LoyaltyMilestone) => m.isCompleted);

      if (!isMounted()) return;
      setMilestones(active);
      if (!isMounted()) return;
      setCompletedMilestones(completed);
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load loyalty milestones');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMilestones();
  };

  // Calculate stats
  const totalProgress = useMemo(() => milestones.length > 0
    ? milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / milestones.length
    : 0, [milestones]);

  const almostDoneCount = useMemo(() => milestones.filter(m => (m.progress || 0) >= 70).length, [milestones]);

  const handleMilestonePress = (milestone: LoyaltyMilestone) => {
    router.push(`/offers/milestone/${milestone._id}` as any);
  };

  const renderMilestoneCard = (milestone: LoyaltyMilestone) => {
    const progress = milestone.progress || 0;
    const isAlmostDone = progress >= 70;

    return (
      <Pressable
        key={milestone._id}
        style={styles.loyaltyCard}
        onPress={() => handleMilestonePress(milestone)}
       
      >
        <View style={styles.loyaltyContent}>
          <View style={[styles.milestoneIcon, { backgroundColor: `${milestone.color}20` }]}>
            <Ionicons name={mapIcon(milestone.icon)} size={28} color={milestone.color} />
          </View>

          <View style={styles.loyaltyInfo}>
            <View style={styles.loyaltyHeader}>
              <View style={styles.loyaltyStoreInfo}>
                <ThemedText style={styles.loyaltyStore}>{milestone.title}</ThemedText>
                <ThemedText style={styles.loyaltyReward}>{milestone.reward}</ThemedText>
              </View>
              {milestone.rewardCoins && (
                <View style={styles.rewardValueContainer}>
                  <ThemedText style={styles.rewardValueLabel}>Earn</ThemedText>
                  <ThemedText style={styles.rewardValue}>+{milestone.rewardCoins}</ThemedText>
                </View>
              )}
            </View>

            {/* Progress */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <ThemedText style={styles.progressLabel}>
                  {getProgressLabel(milestone, currencySymbol)}
                </ThemedText>
                <ThemedText style={styles.progressPercentage}>{Math.round(progress)}%</ThemedText>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%`, backgroundColor: milestone.color },
                  ]}
                />
              </View>
            </View>

            {/* Next Milestone */}
            <View style={styles.milestoneContainer}>
              <View style={[styles.milestoneBadge, isAlmostDone && styles.almostDoneBadge]}>
                <Ionicons
                  name={isAlmostDone ? 'flash' : 'flag'}
                  size={12}
                  color={isAlmostDone ? colors.warningScale[400] : Colors.text.secondary}
                />
                <ThemedText style={[styles.milestoneText, isAlmostDone && styles.almostDoneText]}>
                  {getRemainingLabel(milestone, currencySymbol)}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
            </View>

            {/* Description */}
            <ThemedText style={styles.milestoneDescription} numberOfLines={1}>
              {milestone.description}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    );
  };

  // Render error state
  if (error && !loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} translucent />
        <LinearGradient
          colors={[colors.nileBlue, '#047857', '#065F46']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <SafeAreaView edges={['top']} style={styles.safeHeader}>
            <View style={styles.headerContent}>
              <Pressable
                style={styles.backButton}
                onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
              </Pressable>
              <View style={styles.headerTitleContainer}>
                <ThemedText style={styles.headerTitle}>Loyalty Rewards</ThemedText>
              </View>
              <View style={styles.headerIcon}>
                <ThemedText style={styles.emoji}>🎯</ThemedText>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.text.tertiary} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={fetchMilestones}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} translucent />

      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.nileBlue, '#047857', '#065F46']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Loyalty Rewards</ThemedText>
              <ThemedText style={styles.headerSubtitle}>Complete challenges, earn rewards</ThemedText>
            </View>

            <View style={styles.headerIcon}>
              <ThemedText style={styles.emoji}>🎯</ThemedText>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.nileBlue]} />
        }
      >
        {/* Overall Progress */}
        <View style={styles.progressBanner}>
          <LinearGradient
            colors={['rgba(26, 58, 82, 0.3)', 'rgba(20, 184, 166, 0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressGradient}
          >
            <View style={styles.progressHeaderContent}>
              <View style={styles.progressIconContainer}>
                <Ionicons name="flag" size={32} color={colors.lightMustard} />
              </View>
              <View style={styles.progressTextContainer}>
                <ThemedText style={styles.progressTitle}>Your Progress</ThemedText>
                <ThemedText style={styles.progressSubtitle}>
                  {loading ? 'Loading...' : `${milestones.length} active rewards in progress`}
                </ThemedText>
              </View>
            </View>

            {/* Overall progress bar */}
            <View style={styles.overallProgressContainer}>
              <View style={styles.overallProgressHeader}>
                <ThemedText style={styles.overallProgressLabel}>Overall completion</ThemedText>
                <ThemedText style={styles.overallProgressValue}>
                  {Math.round(totalProgress)}%
                </ThemedText>
              </View>
              <View style={styles.overallProgressBar}>
                <View
                  style={[
                    styles.overallProgressFill,
                    { width: `${totalProgress}%` },
                  ]}
                />
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <ThemedText style={[styles.statValue, { color: colors.lightMustard }]}>
                  {loading ? '-' : milestones.length}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Active</ThemedText>
              </View>
              <View style={styles.statCard}>
                <ThemedText style={[styles.statValue, { color: colors.warningScale[400] }]}>
                  {loading ? '-' : almostDoneCount}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Almost Done</ThemedText>
              </View>
              <View style={styles.statCard}>
                <ThemedText style={[styles.statValue, { color: colors.brand.purpleSoft }]}>
                  {loading ? '-' : completedMilestones.length}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Completed</ThemedText>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Almost There Section */}
        <View style={styles.almostThereSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="trending-up" size={20} color={colors.warningScale[400]} />
              <ThemedText style={styles.sectionTitle}>
                {almostDoneCount > 0 ? 'Almost There!' : 'Your Milestones'}
              </ThemedText>
            </View>
            <ThemedText style={styles.sectionSubtitle}>Complete these to unlock rewards</ThemedText>
          </View>

          {loading ? (
            <>
              <SkeletonMilestoneCard />
              <SkeletonMilestoneCard />
              <SkeletonMilestoneCard />
            </>
          ) : milestones.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={Colors.text.tertiary} />
              <ThemedText style={styles.emptyText}>No active milestones</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Start shopping to unlock loyalty rewards!
              </ThemedText>
            </View>
          ) : (
            milestones.map(renderMilestoneCard)
          )}
        </View>

        {/* Completed Rewards */}
        {completedMilestones.length > 0 && (
          <View style={styles.completedSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="star" size={20} color={colors.brand.purpleSoft} />
                <ThemedText style={styles.sectionTitle}>Completed Rewards</ThemedText>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.completedScroll}
            >
              {completedMilestones.map((milestone) => (
                <View key={milestone._id} style={styles.completedCard}>
                  <View style={styles.completedHeader}>
                    <View style={[styles.completedIcon, { backgroundColor: `${milestone.color}20` }]}>
                      <Ionicons name={mapIcon(milestone.icon)} size={20} color={milestone.color} />
                    </View>
                    <View style={styles.completedBadge}>
                      <ThemedText style={styles.completedBadgeText}>Claimed</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.completedReward} numberOfLines={1}>
                    {milestone.reward}
                  </ThemedText>
                  <ThemedText style={styles.completedStore} numberOfLines={1}>
                    {milestone.title}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* How it Works */}
        <View style={styles.howItWorks}>
          <ThemedText style={styles.howItWorksTitle}>How Loyalty Rewards Work</ThemedText>
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <ThemedText style={styles.stepNumberText}>1</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>
                Visit or spend at participating stores
              </ThemedText>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <ThemedText style={styles.stepNumberText}>2</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>
                Pay with ${BRAND.APP_NAME} Wallet for automatic tracking
              </ThemedText>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <ThemedText style={styles.stepNumberText}>3</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>
                Complete milestones and claim rewards!
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed CTA Button */}
      <View style={styles.fixedCTA}>
        <Pressable
          style={styles.ctaButton}
          onPress={() => router.push('/offers' as any)}
         
        >
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Ionicons name="gift" size={20} color={colors.background.primary} style={{ marginRight: Spacing.sm }} />
            <ThemedText style={styles.ctaButtonText}>Find More Loyalty Programs</ThemedText>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0 },
  safeHeader: {
    paddingBottom: Spacing.base },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center' },
  headerTitle: {
    ...Typography.h3,
    color: colors.background.primary,
    fontWeight: '700' },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2 },
  headerIcon: {
    width: 40,
    alignItems: 'center' },
  emoji: {
    fontSize: 32 },
  scrollView: {
    flex: 1 },
  scrollContent: {
    paddingBottom: 150 },
  progressBanner: {
    margin: Spacing.base,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.medium },
  progressGradient: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
    borderRadius: BorderRadius['2xl'] },
  progressHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base },
  progressIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 205, 87, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base },
  progressTextContainer: {
    flex: 1 },
  progressTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 2 },
  progressSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.secondary },
  overallProgressContainer: {
    marginBottom: Spacing.base },
  overallProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs },
  overallProgressLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary },
  overallProgressValue: {
    ...Typography.label,
    color: colors.lightMustard,
    fontWeight: '600' },
  overallProgressBar: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden' },
  overallProgressFill: {
    height: '100%',
    backgroundColor: colors.lightMustard,
    borderRadius: BorderRadius.full },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.base },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center' },
  statValue: {
    ...Typography.h2,
    fontWeight: '700',
    marginBottom: 2 },
  statLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary },
  almostThereSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg },
  sectionHeader: {
    marginBottom: Spacing.md },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4 },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    fontWeight: '600' },
  sectionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary },
  loyaltyCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle },
  loyaltyContent: {
    flexDirection: 'row',
    gap: Spacing.base },
  milestoneIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center' },
  loyaltyInfo: {
    flex: 1 },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm },
  loyaltyStoreInfo: {
    flex: 1,
    marginRight: Spacing.sm },
  loyaltyStore: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 2 },
  loyaltyReward: {
    ...Typography.bodySmall,
    color: colors.lightMustard },
  rewardValueContainer: {
    alignItems: 'flex-end' },
  rewardValueLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: 2 },
  rewardValue: {
    ...Typography.label,
    color: colors.warningScale[400],
    fontWeight: '600' },
  progressContainer: {
    marginBottom: Spacing.sm },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs },
  progressLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary },
  progressPercentage: {
    ...Typography.labelSmall,
    color: colors.lightMustard,
    fontWeight: '600' },
  progressBar: {
    height: 8,
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.full,
    overflow: 'hidden' },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full },
  milestoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4 },
  almostDoneBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  milestoneText: {
    ...Typography.caption,
    color: Colors.text.secondary },
  almostDoneText: {
    color: colors.warningScale[400],
    fontWeight: '600' },
  milestoneDescription: {
    ...Typography.caption,
    color: Colors.text.tertiary },
  completedSection: {
    marginBottom: Spacing.lg },
  completedScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md },
  completedCard: {
    minWidth: 160,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)' },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm },
  completedIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center' },
  completedBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm },
  completedBadgeText: {
    ...Typography.caption,
    color: colors.background.primary,
    fontWeight: '600' },
  completedReward: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 2 },
  completedStore: {
    ...Typography.caption,
    color: Colors.text.tertiary },
  howItWorks: {
    margin: Spacing.base,
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    ...Shadows.subtle },
  howItWorksTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: Spacing.md },
  stepsContainer: {
    gap: Spacing.md },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 58, 82, 0.15)',
    alignItems: 'center',
    justifyContent: 'center' },
  stepNumberText: {
    ...Typography.caption,
    color: colors.nileBlue,
    fontWeight: '700' },
  stepText: {
    ...Typography.body,
    color: Colors.text.secondary,
    flex: 1,
    paddingTop: 2 },
  fixedCTA: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    ...Shadows.medium },
  ctaButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden' },
  ctaGradient: {
    flexDirection: 'row',
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center' },
  ctaButtonText: {
    ...Typography.button,
    color: colors.background.primary,
    fontWeight: '600' },
  // Shimmer styles
  shimmerContainer: {
    backgroundColor: colors.neutral[200],
    borderRadius: BorderRadius.md,
    overflow: 'hidden' },
  shimmerGradient: {
    ...StyleSheet.absoluteFillObject },
  skeletonLogo: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md },
  skeletonTitle: {
    width: 120,
    height: 16,
    borderRadius: BorderRadius.sm,
    marginBottom: 8 },
  skeletonSubtitle: {
    width: 80,
    height: 12,
    borderRadius: BorderRadius.sm },
  skeletonBadge: {
    width: 50,
    height: 24,
    borderRadius: BorderRadius.sm },
  skeletonProgress: {
    width: '100%',
    height: 8,
    borderRadius: BorderRadius.full,
    marginVertical: 12 },
  skeletonMilestone: {
    width: 100,
    height: 20,
    borderRadius: BorderRadius.sm },
  // Error & Empty states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl },
  errorText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    textAlign: 'center' },
  retryButton: {
    backgroundColor: colors.nileBlue,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg },
  retryButtonText: {
    ...Typography.button,
    color: colors.background.primary,
    fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl },
  emptyText: {
    ...Typography.h4,
    color: Colors.text.secondary,
    marginTop: Spacing.md },
  emptySubtext: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs } });

export default withErrorBoundary(LoyaltyRewardsPage, 'OffersZonesLoyalty');
