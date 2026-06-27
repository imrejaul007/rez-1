// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Privé Pillars Page
 * Detailed view of all 6 pillars with hero score, animated bars,
 * pull-to-refresh, shimmer skeleton, trust warning, and improvement tips.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import {
  PRIVE_COLORS,
  PRIVE_SPACING,
  PRIVE_RADIUS,
  PILLAR_CONFIG,
  IMPROVEMENT_TIPS,
  resolvePillarId,
  PillarId} from '@/components/prive/priveTheme';
import { usePriveEligibility } from '@/hooks/usePriveEligibility';
import priveApi from '@/services/priveApi';
import { ELIGIBILITY_THRESHOLDS } from '@/types/mode.types';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// ─── Shimmer Skeleton ─────────────────────────────────────────────────────────
const ShimmerCard = ({ index }: { index: number }) => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ), -1);
  }, []);

  const opacity = interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]);

  return (
    <View style={styles.pillarCard}>
      <View style={styles.pillarHeader}>
        <Animated.View style={[styles.shimmerCircle, { opacity }]} />
        <View style={{ flex: 1, marginLeft: PRIVE_SPACING.md }}>
          <Animated.View style={[styles.shimmerLine, { width: '60%', opacity }]} />
          <Animated.View style={[styles.shimmerLine, { width: '40%', marginTop: 6, opacity }]} />
        </View>
        <Animated.View style={[styles.shimmerLine, { width: 40, height: 28, opacity }]} />
      </View>
      <View style={[styles.pillarDetails, { marginTop: PRIVE_SPACING.md }]}>
        <Animated.View style={[styles.shimmerLine, { width: 70, height: 20, opacity }]} />
        <View style={{ flex: 1, marginLeft: PRIVE_SPACING.md }}>
          <Animated.View style={[styles.shimmerBar, { opacity }]} />
        </View>
      </View>
    </View>
  );
};

// ─── Animated Progress Bar ────────────────────────────────────────────────────
const AnimatedProgressBar = ({ score, color }: { score: number; color: string }) => {
  const widthAnim = useSharedValue(0);

  useEffect(() => {
    widthAnim.value = withTiming(score, { duration: 800 });
  }, [score]);

  const width = interpolate(widthAnim.value, [0, 100], ['0%', '100%'], 'clamp');

  return (
    <View style={styles.pillarProgressTrack}>
      <Animated.View style={[styles.pillarProgressFill, { width }]}>
        <LinearGradient
          colors={[color, `${color}88`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// ─── Hero Score Section ───────────────────────────────────────────────────────
const HeroScoreSection = ({
  totalScore,
  tier,
  trustScore}: {
  totalScore: number;
  tier: string;
  trustScore: number;
}) => {
  const countAnim = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    countAnim.value = 0;
    countAnim.value = withTiming(totalScore, { duration: 1200 });
  }, [totalScore]);

  useAnimatedReaction(
    () => countAnim.value,
    (val) => {
      runOnJS(setDisplayScore)(Math.round(val * 10) / 10);
    },
    [totalScore]
  );

  const getTierColor = () => {
    switch (tier) {
      case 'elite': return Colors.gold;
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

  // Determine next tier threshold
  let nextThreshold = ELIGIBILITY_THRESHOLDS.ENTRY_TIER;
  let nextTierName = 'Entry';
  if (tier === 'entry') {
    nextThreshold = ELIGIBILITY_THRESHOLDS.SIGNATURE_TIER;
    nextTierName = 'Signature';
  } else if (tier === 'signature') {
    nextThreshold = ELIGIBILITY_THRESHOLDS.ELITE_TIER;
    nextTierName = 'Elite';
  } else if (tier === 'elite') {
    nextThreshold = 100;
    nextTierName = 'Max';
  }

  const progressPercent = Math.min(100, (totalScore / nextThreshold) * 100);
  const pointsToNext = Math.max(0, nextThreshold - totalScore);

  return (
    <View style={styles.heroCard}>
      {/* Trust Warning Banner */}
      {trustScore < 60 && (
        <View style={styles.trustBannerTop}>
          <Ionicons name="alert-circle" size={18} color={Colors.error} />
          <Text style={styles.trustBannerText}>
            Trust score is {trustScore} — Privé access blocked until trust reaches 60
          </Text>
        </View>
      )}

      <View style={styles.heroContent}>
        <View style={styles.heroScoreSection}>
          <Text style={styles.heroScoreLabel}>Privé Score</Text>
          <Text style={styles.heroScoreValue}>{displayScore.toFixed(1)}</Text>
        </View>
        <View style={styles.heroTierSection}>
          <View style={[styles.heroTierBadge, { backgroundColor: `${getTierColor()}20` }]}>
            <Text style={styles.heroTierIcon}>◈</Text>
            <Text style={[styles.heroTierText, { color: getTierColor() }]}>{getTierLabel()}</Text>
          </View>
          {tier !== 'elite' && (
            <Text style={styles.heroTierProgress}>
              {pointsToNext.toFixed(1)} pts to {nextTierName}
            </Text>
          )}
          {tier === 'elite' && (
            <Text style={styles.heroTierProgress}>Top tier achieved</Text>
          )}
        </View>
      </View>

      {/* Progress to Next Tier */}
      <View style={styles.heroProgressSection}>
        <View style={styles.heroProgressLabels}>
          <Text style={styles.heroProgressLabel}>0</Text>
          <Text style={styles.heroProgressLabel}>{ELIGIBILITY_THRESHOLDS.ENTRY_TIER}</Text>
          <Text style={styles.heroProgressLabel}>{ELIGIBILITY_THRESHOLDS.SIGNATURE_TIER}</Text>
          <Text style={styles.heroProgressLabel}>{ELIGIBILITY_THRESHOLDS.ELITE_TIER}</Text>
        </View>
        <View style={styles.heroProgressTrack}>
          <View style={[styles.heroProgressFill, { width: `${progressPercent}%` }]}>
            <LinearGradient
              colors={[PRIVE_COLORS.gold.primary, PRIVE_COLORS.gold.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Main Pillars Screen ──────────────────────────────────────────────────────
function PillarsScreen() {
  const { eligibility, isLoading: hookLoading, refresh, error: hookError } = usePriveEligibility();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  // Derived pillar data from hook
  const pillarData = eligibility.pillars.map((p) => ({
    id: resolvePillarId(p.id) || p.id,
    score: Math.round(p.score),
    trend: p.trend || 'stable'}));

  const isLoading = hookLoading && pillarData.length === 0;

  useEffect(() => {
    if (hookError) setError(hookError);
  }, [hookError]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      // Trigger backend recalculation then refresh local data
      await priveApi.refreshScore();
      await refresh();
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to refresh pillar data');
    } finally {
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [refresh]);

  const getTrendInfo = (trend: string) => {
    switch (trend) {
      case 'up':
        return { icon: '↑', color: Colors.success, label: 'Improving' };
      case 'down':
        return { icon: '↓', color: Colors.error, label: 'Declining' };
      default:
        return { icon: '→', color: Colors.text.tertiary, label: 'Stable' };
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={styles.content}
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
        {/* Hero Score Section */}
        {!isLoading && (
          <HeroScoreSection
            totalScore={eligibility.score}
            tier={eligibility.tier}
            trustScore={eligibility.trustScore}
          />
        )}

        {/* Intro Card */}
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Your Privé Score Breakdown</Text>
          <Text style={styles.introText}>
            Your Privé score is calculated from 6 weighted pillars. Each pillar
            contributes to your overall eligibility and tier status.
          </Text>
        </View>

        {/* Loading Skeleton */}
        {isLoading && (
          <View>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <ShimmerCard key={i} index={i} />
            ))}
          </View>
        )}

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

        {/* Pillars List */}
        {pillarData.map((pillar) => {
          const config = PILLAR_CONFIG[pillar.id as PillarId];
          if (!config) return null;
          const trend = getTrendInfo(pillar.trend);
          const weightPercent = (config.weight * 100).toFixed(0);
          const isTrustLow = pillar.id === 'trust' && pillar.score < 60;
          const tips = IMPROVEMENT_TIPS[pillar.id] || [];
          const showTip = pillar.score < 20 && tips.length > 0;

          return (
            <View
              key={pillar.id}
              style={[
                styles.pillarCard,
                isTrustLow && styles.pillarCardTrustWarning,
              ]}
            >
              <View style={styles.pillarHeader}>
                <View style={[styles.pillarIconBg, { backgroundColor: `${config.color}20` }]}>
                  <Text style={styles.pillarIcon}>{config.icon}</Text>
                </View>
                <View style={styles.pillarInfo}>
                  <Text style={styles.pillarName}>{config.name}</Text>
                  <Text style={styles.pillarDescription}>{config.description}</Text>
                </View>
                <View style={styles.pillarScoreContainer}>
                  <Text style={styles.pillarScore}>{pillar.score}</Text>
                  <Text style={[styles.pillarTrend, { color: trend.color }]}>
                    {trend.icon}
                  </Text>
                </View>
              </View>
              <View style={styles.pillarDetails}>
                <View style={styles.pillarWeightBadge}>
                  <Text style={styles.pillarWeight}>{weightPercent}% weight</Text>
                </View>
                <View style={styles.pillarProgressContainer}>
                  <AnimatedProgressBar score={pillar.score} color={config.color} />
                </View>
              </View>

              {/* Improvement tip for very low scores */}
              {showTip && (
                <View style={styles.tipContainer}>
                  <Ionicons name="bulb-outline" size={14} color={PRIVE_COLORS.gold.primary} />
                  <Text style={styles.tipText}>{tips[0]}</Text>
                </View>
              )}

              {/* Trust low warning on trust card */}
              {isTrustLow && (
                <View style={styles.trustCardWarning}>
                  <Ionicons name="warning-outline" size={14} color={Colors.error} />
                  <Text style={styles.trustCardWarningText}>
                    Below 60 — blocks all Privé access
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {/* General Trust Warning */}
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Trust score below 60 will block Privé access regardless of your total score.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1},
  content: {
    flex: 1,
    paddingHorizontal: PRIVE_SPACING.xl},

  // ─── Hero Section ───────────────────────────────────────────
  heroCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    marginBottom: PRIVE_SPACING.lg,
    marginTop: PRIVE_SPACING.sm},
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'},
  heroScoreSection: {
    gap: PRIVE_SPACING.xs},
  heroScoreLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase'},
  heroScoreValue: {
    fontSize: 42,
    fontWeight: '200',
    color: PRIVE_COLORS.gold.primary},
  heroTierSection: {
    alignItems: 'flex-end',
    gap: PRIVE_SPACING.xs},
  heroTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.xs,
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.sm,
    borderRadius: PRIVE_RADIUS.sm},
  heroTierIcon: {
    fontSize: 14,
    color: PRIVE_COLORS.gold.primary},
  heroTierText: {
    fontSize: 14,
    fontWeight: '600'},
  heroTierProgress: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary},
  heroProgressSection: {
    marginTop: PRIVE_SPACING.lg},
  heroProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: PRIVE_SPACING.xs},
  heroProgressLabel: {
    fontSize: 10,
    color: PRIVE_COLORS.text.tertiary},
  heroProgressTrack: {
    height: 8,
    backgroundColor: PRIVE_COLORS.border.primary,
    borderRadius: 4,
    overflow: 'hidden'},
  heroProgressFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden'},

  // ─── Trust Banner ───────────────────────────────────────────
  trustBannerTop: {
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
    color: Colors.error,
    fontWeight: '500',
    lineHeight: 18},

  // ─── Intro Card ─────────────────────────────────────────────
  introCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    marginBottom: PRIVE_SPACING.xl},
  introTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
    marginBottom: PRIVE_SPACING.sm},
  introText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 20},

  // ─── Pillar Cards ───────────────────────────────────────────
  pillarCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.md},
  pillarCardTrustWarning: {
    borderColor: 'rgba(244, 67, 54, 0.38)',
    borderWidth: 1.5},
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center'},
  pillarIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: PRIVE_SPACING.md},
  pillarIcon: {
    fontSize: 20},
  pillarInfo: {
    flex: 1},
  pillarName: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary},
  pillarDescription: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary},
  pillarScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center'},
  pillarScore: {
    fontSize: 24,
    fontWeight: '300',
    color: PRIVE_COLORS.text.primary},
  pillarTrend: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: PRIVE_SPACING.xs},
  pillarDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: PRIVE_SPACING.md,
    gap: PRIVE_SPACING.md},
  pillarWeightBadge: {
    backgroundColor: PRIVE_COLORS.transparent.white10,
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.xs,
    borderRadius: PRIVE_RADIUS.sm},
  pillarWeight: {
    fontSize: 11,
    color: PRIVE_COLORS.text.secondary},
  pillarProgressContainer: {
    flex: 1},
  pillarProgressTrack: {
    height: 6,
    backgroundColor: PRIVE_COLORS.border.primary,
    borderRadius: 3,
    overflow: 'hidden'},
  pillarProgressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden'},

  // ─── Improvement Tips ───────────────────────────────────────
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
    marginTop: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.transparent.gold10,
    borderRadius: PRIVE_RADIUS.sm,
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.sm},
  tipText: {
    flex: 1,
    fontSize: 12,
    color: PRIVE_COLORS.gold.light,
    lineHeight: 18},

  // ─── Trust Card Warning ─────────────────────────────────────
  trustCardWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
    marginTop: PRIVE_SPACING.sm},
  trustCardWarningText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: '500'},

  // ─── Warning Card ──────────────────────────────────────────
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginTop: PRIVE_SPACING.md,
    gap: PRIVE_SPACING.md},
  warningIcon: {
    fontSize: 20},
  warningText: {
    flex: 1,
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 18},

  // ─── Error State ────────────────────────────────────────────
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.xl,
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
    fontWeight: '600'},

  // ─── Shimmer Skeleton ──────────────────────────────────────
  shimmerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIVE_COLORS.border.primary},
  shimmerLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: PRIVE_COLORS.border.primary},
  shimmerBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIVE_COLORS.border.primary}});

export default withErrorBoundary(PillarsScreen, 'PrivePillars');
