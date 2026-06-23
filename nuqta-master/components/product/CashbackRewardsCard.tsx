import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

/**
 * CashbackRewardsCard Component
 *
 * Displays cashback and rewards information for a product
 * Features:
 * - Cashback percentage and amount
 * - Rewards points calculation
 * - Special offers and promotions
 * - Payment method bonuses
 * - Loyalty tier benefits
 * - Terms and conditions
 */

interface CashbackOffer {
  type: 'percentage' | 'flat';
  value: number; // percentage or flat amount
  maxCashback?: number; // Max cap for percentage-based cashback
  minPurchase?: number; // Minimum purchase requirement
  description?: string;
}

interface RewardPoints {
  basePoints: number; // Base points per rupee
  bonusMultiplier?: number; // Bonus multiplier (e.g., 2x points)
  tierBonus?: number; // Additional points for loyalty tier
}

interface PaymentOffer {
  id: string;
  paymentMethod: string;
  icon: keyof typeof Ionicons.glyphMap;
  offer: string;
  cashbackValue: number;
  color: string;
}

interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface CashbackRewardsCardProps {
  productPrice: number;
  cashbackOffer?: CashbackOffer;
  rewardPoints?: RewardPoints;
  paymentOffers?: PaymentOffer[];
  specialOffers?: SpecialOffer[];
  showDetails?: boolean;
}

export const CashbackRewardsCard: React.FC<CashbackRewardsCardProps> = ({
  productPrice,
  cashbackOffer,
  rewardPoints,
  paymentOffers = [],
  specialOffers = [],
  showDetails = true,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [isExpanded, setIsExpanded] = useState(false);

  // Default cashback offer
  const defaultCashback: CashbackOffer = {
    type: 'percentage',
    value: 5,
    maxCashback: 200,
    description: `Get 5% cashback up to ${currencySymbol}200`,
  };

  // Default reward points
  const defaultRewards: RewardPoints = {
    basePoints: 1, // 1 point per ₹1
    bonusMultiplier: 2, // 2x points on this product
    tierBonus: 50, // +50 bonus points for Gold tier
  };

  // Default payment offers
  const defaultPaymentOffers: PaymentOffer[] = [
    {
      id: 'card',
      paymentMethod: 'Credit/Debit Card',
      icon: 'card',
      offer: 'Extra 5% off',
      cashbackValue: productPrice * 0.05,
      color: colors.brand.purpleLight,
    },
    {
      id: 'wallet',
      paymentMethod: 'Wasil Wallet',
      icon: 'wallet',
      offer: '10% instant discount',
      cashbackValue: productPrice * 0.10,
      color: colors.successScale[400],
    },
    {
      id: 'upi',
      paymentMethod: 'UPI',
      icon: 'phone-portrait',
      offer: '3% cashback',
      cashbackValue: productPrice * 0.03,
      color: colors.warningScale[400],
    },
  ];

  const cashback = cashbackOffer || defaultCashback;
  const rewards = rewardPoints || defaultRewards;
  const payments = paymentOffers.length > 0 ? paymentOffers : defaultPaymentOffers;

  /**
   * Calculate cashback amount
   */
  const calculateCashback = (): number => {
    if (cashback.type === 'percentage') {
      const amount = (productPrice * cashback.value) / 100;
      return cashback.maxCashback ? Math.min(amount, cashback.maxCashback) : amount;
    }
    return cashback.value;
  };

  /**
   * Calculate reward points
   */
  const calculateRewardPoints = (): number => {
    let points = productPrice * rewards.basePoints;

    // Apply bonus multiplier
    if (rewards.bonusMultiplier) {
      points *= rewards.bonusMultiplier;
    }

    // Add tier bonus
    if (rewards.tierBonus) {
      points += rewards.tierBonus;
    }

    return Math.floor(points);
  };

  const cashbackAmount = calculateCashback();
  const totalPoints = calculateRewardPoints();

  return (
    <View style={styles.container}>
      {/* Main Cashback Card - Always Visible */}
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mainCard}
      >
        <View style={styles.mainCardContent}>
          {/* Cashback Section */}
          <View style={styles.cashbackSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="gift" size={24} color={colors.background.primary} />
            </View>
            <View style={styles.cashbackInfo}>
              <ThemedText style={styles.cashbackLabel}>Total Cashback & Rewards</ThemedText>
              <ThemedText style={styles.cashbackAmount}>
                {currencySymbol}{cashbackAmount.toFixed(0)}
              </ThemedText>
              <ThemedText style={styles.cashbackDescription}>
                + {totalPoints.toLocaleString()} reward points
              </ThemedText>
            </View>
          </View>

          {/* Expand Button */}
          <Pressable
            style={styles.expandButton}
            onPress={() => setIsExpanded(!isExpanded)}
           
          >
            <ThemedText style={styles.expandButtonText}>
              {isExpanded ? 'Less' : 'More'} Details
            </ThemedText>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.background.primary}
            />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Detailed Information - Expandable */}
      {isExpanded && showDetails && (
        <View style={styles.detailsContainer}>
          {/* Cashback Breakdown */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cash-outline" size={18} color={colors.brand.purpleLight} />
              <ThemedText style={styles.sectionTitle}>Cashback Breakdown</ThemedText>
            </View>

            <View style={styles.breakdownItem}>
              <ThemedText style={styles.breakdownLabel}>
                {cashback.type === 'percentage'
                  ? `${cashback.value}% Cashback`
                  : 'Flat Cashback'}
              </ThemedText>
              <ThemedText style={styles.breakdownValue}>{currencySymbol}{cashbackAmount.toFixed(0)}</ThemedText>
            </View>

            {cashback.maxCashback && cashback.type === 'percentage' && (
              <ThemedText style={styles.breakdownNote}>
                *Maximum cashback: {currencySymbol}{cashback.maxCashback}
              </ThemedText>
            )}

            {cashback.minPurchase && (
              <ThemedText style={styles.breakdownNote}>
                *Minimum purchase: {currencySymbol}{cashback.minPurchase}
              </ThemedText>
            )}
          </View>

          {/* Reward Points Breakdown */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star-outline" size={18} color={colors.warningScale[400]} />
              <ThemedText style={styles.sectionTitle}>Reward Points</ThemedText>
            </View>

            <View style={styles.breakdownItem}>
              <ThemedText style={styles.breakdownLabel}>
                Base Points ({rewards.basePoints}x on {currencySymbol}{productPrice})
              </ThemedText>
              <ThemedText style={styles.breakdownValue}>
                {Math.floor(productPrice * rewards.basePoints)}
              </ThemedText>
            </View>

            {rewards.bonusMultiplier && rewards.bonusMultiplier > 1 && (
              <View style={styles.breakdownItem}>
                <ThemedText style={styles.breakdownLabel}>
                  Bonus Multiplier ({rewards.bonusMultiplier}x)
                </ThemedText>
                <View style={styles.bonusBadge}>
                  <ThemedText style={styles.bonusBadgeText}>
                    {rewards.bonusMultiplier}x Points
                  </ThemedText>
                </View>
              </View>
            )}

            {rewards.tierBonus && (
              <View style={styles.breakdownItem}>
                <ThemedText style={styles.breakdownLabel}>Tier Bonus</ThemedText>
                <ThemedText style={styles.breakdownValue}>+{rewards.tierBonus}</ThemedText>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.breakdownItem}>
              <ThemedText style={styles.totalLabel}>Total Points</ThemedText>
              <ThemedText style={styles.totalValue}>{totalPoints.toLocaleString()}</ThemedText>
            </View>
          </View>

          {/* Payment Method Offers */}
          {payments.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="wallet-outline" size={18} color={colors.brand.purpleLight} />
                <ThemedText style={styles.sectionTitle}>Payment Offers</ThemedText>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.paymentOffersScroll}
              >
                {payments.map(payment => (
                  <View key={payment.id} style={styles.paymentCard}>
                    <View style={[styles.paymentIcon, { backgroundColor: `${payment.color}15` }]}>
                      <Ionicons name={payment.icon} size={20} color={payment.color} />
                    </View>
                    <ThemedText style={styles.paymentMethod} numberOfLines={1}>
                      {payment.paymentMethod}
                    </ThemedText>
                    <View style={styles.paymentOfferBadge}>
                      <ThemedText style={styles.paymentOfferText}>{payment.offer}</ThemedText>
                    </View>
                    <ThemedText style={styles.paymentValue}>
                      {currencySymbol}{payment.cashbackValue.toFixed(0)}
                    </ThemedText>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Special Offers */}
          {specialOffers.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pricetag-outline" size={18} color={colors.error} />
                <ThemedText style={styles.sectionTitle}>Special Offers</ThemedText>
              </View>

              {specialOffers.map(offer => (
                <View key={offer.id} style={styles.specialOfferCard}>
                  <View style={[styles.offerIcon, { backgroundColor: `${offer.color}15` }]}>
                    <Ionicons name={offer.icon} size={18} color={offer.color} />
                  </View>
                  <View style={styles.offerContent}>
                    <ThemedText style={styles.offerTitle}>{offer.title}</ThemedText>
                    <ThemedText style={styles.offerDescription}>{offer.description}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Terms & Conditions */}
          <View style={styles.termsSection}>
            <Pressable style={styles.termsButton}>
              <Ionicons name="document-text-outline" size={16} color={colors.brand.purpleLight} />
              <ThemedText style={styles.termsButtonText}>Terms & Conditions Apply</ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    marginBottom: 8,
  },

  // Main Card
  mainCard: {
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  mainCardContent: {
    gap: 12,
  },

  // Cashback Section
  cashbackSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cashbackInfo: {
    flex: 1,
  },
  cashbackLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  cashbackAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 2,
  },
  cashbackDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Expand Button
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },

  // Details Container
  detailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },

  // Breakdown
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    flex: 1,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  breakdownNote: {
    fontSize: 12,
    color: colors.neutral[400],
    fontStyle: 'italic',
    marginTop: 4,
  },
  bonusBadge: {
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bonusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.amberDark,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: 8,
  },

  // Total
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.purpleLight,
  },

  // Payment Offers
  paymentOffersScroll: {
    gap: 12,
  },
  paymentCard: {
    width: 140,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: 8,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  paymentMethod: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[700],
    textAlign: 'center',
  },
  paymentOfferBadge: {
    backgroundColor: colors.tint.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'center',
  },
  paymentOfferText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.successScale[400],
    textAlign: 'center',
  },

  // Special Offers
  specialOfferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  offerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerContent: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  offerDescription: {
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
  },

  // Terms
  termsSection: {
    alignItems: 'center',
    paddingTop: 8,
  },
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  termsButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.brand.purpleLight,
    textDecorationLine: 'underline',
  },
});

export default React.memo(CashbackRewardsCard);
