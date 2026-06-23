/**
 * TierCard - Subscription tier plan card
 * Displays tier name, pricing, cashback badge, features, and selection state.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import type { SubscriptionTier } from '@/services/subscriptionApi';

interface TierCardProps {
  tier: SubscriptionTier;
  selectedCycle: 'monthly' | 'yearly';
  isSelected: boolean;
  isCurrent: boolean;
  currencySymbol: string;
  onSelect: (tier: SubscriptionTier) => void;
}

function TierCard({ tier, selectedCycle, isSelected, isCurrent, currencySymbol, onSelect }: TierCardProps) {
  const price = selectedCycle === 'yearly' ? tier.pricing.yearly : tier.pricing.monthly;
  const cashbackMultiplier = tier.benefits?.cashbackMultiplier;

  return (
    <Pressable
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={() => onSelect(tier)}
    >
      {/* Header: Name + Current badge | Price */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.nameRow}>
            <Text style={styles.tierName}>{tier.name}</Text>
            {isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>
          <Text style={styles.duration}>
            /{selectedCycle === 'yearly' ? 'year' : 'month'}
          </Text>
        </View>
        <View style={styles.pricingContainer}>
          <Text style={styles.price}>
            {currencySymbol}{price.toFixed(2)}
          </Text>
          {selectedCycle === 'yearly' && tier.pricing.yearlyDiscount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>
                {tier.pricing.yearlyDiscount}% off
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Cashback multiplier badge */}
      {cashbackMultiplier > 1 && (
        <View style={styles.cashbackBadge}>
          <Ionicons name="flash" size={12} color={Colors.gold} />
          <Text style={styles.cashbackText}>{cashbackMultiplier}x Cashback</Text>
        </View>
      )}

      {/* Features list (top 3) */}
      {tier.features && tier.features.length > 0 && (
        <View style={styles.featuresList}>
          {tier.features.slice(0, 3).map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
          {tier.features.length > 3 && (
            <Text style={styles.moreFeatures}>
              +{tier.features.length - 3} more benefits
            </Text>
          )}
        </View>
      )}

      {/* Selected checkmark */}
      {isSelected && (
        <View style={styles.selectedIcon}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.gold} />
        </View>
      )}
    </Pressable>
  );
}

export default React.memo(TierCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  cardSelected: {
    borderColor: Colors.gold,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tierName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  duration: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  pricingContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  discountBadge: {
    backgroundColor: Colors.success + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: 4,
  },
  discountBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  currentBadge: {
    backgroundColor: Colors.gold + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.gold,
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.gold + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
    marginBottom: Spacing.md,
  },
  cashbackText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gold,
  },
  featuresList: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  moreFeatures: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '500',
    marginTop: 2,
  },
  selectedIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
});
