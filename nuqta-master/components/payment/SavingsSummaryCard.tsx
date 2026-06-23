/**
 * Savings Summary Card
 *
 * "You saved today" card showing breakdown of all savings
 * Premium design with Nuqta color palette
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SavingsSummary } from '@/types/storePayment.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';

interface SavingsSummaryCardProps {
  savings: SavingsSummary;
  showCelebration?: boolean;
}

export const SavingsSummaryCard: React.FC<SavingsSummaryCardProps> = ({
  savings,
  showCelebration = true,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  if (savings.totalSaved === 0) {
    return null;
  }

  const savingsBreakdown = [
    {
      label: 'Coins Used',
      value: savings.coinsUsed,
      icon: 'diamond',
      gradient: [colors.nuqta.mustard, colors.nuqta.peach],
    },
    {
      label: 'Bank/UPI Offers',
      value: savings.bankOffers,
      icon: 'card',
      gradient: [colors.nuqta.lavender, colors.nuqta.nileBlue],
    },
    {
      label: 'Loyalty Benefit',
      value: savings.loyaltyBenefit,
      icon: 'star',
      gradient: [colors.nuqta.peach, colors.nuqta.mustard],
    },
  ].filter(item => item.value > 0);

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={[colors.nuqta.lavender, colors.nuqta.linen, colors.background.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        {/* Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {showCelebration && (
              <Text style={styles.emoji}>🎉</Text>
            )}
            <Text style={styles.title}>You Saved Today!</Text>
          </View>
          {showCelebration && savings.totalSaved >= 100 && (
            <LinearGradient
              colors={[colors.nuqta.mustard, colors.nuqta.peach]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.amazingBadge}
            >
              <Ionicons name="sparkles" size={12} color={colors.nuqta.nileBlue} />
              <Text style={styles.amazingText}>Amazing!</Text>
            </LinearGradient>
          )}
        </View>

        {/* Total Saved - Prominent Display */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Saved</Text>
          <LinearGradient
            colors={[colors.nuqta.mustard, colors.nuqta.peach]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.totalAmountWrapper}
          >
            <Text style={styles.totalAmount}>{currencySymbol}{savings.totalSaved}</Text>
          </LinearGradient>
        </View>

        {/* Breakdown */}
        {savingsBreakdown.length > 0 && (
          <View style={styles.breakdownContainer}>
            {savingsBreakdown.map((item, index) => (
              <View key={index} style={styles.breakdownRow}>
                <LinearGradient
                  colors={item.gradient as [string, string]}
                  style={styles.breakdownIcon}
                >
                  <Ionicons name={item.icon as any} size={14} color={colors.background.primary} />
                </LinearGradient>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
                <Text style={styles.breakdownValue}>{currencySymbol}{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer Note */}
        <View style={styles.footer}>
          <View style={styles.footerIconWrapper}>
            <Ionicons name="checkmark-circle" size={14} color={colors.nuqta.mustard} />
          </View>
          <Text style={styles.footerText}>
            {`Smart savings automatically applied by ${BRAND.APP_NAME}`}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nuqta.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.nuqta.peach,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 205, 87, 0.15)',
    top: -30,
    right: -30,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 181, 0.2)',
    bottom: 20,
    left: -20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emoji: {
    fontSize: 20,
  },
  title: {
    ...typography.h4,
    color: colors.nuqta.nileBlue,
    fontWeight: '700',
  },
  amazingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  amazingText: {
    ...typography.caption,
    color: colors.nuqta.nileBlue,
    fontWeight: '700',
  },
  totalContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.nuqta.peach,
    marginBottom: spacing.md,
  },
  totalLabel: {
    ...typography.caption,
    color: colors.nuqta.mustard,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalAmountWrapper: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  totalAmount: {
    ...typography.priceLarge,
    color: '#FFFFFF',
  },
  breakdownContainer: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  breakdownLabel: {
    ...typography.bodySmall,
    color: colors.nuqta.nileBlue,
    flex: 1,
  },
  breakdownValue: {
    ...typography.body,
    color: colors.nuqta.nileBlue,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.nuqta.linen,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  footerIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 205, 87, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: colors.nuqta.nileBlue,
    flex: 1,
  },
});

export default React.memo(SavingsSummaryCard);
