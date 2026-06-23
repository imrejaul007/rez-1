/**
 * LoyaltyTierCard — single tier card used in the horizontal scroller and
 * the "current tier" hero block.
 *
 * Renders
 * -------
 *   - Tier emoji (top-left).
 *   - Tier name + score range (e.g. "Silver (250–499)").
 *   - Current REZ Score / 999.
 *   - "Current" badge if `isCurrentTier` is true.
 *   - "Upgrade" CTA button (tinted with the tier color) if NOT the current
 *     tier. The CTA is hidden when this is the current tier.
 *
 * Props
 * -----
 *   - `tier`           — the tier this card represents.
 *   - `isCurrentTier`  — render the "Current" badge and hide the CTA.
 *   - `currentScore`   — optional score to display; falls back to 0.
 *   - `onPress`        — optional callback (fires on the whole card, or
 *                        on the CTA when not current).
 *
 * Accessibility
 * -------------
 *   - `accessibilityRole="button"` (or "summary" when it's the current tier).
 *   - `accessibilityLabel` includes tier, range, and score, so a screen
 *     reader user hears e.g. "Gold tier, range 500 to 749, score 532 of 999".
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { LoyaltyTierKey } from '@/hooks/b/loyalty/useLoyaltyTier';

const SCORE_MAX = 999;

const BRONZE_COLOR = '#CD7F32';
const SILVER_COLOR = '#C0C0C0';
const PLATINUM_COLOR = '#E5E4E2';

interface TierMeta {
  label: string;
  emoji: string;
  minScore: number;
  maxScore: number;
  color: string;
}

const TIER_META: Record<LoyaltyTierKey, TierMeta> = {
  bronze: {
    label: 'Bronze',
    emoji: '🥉',
    minScore: 0,
    maxScore: 249,
    color: BRONZE_COLOR,
  },
  silver: {
    label: 'Silver',
    emoji: '🥈',
    minScore: 250,
    maxScore: 499,
    color: SILVER_COLOR,
  },
  gold: {
    label: 'Gold',
    emoji: '🥇',
    minScore: 500,
    maxScore: 749,
    color: colors.gold,
  },
  platinum: {
    label: 'Platinum',
    emoji: '💎',
    minScore: 750,
    maxScore: 999,
    color: PLATINUM_COLOR,
  },
};

export interface LoyaltyTierCardProps {
  tier: LoyaltyTierKey;
  isCurrentTier?: boolean;
  currentScore?: number;
  onPress?: () => void;
}

function LoyaltyTierCardBase({
  tier,
  isCurrentTier = false,
  currentScore = 0,
  onPress,
}: LoyaltyTierCardProps) {
  const meta = TIER_META[tier];

  const displayScore = useMemo(() => {
    if (typeof currentScore !== 'number' || !Number.isFinite(currentScore)) {
      return 0;
    }
    return Math.max(0, Math.min(SCORE_MAX, Math.round(currentScore)));
  }, [currentScore]);

  const accessibilityLabel = useMemo(() => {
    const tag = isCurrentTier ? 'current tier' : 'tier';
    return `${meta.label} ${tag}, range ${meta.minScore} to ${meta.maxScore}, score ${displayScore} of ${SCORE_MAX}`;
  }, [meta, isCurrentTier, displayScore]);

  const handlePress = () => {
    if (onPress) onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress}
      accessibilityRole={isCurrentTier ? 'summary' : 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isCurrentTier }}
      style={({ pressed }) => [
        styles.card,
        isCurrentTier && {
          borderColor: meta.color,
          borderWidth: 2,
        },
        pressed && onPress ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.emoji}>{meta.emoji}</Text>
        {isCurrentTier ? (
          <View
            style={[styles.currentBadge, { backgroundColor: meta.color }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.tierName, { color: meta.color }]}>{meta.label}</Text>
      <Text style={styles.tierRange}>
        ({meta.minScore}–{meta.maxScore})
      </Text>

      <View style={styles.scoreBlock}>
        <Text style={styles.scoreValue}>{displayScore}</Text>
        <Text style={styles.scoreMax}>/ {SCORE_MAX}</Text>
      </View>

      {!isCurrentTier ? (
        <View
          style={[styles.upgradeCta, { borderColor: meta.color }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Text style={[styles.upgradeCtaText, { color: meta.color }]}>
            Upgrade
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    minHeight: 180,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.base,
    marginRight: spacing.md,
    justifyContent: 'space-between',
  },
  cardPressed: {
    opacity: 0.7,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emoji: {
    fontSize: 28,
  },
  currentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  currentBadgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tierName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  tierRange: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.sm,
  },
  scoreValue: {
    color: colors.nileBlue,
    fontSize: 22,
    fontWeight: '800',
  },
  scoreMax: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  upgradeCta: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.5,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  upgradeCtaText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

const LoyaltyTierCard = React.memo(LoyaltyTierCardBase);
export default LoyaltyTierCard;
