// Pricing Toggle Component
// Segmented control for monthly/yearly billing with savings indicator

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface PricingToggleProps {
  billingCycle: 'monthly' | 'yearly';
  onChange: (cycle: 'monthly' | 'yearly') => void;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlySavings?: number;
}

function PricingToggle({
  billingCycle,
  onChange,
  monthlyPrice,
  yearlyPrice,
  yearlySavings,
}: PricingToggleProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const savings = useMemo(() => {
    if (!yearlySavings) {
      const monthlyTotal = monthlyPrice * 12;
      return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
    }
    return yearlySavings;
  }, [monthlyPrice, yearlyPrice, yearlySavings]);

  const monthlyMonthlyPrice = monthlyPrice;
  const yearlyMonthlyPrice = Math.round(yearlyPrice / 12);

  return (
    <View style={styles.container}>
      {/* Billing Toggle */}
      <View
        style={styles.toggleContainer}
        accessible={false}
        accessibilityLabel="Billing cycle selection"
      >
        <Pressable
          style={[
            styles.toggleOption,
            billingCycle === 'monthly' && styles.toggleOptionActive,
          ]}
          onPress={() => onChange('monthly')}
         
          accessible={true}
          accessibilityRole="radio"
          accessibilityLabel={`Monthly billing, ${monthlyMonthlyPrice} rupees per month`}
          accessibilityHint="Double tap to select monthly billing"
          accessibilityState={{
            selected: billingCycle === 'monthly',
            checked: billingCycle === 'monthly',
          }}
        >
          <ThemedText
            style={[
              styles.toggleOptionText,
              billingCycle === 'monthly' && styles.toggleOptionTextActive,
            ]}
            accessible={false}
          >
            Monthly
          </ThemedText>
          <ThemedText
            style={[
              styles.togglePrice,
              billingCycle === 'monthly' && styles.togglePriceActive,
            ]}
            accessible={false}
          >
            {currencySymbol}{monthlyMonthlyPrice}
          </ThemedText>
        </Pressable>

        <View style={styles.toggleDivider} accessible={false} />

        <Pressable
          style={[
            styles.toggleOption,
            billingCycle === 'yearly' && styles.toggleOptionActive,
          ]}
          onPress={() => onChange('yearly')}
         
          accessible={true}
          accessibilityRole="radio"
          accessibilityLabel={`Yearly billing, ${yearlyMonthlyPrice} rupees per month, save ${savings} percent`}
          accessibilityHint="Double tap to select yearly billing and save money"
          accessibilityState={{
            selected: billingCycle === 'yearly',
            checked: billingCycle === 'yearly',
          }}
        >
          <View style={styles.yearlyLabelContainer}>
            <ThemedText
              style={[
                styles.toggleOptionText,
                billingCycle === 'yearly' && styles.toggleOptionTextActive,
              ]}
              accessible={false}
            >
              Yearly
            </ThemedText>
            <View style={styles.savingsBadge} accessible={false}>
              <ThemedText style={styles.savingsText}>Save {savings}%</ThemedText>
            </View>
          </View>
          <ThemedText
            style={[
              styles.togglePrice,
              billingCycle === 'yearly' && styles.togglePriceActive,
            ]}
            accessible={false}
          >
            {currencySymbol}{yearlyMonthlyPrice}/mo
          </ThemedText>
        </Pressable>
      </View>

      {/* Savings Calculation */}
      {billingCycle === 'yearly' && (
        <View
          style={styles.savingsInfo}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={`Yearly savings: Total annual cost is ${yearlyPrice} rupees. You save ${monthlyPrice * 12 - yearlyPrice} rupees per year.`}
        >
          <View style={styles.savingsRow}>
            <View style={styles.savingsColumn}>
              <ThemedText style={styles.savingsLabel}>Total Annual Cost</ThemedText>
              <ThemedText style={styles.savingsValue}>{currencySymbol}{yearlyPrice}</ThemedText>
            </View>
            <View style={styles.savingsDivider} accessible={false} />
            <View style={styles.savingsColumn}>
              <ThemedText style={styles.savingsLabel}>You Save</ThemedText>
              <View style={styles.savingsValueRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.lightMustard} />
                <ThemedText style={styles.savingsAmountValue}>
                  {currencySymbol}{monthlyPrice * 12 - yearlyPrice}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ROI Projection */}
      <View
        style={styles.roiContainer}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel="Projected return on investment: Based on average usage, plus 2400 rupees per year"
      >
        <View style={styles.roiHeader}>
          <Ionicons name="sparkles" size={16} color={colors.warningScale[400]} />
          <ThemedText style={styles.roiTitle}>Projected ROI</ThemedText>
        </View>
        <View style={styles.roiContent}>
          <View style={styles.roiItem}>
            <ThemedText style={styles.roiItemLabel}>Based on average usage</ThemedText>
            <ThemedText style={styles.roiItemValue}>+{currencySymbol}2,400/year</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  toggleContainer: {
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  toggleOptionTextActive: {
    color: colors.neutral[900],
  },
  togglePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[500],
    marginTop: 4,
  },
  togglePriceActive: {
    color: colors.neutral[900],
  },
  toggleDivider: {
    width: 1,
    backgroundColor: colors.neutral[200],
    marginHorizontal: 4,
  },
  yearlyLabelContainer: {
    alignItems: 'center',
  },
  savingsBadge: {
    marginTop: 6,
    backgroundColor: colors.linen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.lightMustard,
  },
  savingsInfo: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.lightMustard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savingsColumn: {
    flex: 1,
  },
  savingsDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.neutral[200],
  },
  savingsLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
    marginBottom: 4,
  },
  savingsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  savingsValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savingsAmountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.lightMustard,
  },
  roiContainer: {
    backgroundColor: colors.tint.amber,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.warningScale[400],
  },
  roiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  roiTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  roiContent: {
    gap: 8,
  },
  roiItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roiItemLabel: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  roiItemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warningScale[400],
  },
});

export default React.memo(PricingToggle);
