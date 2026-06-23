/**
 * LoyaltyBenefitsList — list of perks for a given tier.
 *
 * Used to communicate "what does this tier actually get me?" inside the
 * loyalty hub. The cashback + delivery lines are rendered with their own
 * styled rows; the additional perks are rendered as a bulleted list
 * underneath.
 *
 * Props
 * -----
 *   - `tier`     — which tier's benefits to render.
 *   - `compact`  — when true, hides the cashback/delivery lines and only
 *                  renders the perks list (useful for compact summaries).
 *
 * Accessibility
 * -------------
 *   - The outer View exposes `accessibilityRole="list"` and a label
 *     describing the tier.
 *   - Each row is a separate accessibility element with its own label.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { LoyaltyTierKey } from '@/hooks/b/loyalty/useLoyaltyTier';

interface TierBenefits {
  cashback: string;
  delivery: string;
  perks: ReadonlyArray<string>;
  color: string;
  label: string;
}

const BRONZE_COLOR = '#CD7F32';
const SILVER_COLOR = '#C0C0C0';
const PLATINUM_COLOR = '#E5E4E2';

const TIER_BENEFITS: Record<LoyaltyTierKey, TierBenefits> = {
  bronze: {
    label: 'Bronze',
    color: BRONZE_COLOR,
    cashback: 'Standard cashback',
    delivery: 'Free delivery on ₹499+',
    perks: ['Access to all offers'],
  },
  silver: {
    label: 'Silver',
    color: SILVER_COLOR,
    cashback: '5% extra cashback on partner stores',
    delivery: 'Priority shipping',
    perks: [
      'Priority support',
      'Early access to flash sales',
    ],
  },
  gold: {
    label: 'Gold',
    color: colors.gold,
    cashback: '10% extra cashback',
    delivery: 'Free express delivery',
    perks: [
      'Exclusive Gold-only offers',
      'Concierge support',
    ],
  },
  platinum: {
    label: 'Platinum',
    color: PLATINUM_COLOR,
    cashback: '15% extra cashback',
    delivery: 'Free same-day delivery',
    perks: [
      'VIP events access',
      'Personal relationship manager',
      'Custom offers',
    ],
  },
};

const CHECKMARK = '✓';

export interface LoyaltyBenefitsListProps {
  tier: LoyaltyTierKey;
  compact?: boolean;
}

function LoyaltyBenefitsListBase({
  tier,
  compact = false,
}: LoyaltyBenefitsListProps) {
  const data = TIER_BENEFITS[tier];

  const headline = useMemo(() => `${data.label} tier benefits`, [data.label]);

  return (
    <View
      accessibilityRole="list"
      accessibilityLabel={headline}
      style={styles.container}
    >
      {!compact ? (
        <>
          <View
            style={styles.row}
            accessible
            accessibilityLabel={`Cashback: ${data.cashback}`}
          >
            <Text style={[styles.check, { color: data.color }]}>{CHECKMARK}</Text>
            <Text style={styles.rowText}>{data.cashback}</Text>
          </View>
          <View
            style={styles.row}
            accessible
            accessibilityLabel={`Delivery: ${data.delivery}`}
          >
            <Text style={[styles.check, { color: data.color }]}>{CHECKMARK}</Text>
            <Text style={styles.rowText}>{data.delivery}</Text>
          </View>
        </>
      ) : null}

      {data.perks.map((perk) => (
        <View
          key={perk}
          style={styles.row}
          accessible
          accessibilityLabel={`Benefit: ${perk}`}
        >
          <Text style={[styles.check, { color: data.color }]}>{CHECKMARK}</Text>
          <Text style={styles.rowText}>{perk}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  check: {
    fontSize: 14,
    fontWeight: '800',
    marginRight: spacing.sm,
    marginTop: 1,
    width: 16,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});

const LoyaltyBenefitsList = React.memo(LoyaltyBenefitsListBase);
export default LoyaltyBenefitsList;
