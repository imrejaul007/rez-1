/**
 * Order Summary Card
 * 
 * Displays bill breakdown with smart savings info
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';

interface OrderSummaryCardProps {
  billAmount: number;
  taxesAndFees?: number;
  discountAmount?: number;
  coinsApplied?: number;
  showSmartSavingsHint?: boolean;
}

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({
  billAmount,
  taxesAndFees = 0,
  discountAmount = 0,
  coinsApplied = 0,
  showSmartSavingsHint = true,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const orderTotal = billAmount + taxesAndFees;
  const totalSavings = discountAmount + coinsApplied;
  const amountToPay = Math.max(0, orderTotal - totalSavings);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Order Summary</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Bill Amount</Text>
        <Text style={styles.value}>{currencySymbol}{billAmount.toFixed(2)}</Text>
      </View>

      {taxesAndFees > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Taxes & Fees</Text>
          <Text style={styles.value}>{currencySymbol}{taxesAndFees.toFixed(2)}</Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.totalLabel}>Order Total</Text>
        <Text style={styles.totalValue}>{currencySymbol}{orderTotal.toFixed(2)}</Text>
      </View>

      {showSmartSavingsHint && totalSavings === 0 && (
        <View style={styles.hintBanner}>
          <Ionicons name="sparkles" size={16} color={colors.infoScale[500]} />
          <Text style={styles.hintText}>
            Smart savings will be applied below
          </Text>
        </View>
      )}

      {totalSavings > 0 && (
        <View style={styles.savingsBanner}>
          <Ionicons name="checkmark-circle" size={16} color={colors.successScale[500]} />
          <Text style={styles.savingsText}>
            You're saving {currencySymbol}{totalSavings.toFixed(2)} on this order!
          </Text>
        </View>
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
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.body,
    color: colors.text.secondary,
  },
  value: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.md,
  },
  totalLabel: {
    ...typography.h4,
    color: colors.text.primary,
  },
  totalValue: {
    ...typography.h3,
    color: colors.text.primary,
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoScale[50],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  hintText: {
    ...typography.caption,
    color: colors.infoScale[700],
    flex: 1,
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successScale[50],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  savingsText: {
    ...typography.caption,
    color: colors.successScale[700],
    flex: 1,
    fontWeight: '600',
  },
});

export default React.memo(OrderSummaryCard);
