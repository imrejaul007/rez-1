/**
 * CoinExpiryList — full list view of expiring coins (wallet screen).
 *
 * One row per notice with:
 *   - coin name
 *   - amount
 *   - days-left badge (color-coded: <3d red, <7d orange, <30d yellow)
 *   - "View coin" button per row
 *
 * Renders nothing when `notices` is empty (the parent screen shows its
 * own empty state).
 *
 * Wrapped in `<FeatureFlagGate flag="b.coinExpiry">` so the whole list
 * disappears when the feature flag is disabled.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { useCoinExpiry } from '@/hooks/b/wallet/useCoinExpiry';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import logger from '@/utils/logger';
import type { CoinExpiryNotice } from '@/types/coin-expiry.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Days-left thresholds for the badge colour ramp. */
const RED_BADGE_DAYS = 3;
const ORANGE_BADGE_DAYS = 7;
/** Route each "View coin" button navigates to. */
const VIEW_COIN_ROUTE = '/wallet';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CoinExpiryListBase(): React.ReactElement | null {
  const router = useRouter();
  const { notices } = useCoinExpiry();

  const handleView = useCallback(
    (notice: CoinExpiryNotice) => {
      logger.info(
        'coin_expiry_list_view_pressed',
        { coinId: notice.coinId, daysLeft: notice.daysLeft },
        'B Features',
      );
      try {
        router.push(VIEW_COIN_ROUTE as never);
      } catch (err) {
        logger.warn(
          'coin_expiry_list_nav_failed',
          { error: String(err), coinId: notice.coinId },
          'B Features',
        );
      }
    },
    [router],
  );

  if (notices.length === 0) return null;

  return (
    <View
      style={styles.container}
      accessibilityLabel={`${notices.length} coin${notices.length === 1 ? '' : 's'} expiring soon`}
    >
      {notices.map((notice) => (
        <Row
          key={notice.coinId}
          notice={notice}
          onView={() => handleView(notice)}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row sub-component
// ---------------------------------------------------------------------------

function Row({
  notice,
  onView,
}: {
  notice: CoinExpiryNotice;
  onView: () => void;
}): React.ReactElement {
  const amountLabel = formatPrice(notice.amountPaise / 100, 'INR', false) ?? '₹0';
  const daysLabel = describeDays(notice.daysLeft);
  const badgeStyle = badgeStyleFor(notice.daysLeft);
  const accessibilityLabel = `${notice.coinName}, ${amountLabel}, expires in ${daysLabel}.`;

  return (
    <View
      style={styles.row}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.leftColumn}>
        <Text style={styles.coinName} numberOfLines={1}>
          {notice.coinName}
        </Text>
        <Text style={styles.amount}>{amountLabel}</Text>
      </View>

      <View style={styles.rightColumn}>
        <View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>{daysLabel}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${notice.coinName}`}
          onPress={onView}
          style={({ pressed }) => [styles.viewBtn, pressed && styles.viewBtnPressed]}
        >
          <Text style={styles.viewBtnText}>View coin</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function describeDays(daysLeft: number): string {
  if (daysLeft <= 0) return 'Today';
  if (daysLeft === 1) return '1 day';
  return `${daysLeft} days`;
}

function badgeStyleFor(daysLeft: number): { backgroundColor: string; borderColor: string } {
  if (daysLeft < RED_BADGE_DAYS) {
    return { backgroundColor: colors.errorScale[50], borderColor: colors.errorScale[200] };
  }
  if (daysLeft < ORANGE_BADGE_DAYS) {
    return { backgroundColor: colors.tint.amber, borderColor: colors.warningScale[200] };
  }
  return { backgroundColor: colors.tint.amberLight, borderColor: colors.warningScale[200] };
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  leftColumn: {
    flex: 1,
    paddingRight: spacing.md,
  },
  coinName: {
    ...typography.label,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  amount: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: 2,
  },
  rightColumn: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  viewBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gold,
  },
  viewBtnPressed: {
    opacity: 0.85,
  },
  viewBtnText: {
    ...typography.labelSmall,
    fontWeight: '700',
    color: colors.nileBlue,
  },
});

// ---------------------------------------------------------------------------
// Public, gated component
// ---------------------------------------------------------------------------

/**
 * CoinExpiryList — public default export. Wraps the base component in
 * `<FeatureFlagGate flag="b.coinExpiry">` so the rollout can be turned
 * off without a rebuild.
 */
function CoinExpiryList(): React.ReactElement | null {
  return (
    <FeatureFlagGate flag="b.coinExpiry">
      <CoinExpiryListBase />
    </FeatureFlagGate>
  );
}

export default CoinExpiryList;