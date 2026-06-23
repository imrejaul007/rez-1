/**
 * KhataSummaryCard — top-of-page 3-tile summary for the khata ledger.
 *
 * Three big numbers in a row:
 *   1. "You owe"      — red,   money the user owes merchants.
 *   2. "Owed to you"  — green, money merchants owe the user.
 *   3. "Net"          — gold,  the running difference. Positive → user
 *                                is net-positive (receiving more than
 *                                paying). Negative → user is net in the
 *                                red.
 *
 * All amounts are paise on the way in. Formatting / currency conversion
 * happens in the component so the caller can stay paise-native.
 *
 * Accessibility
 * -------------
 *  - Single `accessibilityLabel` on the container reads out all three
 *    values so screen-reader users get the full picture in one swipe.
 *  - role = "summary" hints to VoiceOver / TalkBack that this is a
 *    high-level rollup, not interactive content.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';

export interface KhataSummaryCardProps {
  totalOwedPaise: number;
  totalOwedToYouPaise: number;
  netBalancePaise: number;
}

interface TileProps {
  label: string;
  amountPaise: number;
  color: string;
  signed?: boolean;
  testID?: string;
}

function SummaryTile({ label, amountPaise, color, signed, testID }: TileProps) {
  const formatted = useMemo(() => {
    const result = formatPrice(Math.abs(amountPaise) / 100, 'INR', false);
    return result ?? '₹0';
  }, [amountPaise]);

  const sign =
    signed === true && amountPaise > 0
      ? '+'
      : signed === true && amountPaise < 0
        ? '-'
        : '';

  return (
    <View style={styles.tile} testID={testID}>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.tileAmount, { color }]} numberOfLines={1}>
        {sign}
        {formatted}
      </Text>
    </View>
  );
}

function KhataSummaryCardBase({
  totalOwedPaise,
  totalOwedToYouPaise,
  netBalancePaise,
}: KhataSummaryCardProps) {
  // Defensive coercion — the API guarantees paise numbers but a future
  // contract change shouldn't be able to crash the summary tile.
  const owed = Math.max(0, totalOwedPaise || 0);
  const receivable = Math.max(0, totalOwedToYouPaise || 0);
  const net = Number.isFinite(netBalancePaise) ? netBalancePaise : 0;

  const owedText = formatPrice(owed / 100, 'INR', false) ?? '₹0';
  const receivableText = formatPrice(receivable / 100, 'INR', false) ?? '₹0';
  const netText = formatPrice(Math.abs(net) / 100, 'INR', false) ?? '₹0';
  const netSign = net > 0 ? '+' : net < 0 ? '-' : '';

  const a11yLabel =
    `Khata summary. You owe ${owedText}. ` +
    `Owed to you ${receivableText}. ` +
    `Net ${netSign}${netText}.`;

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
    >
      <SummaryTile
        label="You owe"
        amountPaise={owed}
        color={colors.error}
        testID="khata-summary-owed"
      />
      <View style={styles.divider} />
      <SummaryTile
        label="Owed to you"
        amountPaise={receivable}
        color={colors.success}
        testID="khata-summary-receivable"
      />
      <View style={styles.divider} />
      <SummaryTile
        label="Net"
        amountPaise={net}
        color={colors.gold}
        signed
        testID="khata-summary-net"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  tileLabel: {
    ...typography.overline,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  tileAmount: {
    ...typography.h3,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
    marginVertical: spacing.xs,
  },
});

const KhataSummaryCard = React.memo(KhataSummaryCardBase);
export default KhataSummaryCard;