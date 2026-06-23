/**
 * CoinExpiryWidget — tiny home-tab widget alternative to the banner.
 *
 * Renders only when `totalExpiringPaise > 0`. Pressing it navigates to
 * the dedicated `/b/coin-expiry` page.
 *
 * Uses the gold/amber accent palette so it slots in next to the existing
 * home-tab cards without competing with the savings widget's primary
 * branding.
 *
 * Wrapped in `<FeatureFlagGate flag="b.coinExpiry">` so the rollout can
 * be flipped off at runtime via `subscriptionStore.featureFlags`.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { useCoinExpiry } from '@/hooks/b/wallet/useCoinExpiry';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import logger from '@/utils/logger';

const COIN_EXPIRY_ROUTE = '/b/coin-expiry';

function CoinExpiryWidgetBase(): React.ReactElement | null {
  const router = useRouter();
  const { notices, totalExpiringPaise, mostUrgentDaysLeft } = useCoinExpiry();

  // Don't render anything when there's no money to lose.
  if (totalExpiringPaise <= 0 || notices.length === 0) return null;

  const handlePress = useCallback(() => {
    logger.info(
      'coin_expiry_widget_pressed',
      {
        noticesCount: notices.length,
        totalExpiringPaise,
        mostUrgentDaysLeft:
          Number.isFinite(mostUrgentDaysLeft) ? mostUrgentDaysLeft : null,
      },
      'B Features',
    );
    try {
      router.push('/b/coin-expiry' as const);
    } catch (err) {
      logger.warn(
        'coin_expiry_widget_nav_failed',
        { error: String(err) },
        'B Features',
      );
    }
  }, [router, notices.length, totalExpiringPaise, mostUrgentDaysLeft]);

  const amountLabel = formatPrice(totalExpiringPaise / 100, 'INR', false) ?? '₹0';
  const daysLabel = describeDays(mostUrgentDaysLeft);
  const accessibilityLabel = `${amountLabel} of coins expiring in ${daysLabel}. Tap to view.`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <Text
          style={styles.icon}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          ⏳
        </Text>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            Coins expiring soon
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {amountLabel} · in {daysLabel}
          </Text>
        </View>
      </View>
      <Text
        style={styles.chevron}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        ›
      </Text>
    </Pressable>
  );
}

function describeDays(daysLeft: number): string {
  if (!Number.isFinite(daysLeft)) return '30+ days';
  if (daysLeft <= 0) return 'today';
  if (daysLeft === 1) return '1 day';
  return `${daysLeft} days`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.tint.amber,
    borderColor: colors.warningScale[200],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.base,
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  text: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    ...typography.label,
    fontWeight: '700',
    color: colors.brand.amberDark,
  },
  subtitle: {
    ...typography.caption,
    color: colors.brand.amberDark,
    marginTop: 2,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 22,
    color: colors.brand.amberDark,
    marginLeft: spacing.sm,
    fontWeight: '700',
  },
});

/**
 * CoinExpiryWidget — public default export. Wraps the base component in
 * `<FeatureFlagGate flag="b.coinExpiry">` so the rollout can be flipped
 * off at runtime without a rebuild.
 */
function CoinExpiryWidget(): React.ReactElement | null {
  return (
    <FeatureFlagGate flag="b.coinExpiry">
      <CoinExpiryWidgetBase />
    </FeatureFlagGate>
  );
}

export default CoinExpiryWidget;