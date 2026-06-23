/**
 * PriceAndRewardsSection Component
 *
 * Comprehensive price display with rewards info:
 * - Original price with discount badge
 * - Nuqta Price (current price)
 * - You Save amount
 * - Earn Nuqta Coins card
 * - Cashback info
 * - Bonus coins for sharing
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface PriceAndRewardsSectionProps {
  /** Current selling price */
  price: number;
  /** Original/MRP price */
  originalPrice?: number;
  /** Currency symbol */
  currency?: string;
  /** Earnable coins (default: 10% of price) */
  earnableCoins?: number;
  /** Cashback amount */
  cashbackAmount?: number;
  /** Bonus coins for sharing */
  bonusCoins?: number;
}

export const PriceAndRewardsSection: React.FC<PriceAndRewardsSectionProps> = ({
  price,
  originalPrice,
  currency,
  earnableCoins,
  cashbackAmount,
  bonusCoins = 50,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const locale = getLocale();
  const currencySymbol = currency || getCurrencySymbol();
  // Calculate values
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
  const savingsAmount = hasDiscount ? originalPrice - price : 0;
  const coins = earnableCoins || Math.floor(price * 0.1);
  const cashback = cashbackAmount || Math.floor(price * 0.05);

  return (
    <View style={styles.container}>
      {/* Original Price & Discount Badge Row */}
      {hasDiscount && (
        <View style={styles.discountRow}>
          <Text style={styles.originalPrice}>
            {currencySymbol}{originalPrice.toLocaleString(locale)}
          </Text>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
          </View>
        </View>
      )}

      {/* Current Price */}
      <View style={styles.currentPriceRow}>
        <Text style={styles.currentPrice}>
          {currencySymbol}{price.toLocaleString(locale)}
        </Text>
        <Text style={styles.rezPriceLabel}>{BRAND.APP_NAME} Price</Text>
      </View>

      {/* You Save */}
      {savingsAmount > 0 && (
        <View style={styles.savingsCard}>
          <Ionicons name="checkmark-circle" size={18} color={colors.lightMustard} />
          <Text style={styles.savingsText}>
            You Save {currencySymbol}{savingsAmount.toLocaleString(locale)}
          </Text>
        </View>
      )}

      {/* Earn Nuqta Coins Card */}
      <LinearGradient
        colors={[colors.lightMustard, colors.nileBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.earnCoinsCard}
      >
        <View style={styles.earnCoinsContent}>
          <Ionicons name="wallet" size={20} color={colors.background.primary} />
          <View style={styles.earnCoinsText}>
            <Text style={styles.earnCoinsTitle}>
              {`Earn ${coins} ${BRAND.COIN_NAME}`}
            </Text>
            <Text style={styles.earnCoinsSubtitle}>
              Use on your next purchase
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Cashback Info */}
      <View style={styles.cashbackRow}>
        <View style={styles.cashbackIcon}>
          <Ionicons name="card-outline" size={18} color={colors.neutral[500]} />
        </View>
        <View style={styles.cashbackText}>
          <Text style={styles.cashbackTitle}>
            Cashback {currencySymbol}{cashback}
          </Text>
          <Text style={styles.cashbackSubtitle}>
            Instant credit to wallet
          </Text>
        </View>
      </View>

      {/* Bonus Coins for Sharing */}
      <View style={styles.bonusRow}>
        <Ionicons name="gift-outline" size={18} color={colors.warningScale[400]} />
        <Text style={styles.bonusText}>
          +{bonusCoins} bonus coins on sharing this product
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Discount Row
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },

  originalPrice: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },

  discountBadge: {
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warningScale[700],
  },

  // Current Price
  currentPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 12,
  },

  currentPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.neutral[900],
    letterSpacing: -1,
  },

  rezPriceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[500],
  },

  // Savings Card
  savingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.linen,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },

  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
  },

  // Earn Coins Card
  earnCoinsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  earnCoinsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  earnCoinsText: {
    flex: 1,
  },

  earnCoinsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 2,
  },

  earnCoinsSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Cashback Row
  cashbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },

  cashbackIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  cashbackText: {
    flex: 1,
  },

  cashbackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },

  cashbackSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral[500],
    marginTop: 1,
  },

  // Bonus Row
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.tint.amber,
    borderRadius: 10,
    marginTop: 8,
  },

  bonusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.amberDark,
    flex: 1,
  },
});

export default React.memo(PriceAndRewardsSection);
