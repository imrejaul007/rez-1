// @ts-nocheck
/**
 * Amount To Pay Card
 * 
 * Displays final amount with crossed-out original price and savings info
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';

interface AmountToPayCardProps {
  originalAmount: number;
  amountToPay: number;
  coinsApplied: number;
  showOptimizedBadge?: boolean;
}

export const AmountToPayCard: React.FC<AmountToPayCardProps> = ({
  originalAmount,
  amountToPay,
  coinsApplied,
  showOptimizedBadge = true,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const hasSavings = originalAmount > amountToPay;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Amount to Pay</Text>
        {showOptimizedBadge && hasSavings && (
          <View style={styles.optimizedBadge}>
            <Ionicons name="sparkles" size={12} color={colors.primary[600]} />
            <Text style={styles.optimizedText}>Optimized</Text>
          </View>
        )}
      </View>

      <View style={styles.amountRow}>
        {hasSavings && (
          <Text style={styles.originalAmount}>{currencySymbol}{originalAmount.toFixed(0)}</Text>
        )}
        <Text style={styles.finalAmount}>{currencySymbol}{amountToPay.toFixed(0)}</Text>
      </View>

      {hasSavings && (
        <View style={styles.savingsInfo}>
          <Ionicons name="checkmark-circle" size={14} color={colors.successScale[500]} />
          <Text style={styles.savingsText}>
            {`${BRAND.APP_NAME} applied maximum savings for you`}
          </Text>
        </View>
      )}

      {coinsApplied > 0 && (
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <CachedImage
              source={BRAND.COIN_IMAGE}
              style={styles.coinIcon}
              contentFit="contain"
              transition={200}
            />
            <Text style={styles.breakdownLabel}>Coins Used</Text>
            <Text style={styles.breakdownValue}>-{currencySymbol}{coinsApplied}</Text>
          </View>
        </View>
      )}

      {amountToPay === 0 && (
        <LinearGradient
          colors={[colors.successScale[500], colors.successScale[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.freePaymentBanner}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.background.primary} />
          <Text style={styles.freePaymentText}>
            Fully paid with coins! No additional payment needed.
          </Text>
        </LinearGradient>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h4,
    color: colors.text.primary,
  },
  optimizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.full,
    gap: 4,
  },
  optimizedText: {
    ...typography.caption,
    color: colors.primary[600],
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  originalAmount: {
    ...typography.h4,
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  finalAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary[600],
  },
  savingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  savingsText: {
    ...typography.bodySmall,
    color: colors.successScale[600],
  },
  breakdownRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  coinIcon: {
    width: 18,
    height: 18,
  },
  breakdownLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    flex: 1,
  },
  breakdownValue: {
    ...typography.body,
    color: colors.successScale[600],
    fontWeight: '600',
  },
  freePaymentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  freePaymentText: {
    ...typography.body,
    color: colors.background.primary,
    flex: 1,
    fontWeight: '600',
  },
});

export default React.memo(AmountToPayCard);
