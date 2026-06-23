// Group Discount Calculator Component
// Displays current savings and discount progression

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GroupBuyingGroup } from '@/types/groupBuying.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface GroupDiscountCalculatorProps {
  group: GroupBuyingGroup;
}

function GroupDiscountCalculator({ group }: GroupDiscountCalculatorProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const currentMembers = group.currentMemberCount;
  const basePrice = group.product.basePrice;
  const currentPrice = group.currentTier.pricePerUnit;
  const savingsPerUnit = basePrice - currentPrice;
  const totalSavings = savingsPerUnit * currentMembers;
  const savingsPercentage = ((savingsPerUnit / basePrice) * 100).toFixed(0);

  // Find next tier
  const sortedTiers = [...group.product.discountTiers].sort((a, b) => a.minMembers - b.minMembers);
  const currentTierIndex = sortedTiers.findIndex(
    (t) => t.discountPercentage === group.currentTier.discountPercentage
  );
  const nextTier = sortedTiers[currentTierIndex + 1];
  const membersNeeded = nextTier ? nextTier.minMembers - currentMembers : 0;

  return (
    <View style={styles.container}>
      {/* Current Savings Card */}
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purple]}
        style={styles.savingsCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.savingsHeader}>
          <Ionicons name="trending-down" size={24} color="white" />
          <Text style={styles.savingsTitle}>Current Savings</Text>
        </View>
        <Text style={styles.savingsAmount}>{currencySymbol}{savingsPerUnit.toFixed(2)}</Text>
        <Text style={styles.savingsSubtext}>per unit ({savingsPercentage}% off)</Text>
        <View style={styles.totalSavings}>
          <Text style={styles.totalSavingsText}>
            Total group savings: {currencySymbol}{totalSavings.toFixed(2)}
          </Text>
        </View>
      </LinearGradient>

      {/* Tier Progress */}
      <View style={styles.tierSection}>
        <View style={styles.tierHeader}>
          <Text style={styles.tierTitle}>Discount Tiers</Text>
          {nextTier && (
            <Text style={styles.tierSubtitle}>
              {membersNeeded} more {membersNeeded === 1 ? 'member' : 'members'} for next tier
            </Text>
          )}
        </View>

        {sortedTiers.map((tier, index) => {
          const isActive = tier.discountPercentage === group.currentTier.discountPercentage;
          const isUnlocked = currentMembers >= tier.minMembers;
          const isNext = index === currentTierIndex + 1;

          return (
            <View
              key={index}
              style={[
                styles.tierItem,
                isActive && styles.tierItemActive,
                isUnlocked && !isActive && styles.tierItemUnlocked,
              ]}
            >
              <View style={styles.tierIcon}>
                {isUnlocked ? (
                  <Ionicons name="checkmark-circle" size={24} color={colors.successScale[400]} />
                ) : isNext ? (
                  <Ionicons name="radio-button-off" size={24} color={colors.warningScale[400]} />
                ) : (
                  <Ionicons name="lock-closed" size={24} color={colors.neutral[400]} />
                )}
              </View>
              <View style={styles.tierContent}>
                <Text style={[styles.tierMembers, isActive && styles.tierMembersActive]}>
                  {tier.minMembers}+ members
                </Text>
                <Text style={[styles.tierDiscount, isActive && styles.tierDiscountActive]}>
                  {tier.discountPercentage}% OFF - {currencySymbol}{tier.pricePerUnit.toFixed(2)}
                </Text>
              </View>
              {isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  savingsCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  savingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  savingsAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  savingsSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  totalSavings: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  totalSavingsText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  tierSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tierHeader: {
    marginBottom: 16,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  tierSubtitle: {
    fontSize: 13,
    color: colors.warningScale[400],
    fontWeight: '500',
  },
  tierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.neutral[50],
    marginBottom: 8,
    gap: 12,
  },
  tierItemActive: {
    backgroundColor: colors.tint.purple,
    borderWidth: 2,
    borderColor: colors.brand.purpleLight,
  },
  tierItemUnlocked: {
    backgroundColor: colors.tint.green,
  },
  tierIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierContent: {
    flex: 1,
  },
  tierMembers: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
    marginBottom: 2,
  },
  tierMembersActive: {
    color: colors.brand.purpleLight,
  },
  tierDiscount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  tierDiscountActive: {
    color: colors.brand.purpleLight,
  },
  activeBadge: {
    backgroundColor: colors.brand.purpleLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
});

export default React.memo(GroupDiscountCalculator);
