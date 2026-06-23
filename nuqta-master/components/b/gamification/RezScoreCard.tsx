/**
 * RezScoreCard — Phase 1.3 card showing the REZ Score (0–999) and its 5 pillars.
 *
 * Renders
 * -------
 *   - Title ("REZ Score") in `colors.gold`.
 *   - Big score number in `colors.nileBlue` with the tier badge alongside.
 *   - Five horizontal progress bars (one per pillar) with labels and
 *     percentage values.
 *   - A subtle "How is this calculated?" disclosure row at the bottom.
 *
 * Data
 * ----
 *   All values are read from `useRezScore()` — the card has no props and
 *   always reflects the current store state.
 *
 * Accessibility
 * -------------
 *   The whole card has `accessibilityLabel="REZ Score: <N> (<Tier> tier)"`.
 *   The pillar rows expose their own per-row label so screen reader users
 *   can drill into each pillar individually.
 *
 * Gating
 * ------
 *   This component is intended to be rendered inside a
 *   `<FeatureFlagGate flag="b.rezScore">` wrapper. We do not gate internally
 *   so the gate is composable.
 */
import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRezScore, type RezScoreBreakdown, type RezScoreTier } from '@/hooks/b/gamification/useRezScore';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface PillarRow {
  key: keyof RezScoreBreakdown;
  label: string;
  weightPct: number;
  value: number;
}

const PILLAR_LABELS: Record<keyof RezScoreBreakdown, string> = {
  savings: 'Savings',
  streak: 'Streak',
  achievements: 'Achievements',
  engagement: 'Engagement',
  loyalty: 'Loyalty tier',
};

const PILLAR_WEIGHTS: Record<keyof RezScoreBreakdown, number> = {
  savings: 30,
  streak: 25,
  achievements: 20,
  engagement: 15,
  loyalty: 10,
};

const PILLAR_ORDER: ReadonlyArray<keyof RezScoreBreakdown> = [
  'savings',
  'streak',
  'achievements',
  'engagement',
  'loyalty',
];

function tierColor(tier: RezScoreTier): string {
  switch (tier) {
    case 'Platinum':
      return colors.nileBlue;
    case 'Gold':
      return colors.gold;
    case 'Silver':
      return colors.text.secondary;
    case 'Bronze':
    default:
      return colors.text.tertiary;
  }
}

function RezScoreCardBase() {
  const { score, tier, breakdown, isTopTier } = useRezScore();

  const rows = useMemo<PillarRow[]>(() => {
    return PILLAR_ORDER.map((key) => ({
      key,
      label: PILLAR_LABELS[key],
      weightPct: PILLAR_WEIGHTS[key],
      value: breakdown[key],
    }));
  }, [breakdown]);

  const accessibilityLabel = useMemo(
    () => `REZ Score: ${score} (${tier} tier)`,
    [score, tier],
  );

  const [showFormula, setShowFormula] = React.useState(false);

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={styles.card}
    >
      {/* Title row */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>REZ Score</Text>
        {isTopTier ? (
          <Text style={styles.topTierPill}>Top tier</Text>
        ) : null}
      </View>

      {/* Big score + tier badge */}
      <View style={styles.scoreRow}>
        <Text style={styles.score}>{score}</Text>
        <View style={[styles.tierBadge, { backgroundColor: tierColor(tier) }]}>
          <Text style={styles.tierBadgeText}>{tier}</Text>
        </View>
      </View>
      <Text style={styles.scoreHint}>out of 999</Text>

      {/* Pillar bars */}
      <View
        accessible={false}
        style={styles.pillars}
      >
        {rows.map((row) => {
          const pct = Math.round(row.value * 100);
          return (
            <View
              key={row.key}
              style={styles.pillarRow}
              accessible
              accessibilityLabel={`${row.label}: ${pct} percent, weight ${row.weightPct} percent`}
            >
              <View style={styles.pillarLabelRow}>
                <Text style={styles.pillarLabel}>{row.label}</Text>
                <Text style={styles.pillarPct}>{pct}%</Text>
              </View>
              <View style={styles.pillarTrack}>
                <View
                  style={[
                    styles.pillarFill,
                    { width: `${pct}%` },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Formula disclosure */}
      <Pressable
        onPress={() => setShowFormula((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showFormula }}
        style={styles.formulaToggle}
      >
        <Text style={styles.formulaLink}>
          How is this calculated?
        </Text>
      </Pressable>
      {showFormula ? (
        <View style={styles.formulaBox}>
          <Text style={styles.formulaText}>
            Score = 0.30×Savings + 0.25×Streak + 0.20×Achievements
            + 0.15×Engagement + 0.10×Loyalty
          </Text>
          <Text style={styles.formulaText}>
            Tiers: Bronze (0–249), Silver (250–499), Gold (500–749),
            Platinum (750–999).
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  topTierPill: {
    color: colors.text.inverse,
    backgroundColor: colors.nileBlue,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  score: {
    color: colors.nileBlue,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
    marginRight: spacing.md,
  },
  tierBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tierBadgeText: {
    color: colors.text.inverse,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  scoreHint: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  pillars: {
    marginBottom: spacing.sm,
  },
  pillarRow: {
    marginBottom: spacing.sm,
  },
  pillarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pillarLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pillarPct: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  pillarTrack: {
    height: 6,
    width: '100%',
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  pillarFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: borderRadius.full,
  },
  formulaToggle: {
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  formulaLink: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  formulaBox: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  formulaText: {
    color: colors.text.secondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
});

const RezScoreCard = React.memo(RezScoreCardBase);
export default RezScoreCard;