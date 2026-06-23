/**
 * RezCashDisplay — the hero "lifetime savings" card for the REZ Cash page.
 *
 * Renders a single oversized rupee number with a "lifetime savings" label,
 * a "Member since [date]" subtext, and a gold → nileBlue gradient
 * background. Designed to live at the very top of `/b/wallet/rez-cash` and
 * be the first thing the user sees.
 *
 * Props
 * -----
 *   - `lifetimeSavingsPaise` — paise value (smallest INR unit).
 *   - `memberSinceDate`     — optional `Date`; subtext is suppressed when null.
 *   - `comparisonToAvgUserPct` — optional signed % vs the average REZ user.
 *
 * Wrapped in `<FeatureFlagGate flag="b.rezCash">` so the whole component
 * disappears when the migration flag is disabled.
 *
 * Accessibility
 * -------------
 *   - The whole card exposes a single `accessibilityLabel` that reads the
 *     total + the member-since subtext.
 *   - The big number is marked `accessibilityRole="text"` and uses
 *     `allowFontScaling` so dynamic-type users get a scaled reading.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';

export interface RezCashDisplayProps {
  /** Lifetime savings in paise (smallest INR unit). */
  lifetimeSavingsPaise: number;
  /** Date the user joined; the subtext is hidden when `null`. */
  memberSinceDate: Date | null;
  /**
   * Optional signed % difference vs the average REZ user. Positive ⇒
   * above-average. Rendered as a small pill next to the member-since
   * subtext. Hidden when not provided.
   */
  comparisonToAvgUserPct?: number;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format a `Date` as a short, accessible "Member since" string.
 *
 * Returns `null` when the date is missing or invalid — callers use the
 * null to hide the subtext entirely.
 */
function formatMemberSince(date: Date | null | undefined): string | null {
  if (!date) return null;
  if (Number.isNaN(date.getTime())) return null;
  const month = MONTHS[date.getMonth()] ?? '???';
  return `${month} ${date.getFullYear()}`;
}

function formatComparisonPct(pct: number | undefined): string | null {
  if (pct === undefined || Number.isNaN(pct)) return null;
  if (pct === 0) return '0%';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}%`;
}

function RezCashDisplayBase({
  lifetimeSavingsPaise,
  memberSinceDate,
  comparisonToAvgUserPct,
}: RezCashDisplayProps): React.ReactElement {
  const lifetimeLabel = useMemo(() => {
    const rupees = (lifetimeSavingsPaise || 0) / 100;
    return formatPrice(rupees, 'INR', false) ?? '₹0';
  }, [lifetimeSavingsPaise]);

  const memberSinceLabel = formatMemberSince(memberSinceDate);
  const comparisonLabel = formatComparisonPct(comparisonToAvgUserPct);

  const a11yParts: string[] = [
    `You've saved ${lifetimeLabel} with REZ since you joined.`,
  ];
  if (memberSinceLabel) {
    a11yParts.push(`Member since ${memberSinceLabel}.`);
  }
  if (comparisonLabel) {
    a11yParts.push(
      comparisonLabel.startsWith('-')
        ? `${comparisonLabel} compared to the average user.`
        : `${comparisonLabel} above the average user.`,
    );
  }

  return (
    <View
      style={styles.card}
      accessibilityLabel={a11yParts.join(' ')}
      accessibilityRole="text"
    >
      <View style={styles.gradientOverlay} pointerEvents="none" />

      <Text style={styles.overline} allowFontScaling={false}>
        Lifetime savings
      </Text>
      <Text
        style={styles.amount}
        numberOfLines={1}
        adjustsFontSizeToFit
        allowFontScaling
      >
        {lifetimeLabel}
      </Text>
      <Text style={styles.subtext} allowFontScaling>
        with REZ since you joined
      </Text>

      <View style={styles.metaRow}>
        {memberSinceLabel ? (
          <Text style={styles.metaText} allowFontScaling>
            Member since {memberSinceLabel}
          </Text>
        ) : null}
        {comparisonLabel ? (
          <View
            style={[
              styles.pill,
              comparisonLabel.startsWith('-')
                ? styles.pillBelow
                : styles.pillAbove,
            ]}
            accessibilityLabel={`${comparisonLabel} versus average user`}
          >
            <Text style={styles.pillText} allowFontScaling={false}>
              {comparisonLabel} vs avg
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Public component — wrapped in `<FeatureFlagGate flag="b.rezCash">` so
 * the whole card disappears when the migration flag is disabled.
 */
function RezCashDisplay(props: RezCashDisplayProps): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.rezCash">
      <RezCashDisplayBase {...props} />
    </FeatureFlagGate>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    backgroundColor: colors.nileBlue,
    overflow: 'hidden',
    // Gold → nileBlue gradient is faked with a semi-transparent overlay
    // layer because react-native doesn't ship a CSS-style linear-gradient
    // primitive. The base is `nileBlue`; the overlay adds a gold tint
    // along the top edge for the gradient feel.
    minHeight: 180,
    justifyContent: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: colors.gold,
    opacity: 0.18,
  },
  overline: {
    ...typography.overline,
    color: colors.linen,
    marginBottom: spacing.xs,
  },
  amount: {
    ...typography.priceLarge,
    color: colors.text.white,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
  },
  subtext: {
    ...typography.body,
    color: colors.linen,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  metaText: {
    ...typography.caption,
    color: colors.linen,
    opacity: 0.85,
    marginRight: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  pillAbove: {
    backgroundColor: colors.success,
  },
  pillBelow: {
    backgroundColor: colors.warning,
  },
  pillText: {
    ...typography.caption,
    color: colors.text.white,
    fontWeight: '700',
  },
});

const RezCashDisplayMemo = React.memo(RezCashDisplay);
export default RezCashDisplayMemo;