/**
 * CoinExpiryBanner — sticky banner that surfaces soon-to-expire coins.
 *
 * Two render variants:
 *   - `urgent`   → full-width banner, red/orange treatment, flame icon,
 *                  copy: "₹X expiring in Y days — use now".
 *   - `compact`  → small chip in the corner, gold accent, copy: "+₹X expiring".
 *
 * Hidden entirely when there are no notices. Wrapped in
 * `<FeatureFlagGate flag="b.coinExpiry">` so the rollout can be flipped
 * off at runtime via `subscriptionStore.featureFlags`.
 *
 * Behaviour
 * ---------
 *   - Reads via `useCoinExpiry()` (no props — purely a view on the store).
 *   - `onPress` is optional. When supplied, the banner becomes a tap target.
 *   - For `urgent`, the caller can override the auto-detected variant by
 *     passing `variant="urgent"` explicitly.
 */
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { useCoinExpiry } from '@/hooks/b/wallet/useCoinExpiry';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import logger from '@/utils/logger';
import type { CoinExpiryNotice } from '@/types/coin-expiry.types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CoinExpiryBannerProps {
  /**
   * Visual variant. Defaults to `urgent` when any notice has severity
   * `'urgent'` or `'warning'`, otherwise `compact`.
   */
  variant?: 'urgent' | 'compact';
  /**
   * Tap handler. When omitted, the banner is non-interactive (just text).
   * When supplied, the whole banner becomes a `Pressable` with an
   * `accessibilityRole="button"`.
   */
  onPress?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CoinExpiryBannerBase({
  variant,
  onPress,
}: CoinExpiryBannerProps): React.ReactElement | null {
  const { notices, totalExpiringPaise, isUrgent } = useCoinExpiry();

  // Resolve the effective variant. Caller wins when explicit; otherwise
  // auto: any urgent / warning notice → `urgent`, else `compact`.
  const effectiveVariant = useMemo<'urgent' | 'compact'>(() => {
    if (variant) return variant;
    if (notices.length === 0) return 'compact';
    if (isUrgent || notices.some((n) => n.severity === 'warning')) return 'urgent';
    return 'compact';
  }, [variant, notices, isUrgent]);

  const handlePress = useCallback(() => {
    if (!onPress) return;
    logger.info(
      'coin_expiry_banner_pressed',
      {
        variant: effectiveVariant,
        noticesCount: notices.length,
        totalExpiringPaise,
      },
      'B Features',
    );
    onPress();
  }, [onPress, effectiveVariant, notices.length, totalExpiringPaise]);

  // Nothing to show — render nothing at all (hooks must run before any return).
  if (notices.length === 0) return null;
  if (totalExpiringPaise <= 0 && effectiveVariant === 'compact') return null;

  const amountLabel =
    formatPrice(totalExpiringPaise / 100, 'INR', false) ?? '₹0';

  if (effectiveVariant === 'urgent') {
    return (
      <UrgentBanner
        notices={notices}
        amountLabel={amountLabel}
        onPress={onPress ? handlePress : undefined}
      />
    );
  }
  return (
    <CompactBanner
      notices={notices}
      amountLabel={amountLabel}
      onPress={onPress ? handlePress : undefined}
    />
  );
}

// ---------------------------------------------------------------------------
// Urgent variant
// ---------------------------------------------------------------------------

function UrgentBanner({
  notices,
  amountLabel,
  onPress,
}: {
  notices: CoinExpiryNotice[];
  amountLabel: string;
  onPress?: () => void;
}): React.ReactElement {
  // Most-urgent notice — already first because the hook sorts ASC.
  const top = notices[0];
  const daysLabel = describeDays(top.daysLeft);
  const accessibilityLabel = `Warning: ${amountLabel} of ${top.coinName} ${top.severity === 'urgent' ? 'expires' : 'expiring'} in ${daysLabel}. Tap to use now.`;

  const inner = (
    <View style={styles.urgentRow}>
      <Text
        style={styles.urgentIcon}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        🔥
      </Text>
      <View style={styles.urgentTextColumn}>
        <Text style={styles.urgentHeadline} numberOfLines={1}>
          {amountLabel} {top.coinName} expiring in {daysLabel}
        </Text>
        <Text style={styles.urgentSub} numberOfLines={1}>
          {notices.length > 1
            ? `${notices.length} coins expiring soon — use now`
            : "Don't lose it — use now"}
        </Text>
      </View>
      <Text
        style={styles.urgentCta}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        Use now →
      </Text>
    </View>
  );

  if (!onPress) {
    return (
      <View
        style={styles.urgentOuter}
        accessibilityLabel={accessibilityLabel}
      >
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.urgentOuter, pressed && styles.urgentOuterPressed]}
    >
      {inner}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Compact variant
// ---------------------------------------------------------------------------

function CompactBanner({
  notices,
  amountLabel,
  onPress,
}: {
  notices: CoinExpiryNotice[];
  amountLabel: string;
  onPress?: () => void;
}): React.ReactElement {
  const top = notices[0];
  const daysLabel = describeDays(top.daysLeft);
  const accessibilityLabel = `${amountLabel} of ${top.coinName} expiring in ${daysLabel}.`;

  const inner = (
    <View style={styles.compactRow}>
      <Text
        style={styles.compactDot}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        ●
      </Text>
      <Text style={styles.compactText} numberOfLines={1}>
        +{amountLabel} {top.coinName} expiring
      </Text>
      <Text
        style={styles.compactDays}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {daysLabel}
      </Text>
    </View>
  );

  if (!onPress) {
    return (
      <View
        style={styles.compactOuter}
        accessibilityLabel={accessibilityLabel}
      >
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.compactOuter, pressed && styles.compactOuterPressed]}
    >
      {inner}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function describeDays(daysLeft: number): string {
  if (daysLeft <= 0) return 'today';
  if (daysLeft === 1) return '1 day';
  return `${daysLeft} days`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Urgent variant
  urgentOuter: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
    backgroundColor: colors.errorScale[50],
    borderColor: colors.errorScale[200],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  urgentOuterPressed: {
    opacity: 0.85,
  },
  urgentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  urgentIcon: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  urgentTextColumn: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  urgentHeadline: {
    ...typography.label,
    fontWeight: '700',
    color: colors.errorScale[700],
  },
  urgentSub: {
    ...typography.caption,
    color: colors.errorScale[700],
    marginTop: 2,
    opacity: 0.85,
  },
  urgentCta: {
    ...typography.label,
    color: colors.errorScale[700],
    fontWeight: '700',
    marginLeft: spacing.sm,
  },

  // Compact variant
  compactOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginHorizontal: spacing.base,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.tint.amber,
    borderColor: colors.warningScale[200],
    borderWidth: 1,
    borderRadius: borderRadius.full,
  },
  compactOuterPressed: {
    opacity: 0.85,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDot: {
    color: colors.warningScale[500],
    fontSize: 10,
    marginRight: spacing.xs,
  },
  compactText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.brand.amberDark,
  },
  compactDays: {
    ...typography.caption,
    color: colors.brand.amberDark,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
});

// ---------------------------------------------------------------------------
// Public, gated component
// ---------------------------------------------------------------------------

/**
 * CoinExpiryBanner — public default export. Wraps the base component in
 * `<FeatureFlagGate flag="b.coinExpiry">` so the rollout can be turned
 * off at runtime without a rebuild.
 */
function CoinExpiryBanner(props: CoinExpiryBannerProps): React.ReactElement | null {
  return (
    <FeatureFlagGate flag="b.coinExpiry">
      <CoinExpiryBannerBase {...props} />
    </FeatureFlagGate>
  );
}

export default CoinExpiryBanner;