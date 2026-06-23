/**
 * TierProgressBar — animated horizontal progress bar showing how far the
 * user is from the next tier.
 *
 * Renders
 * -------
 *   - A label row: "245 / 999 → Silver".
 *   - A track + filled bar, the filled portion uses the *current* tier's
 *     color and animates via `Animated.timing` whenever `currentPoints`
 *     changes.
 *
 * Animation
 * ---------
 *   The fill width is interpolated from `Animated.Value` (0 → 1). We
 *   animate over 350ms with `useNativeDriver: false` because `width` is
 *   not natively animatable.
 *
 * Accessibility
 * -------------
 *   - `accessibilityRole="progressbar"` so screen readers announce
 *     progress.
 *   - `accessibilityValue` reports `{min, max, now}` so the screen reader
 *     can read out the percent complete.
 *   - `accessibilityLabel` describes the goal (e.g. "245 of 999 points,
 *     25 percent of the way to Silver").
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { LoyaltyTierKey } from '@/hooks/b/loyalty/useLoyaltyTier';

const ANIM_DURATION_MS = 350;
const SCORE_MAX_DEFAULT = 999;

const BRONZE_COLOR = '#CD7F32';
const SILVER_COLOR = '#C0C0C0';
const PLATINUM_COLOR = '#E5E4E2';

const TIER_LABELS: Record<LoyaltyTierKey, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

const TIER_COLORS: Record<LoyaltyTierKey, string> = {
  bronze: BRONZE_COLOR,
  silver: SILVER_COLOR,
  gold: colors.gold,
  platinum: PLATINUM_COLOR,
};

export interface TierProgressBarProps {
  currentPoints: number;
  maxPoints?: number;
  tier: LoyaltyTierKey;
}

/** Map a tier to the *next* tier's label (or null when at Platinum). */
function nextTierOf(tier: LoyaltyTierKey): LoyaltyTierKey | null {
  switch (tier) {
    case 'bronze':
      return 'silver';
    case 'silver':
      return 'gold';
    case 'gold':
      return 'platinum';
    case 'platinum':
      return null;
    default:
      return null;
  }
}

function TierProgressBarBase({
  currentPoints,
  maxPoints = SCORE_MAX_DEFAULT,
  tier,
}: TierProgressBarProps) {
  const safeMax = Math.max(1, maxPoints);
  const safeNow = Math.max(0, Math.min(safeMax, currentPoints));
  const ratio = safeNow / safeMax;
  const fillColor = TIER_COLORS[tier];

  const animation = useRef(new Animated.Value(ratio)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: ratio,
      duration: ANIM_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [ratio, animation]);

  const widthInterpolation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const nextLabel = useMemo(() => {
    const next = nextTierOf(tier);
    return next ? TIER_LABELS[next] : null;
  }, [tier]);

  const percent = Math.round(ratio * 100);

  const accessibilityLabel = useMemo(() => {
    if (nextLabel) {
      return `${safeNow} of ${safeMax} points, ${percent} percent of the way to ${nextLabel}`;
    }
    return `${safeNow} of ${safeMax} points, top tier reached`;
  }, [safeNow, safeMax, percent, nextLabel]);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.pointsLabel}>
          {safeNow} / {safeMax}
        </Text>
        {nextLabel ? (
          <Text style={styles.arrowLabel}>
            <Text style={styles.arrow}>{' → '}</Text>
            <Text style={[styles.nextTier, { color: fillColor }]}>
              {nextLabel}
            </Text>
          </Text>
        ) : (
          <Text style={[styles.nextTier, { color: fillColor }]}>
            Top tier
          </Text>
        )}
      </View>

      <View
        style={styles.track}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              width: widthInterpolation,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  pointsLabel: {
    color: colors.nileBlue,
    fontSize: 14,
    fontWeight: '700',
  },
  arrowLabel: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  arrow: {
    color: colors.text.tertiary,
    fontSize: 13,
    fontWeight: '600',
  },
  nextTier: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  track: {
    height: 10,
    width: '100%',
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});

const TierProgressBar = React.memo(TierProgressBarBase);
export default TierProgressBar;
