// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Prive Tier Progress Page
 *
 * Production-ready screen showing:
 * - Backend-driven tier definitions (no hardcoded thresholds)
 * - Animated score count-up with gold gradient progress
 * - Tier milestone markers on progress bar
 * - Pull-to-refresh with server recalculation
 * - Shimmer skeleton loading
 * - Trust hard-block warning
 * - Contextual weakest-pillar suggestion
 * - Active/locked/achieved tier states
 * - Error + retry state
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  runOnJS,
  useAnimatedStyle,
  withSequence,
  withRepeat,
  interpolate} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  PRIVE_COLORS,
  PRIVE_SPACING,
  PRIVE_RADIUS,
  PILLAR_CONFIG,
  IMPROVEMENT_TIPS,
  PillarId} from '@/components/prive/priveTheme';
import { usePriveEligibility, getQuickWins } from '@/hooks/usePriveEligibility';
import { ELIGIBILITY_THRESHOLDS } from '@/types/mode.types';
import priveApi from '@/services/priveApi';
import { Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// ─── Tier Definition (derived from ELIGIBILITY_THRESHOLDS, never hardcoded) ──
interface TierDef {
  id: string;
  name: string;
  minScore: number;
  icon: string;
  color: string;
  description: string;
}

const TIER_DEFS: TierDef[] = [
  {
    id: 'entry',
    name: 'Entry',
    minScore: ELIGIBILITY_THRESHOLDS.ENTRY_TIER,
    icon: '◇',
    color: '#CD7F32',
    description: 'Welcome to the inner circle'},
  {
    id: 'signature',
    name: 'Signature',
    minScore: ELIGIBILITY_THRESHOLDS.SIGNATURE_TIER,
    icon: '◈',
    color: '#C0C0C0',
    description: 'Premium access granted'},
  {
    id: 'elite',
    name: 'Elite',
    minScore: ELIGIBILITY_THRESHOLDS.ELITE_TIER,
    icon: '✦',
    color: colors.brand.goldBright,
    description: 'Top-tier access unlocked'},
];

// ─── Shimmer Skeleton ────────────────────────────────────────────────────────
const ShimmerSkeleton = () => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 }),
      ), -1);
  }, []);

  const opacity = interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]);

  return (
    <View style={styles.skeletonContainer}>
      {/* Hero card skeleton */}
      <View style={styles.heroCard}>
        <View style={styles.heroContent}>
          <View>
            <Animated.View style={[styles.shimmerLine, { width: 80, height: 12, opacity }]} />
            <Animated.View style={[styles.shimmerLine, { width: 100, height: 42, marginTop: 8, opacity }]} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Animated.View style={[styles.shimmerLine, { width: 90, height: 32, borderRadius: PRIVE_RADIUS.sm, opacity }]} />
            <Animated.View style={[styles.shimmerLine, { width: 70, height: 12, marginTop: 8, opacity }]} />
          </View>
        </View>
        <View style={{ marginTop: PRIVE_SPACING.lg }}>
          <Animated.View style={[styles.shimmerLine, { width: '100%', height: 14, borderRadius: 7, opacity }]} />
        </View>
      </View>

      {/* Progress card skeleton */}
      <View style={styles.progressCard}>
        <Animated.View style={[styles.shimmerLine, { width: 140, height: 14, opacity }]} />
        <Animated.View style={[styles.shimmerLine, { width: '100%', height: 12, borderRadius: 6, marginTop: 16, opacity }]} />
        <Animated.View style={[styles.shimmerLine, { width: 120, height: 12, marginTop: 12, alignSelf: 'center', opacity }]} />
      </View>

      {/* Tier rows skeleton */}
      <View style={styles.tiersCard}>
        <Animated.View style={[styles.shimmerLine, { width: 80, height: 14, opacity }]} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.tierRow, { opacity: 1 }]}>
            <Animated.View style={[styles.shimmerLine, { width: 28, height: 28, borderRadius: 14, opacity }]} />
            <View style={{ flex: 1, marginLeft: PRIVE_SPACING.lg }}>
              <Animated.View style={[styles.shimmerLine, { width: 80, height: 14, opacity }]} />
              <Animated.View style={[styles.shimmerLine, { width: 120, height: 11, marginTop: 4, opacity }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Animated Progress Bar with Tier Milestones ──────────────────────────────
const TierProgressBar = React.memo(({
  score,
  nextTierThreshold}: {
  score: number;
  nextTierThreshold: number;
}) => {
  const widthAnim = useSharedValue(0);
  const maxScore = 100;

  useEffect(() => {
    widthAnim.value = withTiming(score, { duration: 1000 });
  }, [score]);

  const width = interpolate(widthAnim.value, [0, maxScore], ['0%', '100%'], 'clamp');

  return (
    <View>
      {/* Threshold labels */}
      <View style={styles.milestoneLabels}>
        <Text style={styles.milestoneLabel}>0</Text>
        {TIER_DEFS.map((tier) => (
          <Text
            key={tier.id}
            style={[
              styles.milestoneLabel,
              { left: `${(tier.minScore / maxScore) * 100}%`, position: 'absolute' },
              score >= tier.minScore && { color: tier.color },
            ]}
          >
            {tier.minScore}
          </Text>
        ))}
        <Text style={styles.milestoneLabel}>100</Text>
      </View>

      {/* Progress track */}
      <View style={styles.progressTrack}>
        {/* Milestone markers */}
        {TIER_DEFS.map((tier) => (
          <View
            key={tier.id}
            style={[
              styles.milestoneMarker,
              { left: `${(tier.minScore / maxScore) * 100}%` },
              score >= tier.minScore && { backgroundColor: tier.color },
            ]}
          />
        ))}

        {/* Fill */}
        <Animated.View style={[styles.progressFill, { width }]}>
          <LinearGradient
            colors={[PRIVE_COLORS.gold.primary, PRIVE_COLORS.gold.dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {/* Tier name labels under track */}
      <View style={styles.tierNameLabels}>
        {TIER_DEFS.map((tier) => (
          <Text
            key={tier.id}
            style={[
              styles.tierNameLabel,
              { left: `${(tier.minScore / maxScore) * 100}%`, position: 'absolute' },
              score >= tier.minScore && { color: tier.color },
            ]}
          >
            {tier.name}
          </Text>
        ))}
      </View>
    </View>
  );
});

// ─── Hero Score Section ──────────────────────────────────────────────────────
const HeroSection = React.memo(({
  score,
  tier,
  trustScore,
  nextTierName,
  pointsToNextTier}: {
  score: number;
  tier: string;
  trustScore: number;
  nextTierName?: string;
  pointsToNextTier?: number;
}) => {
  const countAnim = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    countAnim.value = 0;
    countAnim.value = withTiming(score, { duration: 1200 });
  }, [score]);

  useAnimatedReaction(
    () => countAnim.value,
    (val) => {
      runOnJS(setDisplayScore)(Math.round(val * 10) / 10);
    },
    [score]
  );

  const getTierColor = () => {
    switch (tier) {
      case 'elite': return colors.brand.goldBright;
      case 'signature': return '#C0C0C0';
      case 'entry': return '#CD7F32';
      default: return PRIVE_COLORS.text.tertiary;
    }
  };

  const getTierLabel = () => {
    switch (tier) {
      case 'elite': return 'Elite';
      case 'signature': return 'Signature';
      case 'entry': return 'Entry';
      default: return 'Not Eligible';
    }
  };

  const isMaxTier = tier === 'elite';
  const isTrustBlocked = trustScore < ELIGIBILITY_THRESHOLDS.TRUST_MINIMUM;

  return (
    <View style={styles.heroCard}>
      {/* Trust Warning Banner */}
      {isTrustBlocked && (
        <View style={styles.trustBanner}>
          <Ionicons name="alert-circle" size={18} color="#F44336" />
          <Text style={styles.trustBannerText}>
            Trust score is {Math.round(trustScore)} — Prive access blocked until trust reaches {ELIGIBILITY_THRESHOLDS.TRUST_MINIMUM}
          </Text>
        </View>
      )}

      <View style={styles.heroContent}>
        <View>
          <Text style={styles.heroLabel}>Prive Score</Text>
          <Text style={styles.heroScoreValue}>{displayScore.toFixed(1)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: PRIVE_SPACING.xs }}>
          <View style={[styles.tierBadge, { backgroundColor: `${getTierColor()}20` }]}>
            <Text style={styles.tierBadgeIcon}>◈</Text>
            <Text style={[styles.tierBadgeText, { color: getTierColor() }]}>{getTierLabel()}</Text>
          </View>
          {isMaxTier ? (
            <Text style={styles.heroSubtext}>Top tier achieved</Text>
          ) : nextTierName && pointsToNextTier !== undefined ? (
            <Text style={styles.heroSubtext}>
              {pointsToNextTier.toFixed(1)} pts to {nextTierName}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
});

// ─── Tier Row ────────────────────────────────────────────────────────────────
const TierRow = React.memo(({
  tier,
  currentScore,
  currentTier}: {
  tier: TierDef;
  currentScore: number;
  currentTier: string;
}) => {
  const isAchieved = currentScore >= tier.minScore;
  const isCurrent = currentTier === tier.id;
  const isLocked = !isAchieved;

  return (
    <View
      style={[
        styles.tierRow,
        isLocked && styles.tierRowLocked,
        isCurrent && styles.tierRowCurrent,
      ]}
      accessibilityLabel={`${tier.name} tier, requires ${tier.minScore} score, ${isAchieved ? 'achieved' : isLocked ? 'locked' : 'current'}`}
    >
      <View style={[styles.tierIconContainer, { backgroundColor: `${tier.color}${isLocked ? '15' : '25'}` }]}>
        <Text style={[styles.tierIcon, { opacity: isLocked ? 0.4 : 1 }]}>{tier.icon}</Text>
      </View>
      <View style={styles.tierInfo}>
        <View style={styles.tierNameRow}>
          <Text style={[styles.tierName, isLocked && styles.tierNameLocked]}>{tier.name}</Text>
          {isCurrent && (
            <View style={[styles.currentBadge, { backgroundColor: `${tier.color}20` }]}>
              <Text style={[styles.currentBadgeText, { color: tier.color }]}>Current</Text>
            </View>
          )}
        </View>
        <Text style={styles.tierDescription}>
          {isLocked
            ? `Requires ${tier.minScore} score`
            : tier.description}
        </Text>
      </View>
      <View style={styles.tierStatusContainer}>
        {isAchieved ? (
          <View style={[styles.achievedCircle, { backgroundColor: `${tier.color}20` }]}>
            <Ionicons name="checkmark" size={16} color={tier.color} />
          </View>
        ) : (
          <View style={styles.lockedCircle}>
            <Ionicons name="lock-closed" size={14} color={PRIVE_COLORS.text.disabled} />
          </View>
        )}
      </View>
    </View>
  );
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
function TierProgressScreen() {
  const { eligibility, isLoading: hookLoading, refresh, error: hookError } = usePriveEligibility();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const isLoading = hookLoading && eligibility.score === 0 && eligibility.pillars.length === 0;

  useEffect(() => {
    if (hookError) setError(hookError);
  }, [hookError]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await priveApi.refreshScore();
      await refresh();
    } catch {
      if (!isMounted()) return;
      setError('Failed to refresh tier data');
    } finally {
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [refresh]);

  // Find the weakest pillar for contextual suggestion
  const weakestPillar = useMemo(() => {
    if (eligibility.pillars.length === 0) return null;
    return [...eligibility.pillars].sort((a, b) => {
      const potentialA = (100 - a.score) * a.weight;
      const potentialB = (100 - b.score) * b.weight;
      return potentialB - potentialA;
    })[0];
  }, [eligibility.pillars]);

  // Quick wins from hook utility
  const quickWins = useMemo(() => getQuickWins(eligibility.pillars), [eligibility.pillars]);

  // Derive next tier info from backend data or compute locally
  const nextTierName = eligibility.nextTierName || (() => {
    const tier = eligibility.tier;
    if (tier === 'none') return 'Entry';
    if (tier === 'entry') return 'Signature';
    if (tier === 'signature') return 'Elite';
    return undefined;
  })();

  const pointsToNext = eligibility.pointsToNextTier ?? (() => {
    const tier = eligibility.tier;
    let threshold = ELIGIBILITY_THRESHOLDS.ENTRY_TIER;
    if (tier === 'entry') threshold = ELIGIBILITY_THRESHOLDS.SIGNATURE_TIER;
    else if (tier === 'signature') threshold = ELIGIBILITY_THRESHOLDS.ELITE_TIER;
    else if (tier === 'elite') return 0;
    return Math.max(0, threshold - eligibility.score);
  })();

  const nextTierThreshold = eligibility.nextTierThreshold ?? (() => {
    const tier = eligibility.tier;
    if (tier === 'entry') return ELIGIBILITY_THRESHOLDS.SIGNATURE_TIER;
    if (tier === 'signature') return ELIGIBILITY_THRESHOLDS.ELITE_TIER;
    if (tier === 'elite') return 100;
    return ELIGIBILITY_THRESHOLDS.ENTRY_TIER;
  })();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={PRIVE_COLORS.gold.primary}
            colors={[PRIVE_COLORS.gold.primary]}
          />
        }
      >
        {/* Loading Skeleton */}
        {isLoading && <ShimmerSkeleton />}

        {/* Error State */}
        {error && !isLoading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color={PRIVE_COLORS.status.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Main Content */}
        {!isLoading && (
          <>
            {/* Hero Score + Tier Badge */}
            <HeroSection
              score={eligibility.score}
              tier={eligibility.tier}
              trustScore={eligibility.trustScore}
              nextTierName={nextTierName}
              pointsToNextTier={pointsToNext}
            />

            {/* Progress Bar with Milestones */}
            <View style={styles.progressCard}>
              <Text style={styles.sectionTitle}>
                {eligibility.tier === 'elite'
                  ? 'Elite Tier Achieved'
                  : `Progress to ${nextTierName}`}
              </Text>
              <TierProgressBar
                score={eligibility.score}
                nextTierThreshold={nextTierThreshold}
              />
              <Text style={styles.progressSubtext}>
                {eligibility.tier === 'elite'
                  ? 'You have unlocked all Prive benefits'
                  : `${pointsToNext.toFixed(1)} points needed for ${nextTierName} tier`}
              </Text>
            </View>

            {/* Contextual Suggestion */}
            {weakestPillar && eligibility.tier !== 'elite' && quickWins.length > 0 && (
              <View style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                  <Ionicons name="bulb-outline" size={16} color={PRIVE_COLORS.gold.primary} />
                  <Text style={styles.suggestionTitle}>Quick Win</Text>
                </View>
                <Text style={styles.suggestionText}>
                  Your <Text style={styles.suggestionBold}>{weakestPillar.name}</Text> pillar has the most room for growth.{' '}
                  {quickWins[0]}
                </Text>
              </View>
            )}

            {/* All Tiers */}
            <View style={styles.tiersCard}>
              <Text style={styles.sectionTitle}>All Tiers</Text>
              {TIER_DEFS.map((tier) => (
                <TierRow
                  key={tier.id}
                  tier={tier}
                  currentScore={eligibility.score}
                  currentTier={eligibility.tier}
                />
              ))}
            </View>

            {/* Tier Benefits Info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>How Tiers Work</Text>
              <Text style={styles.infoText}>
                Your Prive tier is determined by your total reputation score across all 6 pillars.
                Higher tiers unlock exclusive offers, priority support, and premium rewards.
              </Text>
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={PRIVE_COLORS.text.secondary} />
                <Text style={styles.infoRowText}>
                  Trust score must be at least {ELIGIBILITY_THRESHOLDS.TRUST_MINIMUM} to access Prive
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="refresh-outline" size={14} color={PRIVE_COLORS.text.secondary} />
                <Text style={styles.infoRowText}>
                  Score updates automatically based on your activity
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1},
  scrollView: {
    flex: 1,
    paddingHorizontal: PRIVE_SPACING.xl},

  // ─── Skeleton ─────────────────────────────────────────────
  skeletonContainer: {
    marginTop: PRIVE_SPACING.sm},
  shimmerLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: PRIVE_COLORS.border.primary},

  // ─── Hero Section ─────────────────────────────────────────
  heroCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    marginTop: PRIVE_SPACING.sm,
    marginBottom: PRIVE_SPACING.lg},
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'},
  heroLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: PRIVE_SPACING.xs},
  heroScoreValue: {
    fontSize: 42,
    fontWeight: '200',
    color: PRIVE_COLORS.gold.primary},
  heroSubtext: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary},

  // ─── Trust Banner ─────────────────────────────────────────
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    borderRadius: PRIVE_RADIUS.md,
    padding: PRIVE_SPACING.md,
    marginBottom: PRIVE_SPACING.lg},
  trustBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
    lineHeight: 18},

  // ─── Tier Badge ───────────────────────────────────────────
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.xs,
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.sm,
    borderRadius: PRIVE_RADIUS.sm},
  tierBadgeIcon: {
    fontSize: 14,
    color: PRIVE_COLORS.gold.primary},
  tierBadgeText: {
    fontSize: 14,
    fontWeight: '600'},

  // ─── Progress Card ────────────────────────────────────────
  progressCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.lg},
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.lg},
  milestoneLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: PRIVE_SPACING.xs,
    height: 16,
    position: 'relative'},
  milestoneLabel: {
    fontSize: 10,
    color: PRIVE_COLORS.text.tertiary},
  progressTrack: {
    height: 12,
    backgroundColor: PRIVE_COLORS.border.primary,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative'},
  milestoneMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: PRIVE_COLORS.transparent.white20,
    zIndex: 1},
  progressFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden'},
  tierNameLabels: {
    flexDirection: 'row',
    height: 16,
    marginTop: PRIVE_SPACING.xs,
    position: 'relative'},
  tierNameLabel: {
    fontSize: 9,
    color: PRIVE_COLORS.text.disabled,
    textTransform: 'uppercase',
    letterSpacing: 0.5},
  progressSubtext: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    textAlign: 'center',
    marginTop: PRIVE_SPACING.md},

  // ─── Suggestion Card ──────────────────────────────────────
  suggestionCard: {
    backgroundColor: PRIVE_COLORS.transparent.gold05,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    marginBottom: PRIVE_SPACING.lg},
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
    marginBottom: PRIVE_SPACING.sm},
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary},
  suggestionText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 20},
  suggestionBold: {
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary},

  // ─── Tiers Card ───────────────────────────────────────────
  tiersCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.lg},
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: PRIVE_COLORS.transparent.white08},
  tierRowLocked: {
    opacity: 0.5},
  tierRowCurrent: {
    opacity: 1,
    backgroundColor: PRIVE_COLORS.transparent.gold05,
    marginHorizontal: -PRIVE_SPACING.lg,
    paddingHorizontal: PRIVE_SPACING.lg,
    borderRadius: PRIVE_RADIUS.md},
  tierIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: PRIVE_SPACING.md},
  tierIcon: {
    fontSize: 20},
  tierInfo: {
    flex: 1},
  tierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm},
  tierName: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary},
  tierNameLocked: {
    color: PRIVE_COLORS.text.secondary},
  currentBadge: {
    paddingHorizontal: PRIVE_SPACING.sm,
    paddingVertical: 2,
    borderRadius: PRIVE_RADIUS.sm},
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5},
  tierDescription: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 2},
  tierStatusContainer: {
    marginLeft: PRIVE_SPACING.md},
  achievedCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'},
  lockedCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIVE_COLORS.transparent.white08,
    alignItems: 'center',
    justifyContent: 'center'},

  // ─── Info Card ────────────────────────────────────────────
  infoCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.lg},
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm},
  infoText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: PRIVE_SPACING.md},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
    marginTop: PRIVE_SPACING.sm},
  infoRowText: {
    flex: 1,
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 18},

  // ─── Error State ──────────────────────────────────────────
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.xl,
    marginTop: PRIVE_SPACING.sm,
    marginBottom: PRIVE_SPACING.md,
    alignItems: 'center',
    gap: PRIVE_SPACING.md},
  errorText: {
    color: PRIVE_COLORS.status.error,
    fontSize: 13,
    textAlign: 'center'},
  retryButton: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.sm,
    borderRadius: PRIVE_RADIUS.md},
  retryButtonText: {
    color: PRIVE_COLORS.text.inverse,
    fontSize: 13,
    fontWeight: '600'}});

export default withErrorBoundary(TierProgressScreen, 'PriveTierProgress');
