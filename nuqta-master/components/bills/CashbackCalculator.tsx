// Cashback Calculator
// Shows detailed cashback calculation breakdown

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CashbackCalculation } from '@/types/billVerification.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface CashbackCalculatorProps {
  calculation: CashbackCalculation;
}

function CashbackCalculator({ calculation }: CashbackCalculatorProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="gift" size={24} color={colors.brand.emerald} />
        <Text style={styles.headerTitle}>Cashback Breakdown</Text>
      </View>

      {/* Total Cashback */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>You'll Earn</Text>
        <Text style={styles.totalAmount}>{currencySymbol}{calculation.finalCashback.toFixed(2)}</Text>
        <Text style={styles.totalRate}>{calculation.finalCashbackRate}% Cashback</Text>
      </View>

      {/* Breakdown */}
      <View style={styles.breakdownSection}>
        <Text style={styles.sectionTitle}>Calculation Details</Text>

        {/* Base Amount */}
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Bill Amount</Text>
          <Text style={styles.breakdownValue}>{currencySymbol}{calculation.baseAmount.toFixed(2)}</Text>
        </View>

        {/* Base Cashback */}
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLabelContainer}>
            <Text style={styles.breakdownLabel}>Base Cashback</Text>
            <Text style={styles.breakdownSubtext}>{calculation.baseCashbackRate}%</Text>
          </View>
          <Text style={styles.breakdownValue}>{currencySymbol}{calculation.baseCashback.toFixed(2)}</Text>
        </View>

        {/* Bonuses */}
        {calculation.bonuses.map((bonus, index) => (
          <View key={index} style={styles.breakdownRow}>
            <View style={styles.breakdownLabelContainer}>
              <View style={styles.bonusLabelRow}>
                <Ionicons name="add-circle" size={16} color={colors.brand.emerald} />
                <Text style={styles.breakdownLabel}>{bonus.label}</Text>
              </View>
              <Text style={styles.breakdownSubtext}>{bonus.description}</Text>
            </View>
            <Text style={[styles.breakdownValue, styles.bonusValue]}>
              +{currencySymbol}{bonus.amount.toFixed(2)}
            </Text>
          </View>
        ))}

        {/* Total Bonus */}
        {calculation.totalBonus > 0 && (
          <View style={[styles.breakdownRow, styles.totalBonusRow]}>
            <Text style={styles.totalBonusLabel}>Total Bonus</Text>
            <Text style={styles.totalBonusValue}>+{currencySymbol}{calculation.totalBonus.toFixed(2)}</Text>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Final Cashback */}
        <View style={[styles.breakdownRow, styles.finalRow]}>
          <Text style={styles.finalLabel}>Total Cashback</Text>
          <Text style={styles.finalValue}>{currencySymbol}{calculation.finalCashback.toFixed(2)}</Text>
        </View>
      </View>

      {/* Cap Warning */}
      {calculation.appliedCap && (
        <View style={styles.capWarning}>
          <Ionicons name="information-circle" size={20} color="#FF9800" />
          <View style={styles.capWarningText}>
            <Text style={styles.capWarningTitle}>Limit Applied</Text>
            <Text style={styles.capWarningMessage}>{calculation.appliedCap.reason}</Text>
          </View>
        </View>
      )}

      {/* Caps Info */}
      {(calculation.caps.dailyLimit || calculation.caps.monthlyLimit) && (
        <View style={styles.capsInfo}>
          <Text style={styles.capsTitle}>Cashback Limits</Text>
          {calculation.caps.dailyLimit && (
            <View style={styles.capRow}>
              <Text style={styles.capLabel}>Daily Limit</Text>
              <Text style={styles.capValue}>{currencySymbol}{calculation.caps.dailyLimit}</Text>
            </View>
          )}
          {calculation.caps.monthlyLimit && (
            <View style={styles.capRow}>
              <Text style={styles.capLabel}>Monthly Limit</Text>
              <Text style={styles.capValue}>{currencySymbol}{calculation.caps.monthlyLimit}</Text>
            </View>
          )}
        </View>
      )}

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="time-outline" size={16} color="#2196F3" />
        <Text style={styles.infoText}>
          Cashback will be credited within 24-48 hours after bill approval
        </Text>
      </View>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
  },
  totalCard: {
    backgroundColor: colors.greenMist,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.brand.emerald,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.brand.emerald,
    marginBottom: 4,
  },
  totalRate: {
    fontSize: 14,
    color: colors.brand.emerald,
    fontWeight: '500',
  },
  breakdownSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  breakdownLabelContainer: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.midGray,
  },
  breakdownSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
  },
  bonusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bonusValue: {
    color: colors.brand.emerald,
  },
  totalBonusRow: {
    backgroundColor: colors.tint.warmGray,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  totalBonusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.emerald,
  },
  totalBonusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.emerald,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 12,
  },
  finalRow: {
    paddingTop: 8,
  },
  finalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.darkGray,
  },
  finalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.emerald,
  },
  capWarning: {
    flexDirection: 'row',
    backgroundColor: '#FFF4E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  capWarningText: {
    flex: 1,
  },
  capWarningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 2,
  },
  capWarningMessage: {
    fontSize: 12,
    color: '#FF9800',
  },
  capsInfo: {
    backgroundColor: colors.tint.warmGray,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  capsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.midGray,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  capRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  capLabel: {
    fontSize: 12,
    color: colors.midGray,
  },
  capValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.darkGray,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#2196F3',
    lineHeight: 16,
  },
});

export default React.memo(CashbackCalculator);
