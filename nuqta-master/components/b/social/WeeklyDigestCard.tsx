/**
 * WeeklyDigestCard — compact card view of the trailing-7-day digest.
 *
 * Renders a single tile containing the headline (e.g. "Your week in REZ"),
 * the date range, the savings headline number, a 3-tile stat row
 * (offers / stores / streak), the top-store row, the week-over-week
 * trend chip, an expandable top-3 achievements panel, and a Share button.
 *
 * Data
 * ----
 *   Takes a single `digest` prop. See `types/social.types.ts` for the
 *   full shape. The component never reaches into any store — it is a
 *   pure projection of the summary its caller hands it, which makes it
 *   trivial to drop into a card, a sheet, or a future push-notification
 *   preview.
 *
 * Gating
 * ------
 *   This component is intended to be rendered inside a
 *   `<FeatureFlagGate flag="b.weeklyDigest">` wrapper. We do not gate
 *   internally so the gate is composable.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FeatureFlagGate } from '@/components/b/_shared/FeatureFlagGate';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';
import type { WeeklyDigestSummary } from '@/types/social.types';

export interface WeeklyDigestCardProps {
  /** Computed digest to render. */
  digest: WeeklyDigestSummary;
  /** Invoked when the user taps the "Share" button. */
  onShare?: (digest: WeeklyDigestSummary) => void;
  /** Invoked when the user expands / collapses the achievements panel. */
  onToggleAchievements?: (expanded: boolean) => void;
}

const RUPEE_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
});

function formatRupeesFromPaise(paise: number): string {
  return RUPEE_FORMATTER.format(paise / 100);
}

function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${SHORT_DATE_FORMATTER.format(start)} – ${SHORT_DATE_FORMATTER.format(end)}`;
}

function WeeklyDigestCardBase({
  digest,
  onShare,
  onToggleAchievements,
}: WeeklyDigestCardProps): React.ReactElement {
  const [achievementsExpanded, setAchievementsExpanded] = useState<boolean>(false);

  const handleShare = useCallback(() => {
    if (onShare) onShare(digest);
  }, [digest, onShare]);

  const handleToggle = useCallback(() => {
    setAchievementsExpanded((prev) => {
      const next = !prev;
      if (onToggleAchievements) onToggleAchievements(next);
      return next;
    });
  }, [onToggleAchievements]);

  const trendColor = useMemo(() => {
    if (digest.weekOverWeekTrend === 'up') return colors.success;
    if (digest.weekOverWeekTrend === 'down') return colors.error;
    return colors.text.tertiary;
  }, [digest.weekOverWeekTrend]);

  const trendArrow = useMemo(() => {
    if (digest.weekOverWeekTrend === 'up') return '↑';
    if (digest.weekOverWeekTrend === 'down') return '↓';
    return '→';
  }, [digest.weekOverWeekTrend]);

  const dateRange = useMemo(
    () => formatDateRange(digest.weekStartDate, digest.weekEndDate),
    [digest.weekStartDate, digest.weekEndDate],
  );

  const rupees = useMemo(
    () => formatRupeesFromPaise(digest.totalSavingsPaise),
    [digest.totalSavingsPaise],
  );

  const a11yLabel = useMemo(() => {
    return (
      `Weekly digest for ${digest.userName}. ` +
      `You saved ${rupees} this week. ` +
      `${digest.offersUsed} offers used, ` +
      `${digest.storesVisited} stores visited, ` +
      `${digest.streakDays} day streak. ` +
      (digest.topStoreName ? `Top store: ${digest.topStoreName}. ` : '') +
      `${trendArrow} ${Math.abs(digest.weekOverWeekChangePct)} percent vs last week.`
    );
  }, [digest, rupees, trendArrow]);

  const hasAchievements = digest.achievementsUnlocked.length > 0;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
    >
      {/* Header row: title + share button */}
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Your week in REZ</Text>
          <Text style={styles.dateRange}>{dateRange}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share weekly digest"
          onPress={handleShare}
          style={({ pressed }) => [styles.shareButton, pressed && styles.shareButtonPressed]}
          hitSlop={8}
        >
          <Text style={styles.shareButtonText}>Share</Text>
        </Pressable>
      </View>

      {/* Big number headline */}
      <View style={styles.headlineBlock}>
        <Text style={styles.bigNumber} accessibilityElementsHidden importantForAccessibility="no">
          {rupees}
        </Text>
        <Text style={styles.headlineLabel}>saved this week</Text>
      </View>

      {/* Trend chip */}
      <View
        style={[styles.trendChip, { borderColor: trendColor }]}
        accessible
        accessibilityLabel={`${Math.abs(digest.weekOverWeekChangePct)} percent ${
          digest.weekOverWeekTrend === 'flat' ? 'change' : `${digest.weekOverWeekTrend} trend`
        } versus last week`}
      >
        <Text style={[styles.trendText, { color: trendColor }]}>
          {trendArrow} {Math.abs(digest.weekOverWeekChangePct)}% vs last week
        </Text>
      </View>

      {/* 3 stat tiles */}
      <View style={styles.statRow}>
        <StatTile label="Offers used" value={digest.offersUsed.toString()} tileIndex={0} />
        <StatTile label="Stores visited" value={digest.storesVisited.toString()} tileIndex={1} />
        <StatTile label="Streak" value={`${digest.streakDays}d`} tileIndex={2} />
      </View>

      {/* Top store row */}
      {digest.topStoreName ? (
        <View
          style={styles.topStoreRow}
          accessible
          accessibilityLabel={`Top store ${digest.topStoreName}`}
        >
          <Text style={styles.topStoreLabel}>Top store</Text>
          <Text style={styles.topStoreValue}>{digest.topStoreName}</Text>
        </View>
      ) : null}

      {/* Achievements expand/collapse */}
      {hasAchievements ? (
        <View style={styles.achievementsBlock}>
          <Pressable
            onPress={handleToggle}
            accessibilityRole="button"
            accessibilityLabel={
              achievementsExpanded
                ? 'Hide achievements unlocked this week'
                : 'Show achievements unlocked this week'
            }
            accessibilityState={{ expanded: achievementsExpanded }}
            style={({ pressed }) => [styles.achievementsToggle, pressed && styles.pressed]}
          >
            <Text style={styles.achievementsToggleText}>
              {achievementsExpanded
                ? 'Hide achievements'
                : `Show ${digest.achievementsUnlocked.length} achievement${
                    digest.achievementsUnlocked.length === 1 ? '' : 's'
                  } unlocked`}
            </Text>
            <Text style={styles.achievementsChevron} accessibilityElementsHidden importantForAccessibility="no">
              {achievementsExpanded ? '▾' : '▸'}
            </Text>
          </Pressable>

          {achievementsExpanded ? (
            <View style={styles.achievementList}>
              {digest.achievementsUnlocked.map((a) => (
                <View
                  key={a.id}
                  style={styles.achievementRow}
                  accessible
                  accessibilityLabel={`${a.title} unlocked`}
                >
                  <Text style={styles.achievementEmoji} accessibilityElementsHidden importantForAccessibility="no">
                    {a.iconEmoji}
                  </Text>
                  <Text style={styles.achievementTitle}>{a.title}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  tileIndex: number;
}

function StatTile({ label, value, tileIndex }: StatTileProps): React.ReactElement {
  return (
    <View
      style={styles.statTile}
      accessible
      accessibilityLabel={`${label}: ${value}`}
      testID={`weekly-digest-stat-${tileIndex}`}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.gold,
  },
  dateRange: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  shareButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gold,
    minHeight: 32,
    justifyContent: 'center',
  },
  shareButtonPressed: {
    opacity: 0.85,
  },
  shareButtonText: {
    ...typography.labelSmall,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  headlineBlock: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  bigNumber: {
    ...typography.priceLarge,
    color: colors.nileBlue,
  },
  headlineLabel: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: -spacing.xs,
  },
  trendChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.base,
  },
  trendText: {
    ...typography.labelSmall,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  topStoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.accent,
    marginBottom: spacing.sm,
  },
  topStoreLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  topStoreValue: {
    ...typography.label,
    color: colors.nileBlue,
  },
  achievementsBlock: {
    marginTop: spacing.xs,
  },
  achievementsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  achievementsToggleText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  achievementsChevron: {
    ...typography.label,
    color: colors.gold,
  },
  achievementList: {
    paddingTop: spacing.xs,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  achievementEmoji: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  achievementTitle: {
    ...typography.body,
    color: colors.text.primary,
  },
});

/**
 * Composed default export: feature-flag-gated Weekly Digest card.
 *
 * Callers that already sit inside their own gate can import
 * `WeeklyDigestCardBase` to skip the double-wrap.
 */
function GatedWeeklyDigestCard(props: WeeklyDigestCardProps): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.weeklyDigest">
      <WeeklyDigestCardBase {...props} />
    </FeatureFlagGate>
  );
}

export { WeeklyDigestCardBase, GatedWeeklyDigestCard };
export default GatedWeeklyDigestCard;