/**
 * BenefitsTable - Feature comparison matrix across subscription tiers.
 * Displays boolean benefits and cashback multiplier for each tier.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';
import type { SubscriptionTier } from '@/services/subscriptionApi';
import type { TierBenefits } from '@/types/subscription.types';

interface BenefitsTableProps {
  tiers: SubscriptionTier[];
}

const BENEFIT_LABELS: Record<keyof Omit<TierBenefits, 'cashbackMultiplier'>, string> = {
  freeDelivery: 'Free Delivery',
  prioritySupport: 'Priority Support',
  exclusiveDeals: 'Exclusive Deals',
  earlyFlashSaleAccess: 'Flash Sale Access',
  personalShopper: 'Personal Shopper',
  premiumEvents: 'Premium Events',
  conciergeService: 'Concierge Service',
  birthdayOffer: 'Birthday Offer',
  anniversaryOffer: 'Anniversary Offer',
  unlimitedWishlists: 'Unlimited Wishlists',
};

type BooleanBenefitKey = keyof typeof BENEFIT_LABELS;

const benefitKeys = Object.keys(BENEFIT_LABELS) as BooleanBenefitKey[];

function BenefitsTable({ tiers }: BenefitsTableProps) {
  if (!tiers || tiers.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Compare Plans</Text>
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.labelCell}>
            <Text style={styles.headerLabelText}>Benefits</Text>
          </View>
          {tiers.map((tier) => (
            <View key={tier.tier} style={styles.tierCell}>
              <Text style={styles.tierHeaderText} numberOfLines={1}>
                {tier.name}
              </Text>
            </View>
          ))}
        </View>

        {/* Cashback multiplier row */}
        <View style={[styles.row, styles.rowEven]}>
          <View style={styles.labelCell}>
            <Text style={styles.labelText}>Cashback</Text>
          </View>
          {tiers.map((tier) => (
            <View key={tier.tier} style={styles.tierCell}>
              <Text style={styles.multiplierText}>
                {tier.benefits?.cashbackMultiplier || 1}x
              </Text>
            </View>
          ))}
        </View>

        {/* Boolean benefit rows */}
        {benefitKeys.map((key, index) => {
          const isEven = (index + 1) % 2 === 0; // +1 because cashback row is index 0
          return (
            <View key={key} style={[styles.row, isEven && styles.rowEven]}>
              <View style={styles.labelCell}>
                <Text style={styles.labelText}>{BENEFIT_LABELS[key]}</Text>
              </View>
              {tiers.map((tier) => {
                const hasFeature = tier.benefits?.[key] === true;
                return (
                  <View key={tier.tier} style={styles.tierCell}>
                    {hasFeature ? (
                      <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                    ) : (
                      <Text style={styles.dashText}>--</Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default React.memo(BenefitsTable);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: Spacing.base,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
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
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  rowEven: {
    backgroundColor: '#F9FAFB',
  },
  labelCell: {
    flex: 1.4,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  tierCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  tierHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  labelText: {
    fontSize: 13,
    color: '#6B7280',
  },
  multiplierText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  dashText: {
    fontSize: 14,
    color: '#D1D5DB',
  },
});
