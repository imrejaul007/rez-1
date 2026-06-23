// Prorated Price Display Component
// Shows breakdown of prorated pricing for upgrades

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface ProratedPriceDisplayProps {
  originalPrice: number;
  creditFromCurrentPlan: number;
  finalAmount: number;
  currentTier: string;
  newTier: string;
  daysRemaining: number;
}

function ProratedPriceDisplay({
  originalPrice,
  creditFromCurrentPlan,
  finalAmount,
  currentTier,
  newTier,
  daysRemaining,
}: ProratedPriceDisplayProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Pricing Breakdown</ThemedText>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.infoScale[400]} />
        <ThemedText style={styles.infoText}>
          You have {daysRemaining} days remaining on your {currentTier} plan
        </ThemedText>
      </View>

      <View style={styles.breakdownContainer}>
        {/* Original Price */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <ThemedText style={styles.label}>{newTier} Plan (1 month)</ThemedText>
          </View>
          <ThemedText style={styles.value}>{currencySymbol}{originalPrice}</ThemedText>
        </View>

        {/* Credit */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <ThemedText style={styles.label}>Credit from {currentTier} Plan</ThemedText>
            <ThemedText style={styles.sublabel}>
              ({daysRemaining} days remaining)
            </ThemedText>
          </View>
          <ThemedText style={[styles.value, styles.creditValue]}>-{currencySymbol}{creditFromCurrentPlan}</ThemedText>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Total */}
        <View style={[styles.row, styles.totalRow]}>
          <View style={styles.labelContainer}>
            <ThemedText style={styles.totalLabel}>Amount Due Today</ThemedText>
            <ThemedText style={styles.sublabel}>
              Covers remaining {daysRemaining} days
            </ThemedText>
          </View>
          <ThemedText style={styles.totalValue}>{currencySymbol}{finalAmount}</ThemedText>
        </View>
      </View>

      <View style={styles.noteContainer}>
        <ThemedText style={styles.noteText}>
          Your next full billing cycle starts after {daysRemaining} days
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.blue,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.infoScale[400],
  },
  breakdownContainer: {
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  labelContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 14,
    color: colors.neutral[700],
  },
  sublabel: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  creditValue: {
    color: colors.lightMustard,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: 12,
  },
  totalRow: {
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.brand.purpleLight,
  },
  noteContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.tint.amberLight,
    borderRadius: 8,
  },
  noteText: {
    fontSize: 12,
    color: colors.brand.amberDark,
    textAlign: 'center',
  },
});

export default React.memo(ProratedPriceDisplay);
