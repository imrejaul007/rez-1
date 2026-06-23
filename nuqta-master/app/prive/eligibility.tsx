// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Privé Eligibility Screen
 *
 * Shows user's progress towards Privé access and Elite tier.
 * Displays 6-pillar breakdown with improvement tips.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePriveEligibility, getEligibilityStatus, getQuickWins } from '@/hooks/usePriveEligibility';
import { ELIGIBILITY_THRESHOLDS, PillarScore, PriveTier } from '@/types/mode.types';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Colors
const COLORS = {
  gold: colors.brand.goldAccent,
  goldLight: '#E8D5A3',
  goldDark: '#A68B4B',
  background: colors.midGrayAlt,
  cardBg: '#1A1A1A',
  textPrimary: colors.background.primary,
  textSecondary: '#A0A0A0',
  success: colors.brand.emerald,
  warning: '#FF9800',
  error: '#F44336',
};

// Tier badge component
const TierBadge: React.FC<{ tier: PriveTier; score: number }> = ({ tier, score }) => {
  const getBadgeConfig = () => {
    switch (tier) {
      case 'elite':
        return {
          label: 'ELITE',
          colors: [colors.brand.goldBright, '#FFA500'] as const,
          icon: 'star' as const,
        };
      case 'entry':
        return {
          label: 'ENTRY',
          colors: [COLORS.gold, COLORS.goldDark] as const,
          icon: 'checkmark-circle' as const,
        };
      default:
        return {
          label: 'LOCKED',
          colors: ['#4A4A4A', '#2A2A2A'] as const,
          icon: 'lock-closed' as const,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={styles.tierBadgeContainer}>
      <LinearGradient colors={config.colors} style={styles.tierBadge}>
        <Ionicons
          name={config.icon}
          size={24}
          color={tier === 'none' ? '#888' : colors.background.primary}
        />
        <Text style={[styles.tierLabel, tier === 'none' && styles.tierLabelLocked]}>
          {config.label}
        </Text>
      </LinearGradient>
      <Text style={styles.scoreText}>{Math.round(score)} / 100</Text>
    </View>
  );
};

// Progress ring component
const ProgressRing: React.FC<{
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
}> = ({ progress, size, strokeWidth, color }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.progressRingBg, { width: size, height: size, borderRadius: size / 2 }]}>
        <View
          style={[
            styles.progressRingFill,
            {
              width: size - strokeWidth * 2,
              height: size - strokeWidth * 2,
              borderRadius: (size - strokeWidth * 2) / 2,
            },
          ]}
        />
      </View>
      <View style={[styles.progressRingOverlay, { width: size, height: size }]}>
        <Text style={styles.progressRingText}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
};

// Pillar card component
const PillarCard: React.FC<{ pillar: PillarScore; onPress: () => void }> = ({
  pillar,
  onPress,
}) => {
  const progressWidth = `${Math.min(100, pillar.score)}%`;

  return (
    <Pressable style={styles.pillarCard} onPress={onPress}>
      <View style={styles.pillarHeader}>
        <Text style={styles.pillarIcon}>{pillar.icon}</Text>
        <View style={styles.pillarInfo}>
          <Text style={styles.pillarName}>{pillar.name}</Text>
          <Text style={styles.pillarWeight}>{Math.round(pillar.weight * 100)}% weight</Text>
        </View>
        <Text style={styles.pillarScore}>{Math.round(pillar.score)}</Text>
      </View>

      <View style={styles.pillarProgressBg}>
        <Animated.View
          style={[
            styles.pillarProgressFill,
            { width: progressWidth, backgroundColor: pillar.color },
          ]}
        />
      </View>

      <Text style={styles.pillarDescription}>{pillar.description}</Text>

      {pillar.improvementTips.length > 0 && (
        <View style={styles.tipContainer}>
          <Ionicons name="bulb-outline" size={14} color={COLORS.gold} />
          <Text style={styles.tipText}>{pillar.improvementTips[0]}</Text>
        </View>
      )}
    </Pressable>
  );
};

// Quick wins section
const QuickWinsSection: React.FC<{ tips: string[] }> = ({ tips }) => {
  if (tips.length === 0) return null;

  return (
    <View style={styles.quickWinsContainer}>
      <Text style={styles.sectionTitle}>Quick Wins</Text>
      {tips.map((tip, index) => (
        <View key={index} style={styles.quickWinItem}>
          <Ionicons name="flash" size={16} color={COLORS.gold} />
          <Text style={styles.quickWinText}>{tip}</Text>
        </View>
      ))}
    </View>
  );
};

// Thresholds info
const ThresholdsInfo: React.FC<{ currentScore: number }> = ({ currentScore }) => {
  const entryDiff = ELIGIBILITY_THRESHOLDS.ENTRY_TIER - currentScore;
  const eliteDiff = ELIGIBILITY_THRESHOLDS.ELITE_TIER - currentScore;

  return (
    <View style={styles.thresholdsContainer}>
      <Text style={styles.sectionTitle}>Tier Thresholds</Text>

      <View style={styles.thresholdRow}>
        <View style={styles.thresholdInfo}>
          <Ionicons
            name={currentScore >= ELIGIBILITY_THRESHOLDS.ENTRY_TIER ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={currentScore >= ELIGIBILITY_THRESHOLDS.ENTRY_TIER ? COLORS.success : COLORS.textSecondary}
          />
          <Text style={styles.thresholdLabel}>Entry Tier</Text>
        </View>
        <Text style={styles.thresholdValue}>
          {ELIGIBILITY_THRESHOLDS.ENTRY_TIER} pts
          {entryDiff > 0 && <Text style={styles.thresholdDiff}> ({entryDiff} to go)</Text>}
        </Text>
      </View>

      <View style={styles.thresholdRow}>
        <View style={styles.thresholdInfo}>
          <Ionicons
            name={currentScore >= ELIGIBILITY_THRESHOLDS.ELITE_TIER ? 'star' : 'star-outline'}
            size={20}
            color={currentScore >= ELIGIBILITY_THRESHOLDS.ELITE_TIER ? colors.brand.goldBright : COLORS.textSecondary}
          />
          <Text style={styles.thresholdLabel}>Elite Tier</Text>
        </View>
        <Text style={styles.thresholdValue}>
          {ELIGIBILITY_THRESHOLDS.ELITE_TIER} pts
          {eliteDiff > 0 && <Text style={styles.thresholdDiff}> ({eliteDiff} to go)</Text>}
        </Text>
      </View>
    </View>
  );
};

// Main screen component
function PriveEligibilityScreen() {
  const router = useRouter();
  const { eligibility, isLoading, refresh, tier } = usePriveEligibility();
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useIsMounted();

  const status = getEligibilityStatus(eligibility);
  const quickWins = getQuickWins(eligibility.pillars);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Privé Status</Text>
        <Pressable onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.gold} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} />
        }
      >
        {/* Hero Section */}
        <LinearGradient
          colors={[COLORS.cardBg, COLORS.background]}
          style={styles.heroSection}
        >
          <TierBadge tier={tier} score={eligibility.score} />

          <Text style={styles.heroHeadline}>{status.headline}</Text>
          <Text style={styles.heroSubtext}>{status.subtext}</Text>

          {status.showProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, eligibility.score)}%` },
                  ]}
                />
              </View>
              <View style={styles.progressMarkers}>
                <View style={styles.markerEntry}>
                  <View style={[styles.markerDot, eligibility.score >= 70 && styles.markerDotActive]} />
                  <Text style={styles.markerLabel}>Entry</Text>
                </View>
                <View style={styles.markerElite}>
                  <View style={[styles.markerDot, eligibility.score >= 85 && styles.markerDotElite]} />
                  <Text style={styles.markerLabel}>Elite</Text>
                </View>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Quick Wins */}
        {!eligibility.isEligible && <QuickWinsSection tips={quickWins} />}

        {/* Thresholds */}
        <ThresholdsInfo currentScore={eligibility.score} />

        {/* Pillars */}
        <View style={styles.pillarsSection}>
          <Text style={styles.sectionTitle}>Your 6 Pillars</Text>
          {eligibility.pillars.map((pillar) => (
            <PillarCard
              key={pillar.id}
              pillar={pillar}
              onPress={() => {
                // Could navigate to pillar detail in future
              }}
            />
          ))}
        </View>

        {/* Trust Warning */}
        {eligibility.trustScore < ELIGIBILITY_THRESHOLDS.TRUST_MINIMUM && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={24} color={COLORS.error} />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Trust Score Too Low</Text>
              <Text style={styles.warningText}>
                Your trust score ({eligibility.trustScore}) is below the minimum threshold ({ELIGIBILITY_THRESHOLDS.TRUST_MINIMUM}).
                Focus on building trust to unlock Privé access.
              </Text>
            </View>
          </View>
        )}

        {/* CTA for eligible users */}
        {eligibility.isEligible && (
          <Pressable
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)')}
          >
            <LinearGradient colors={[COLORS.gold, COLORS.goldDark]} style={styles.ctaGradient}>
              <Text style={styles.ctaText}>
                {tier === 'elite' ? 'Access Elite Exclusives' : 'Explore Privé Mode'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.text.primary} />
            </LinearGradient>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  refreshButton: {
    padding: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  heroSection: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  tierBadgeContainer: {
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm,
  },
  tierLabel: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
    letterSpacing: 2,
  },
  tierLabelLocked: {
    color: '#888',
  },
  scoreText: {
    ...Typography.body,
    color: COLORS.textSecondary,
    marginTop: Spacing.sm,
  },
  heroHeadline: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroSubtext: {
    ...Typography.bodyLarge,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  progressContainer: {
    width: '100%',
    paddingHorizontal: Spacing.base,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.text.primary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 4,
  },
  progressMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: '15%',
  },
  markerEntry: {
    alignItems: 'center',
    position: 'absolute',
    left: '70%',
    transform: [{ translateX: -20 }],
  },
  markerElite: {
    alignItems: 'center',
    position: 'absolute',
    left: '85%',
    transform: [{ translateX: -20 }],
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#444',
    borderWidth: 2,
    borderColor: Colors.text.primary,
  },
  markerDotActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.goldDark,
  },
  markerDotElite: {
    backgroundColor: colors.brand.goldBright,
    borderColor: '#FFA500',
  },
  markerLabel: {
    ...Typography.overline,
    color: COLORS.textSecondary,
    marginTop: Spacing.xs,
  },
  quickWinsContainer: {
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    backgroundColor: COLORS.cardBg,
    borderRadius: BorderRadius.md,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: Spacing.md,
  },
  quickWinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quickWinText: {
    flex: 1,
    ...Typography.body,
    color: COLORS.textSecondary,
  },
  thresholdsContainer: {
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    backgroundColor: COLORS.cardBg,
    borderRadius: BorderRadius.md,
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.text.primary,
  },
  thresholdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  thresholdLabel: {
    ...Typography.body,
    color: COLORS.textPrimary,
  },
  thresholdValue: {
    ...Typography.body,
    color: COLORS.textSecondary,
  },
  thresholdDiff: {
    color: COLORS.gold,
  },
  pillarsSection: {
    padding: Spacing.base,
  },
  pillarCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pillarIcon: {
    ...Typography.h2,
    marginRight: Spacing.md,
  },
  pillarInfo: {
    flex: 1,
  },
  pillarName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pillarWeight: {
    ...Typography.bodySmall,
    color: COLORS.textSecondary,
  },
  pillarScore: {
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.gold,
  },
  pillarProgressBg: {
    height: 6,
    backgroundColor: Colors.text.primary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  pillarProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  pillarDescription: {
    ...Typography.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: Spacing.sm,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: 'rgba(201, 169, 98, 0.1)',
    borderRadius: BorderRadius.sm,
  },
  tipText: {
    flex: 1,
    ...Typography.bodySmall,
    color: COLORS.gold,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: Spacing.xs,
  },
  warningText: {
    ...Typography.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  ctaButton: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
  },
  ctaText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: colors.text.primary,
  },
  progressRingBg: {
    position: 'absolute',
    backgroundColor: Colors.text.primary,
  },
  progressRingFill: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    backgroundColor: COLORS.cardBg,
  },
  progressRingOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingText: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});

export default withErrorBoundary(PriveEligibilityScreen, 'PriveEligibility');
