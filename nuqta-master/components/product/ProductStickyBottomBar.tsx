/**
 * ProductStickyBottomBar Component
 *
 * Sticky bottom bar for ProductPage showing:
 * - Price info (current price, original price, lock fee)
 * - Lock Now button connected to lock functionality
 *
 * Replaces the default bottom navigation on ProductPage
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LOCK_FEE_PERCENTAGES } from './DurationChips';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface ProductStickyBottomBarProps {
  /** Current product price */
  price: number;
  /** Original price (for strikethrough) */
  originalPrice?: number;
  /** Currency symbol */
  currency?: string;
  /** Whether product is already locked */
  isLocked?: boolean;
  /** Callback when Lock Now button is pressed */
  onLockPress: () => void;
  /** Callback when Add to Cart button is pressed */
  onAddToCart?: () => void;
  /** Whether the component is visible */
  visible?: boolean;
  /** Current quantity */
  quantity?: number;
  /** Callback when quantity changes */
  onQuantityChange?: (qty: number) => void;
  /** Maximum allowed quantity */
  maxQuantity?: number;
}

export const ProductStickyBottomBar: React.FC<ProductStickyBottomBarProps> = ({
  price,
  originalPrice,
  currency,
  isLocked = false,
  onLockPress,
  onAddToCart,
  visible = true,
  quantity = 1,
  onQuantityChange,
  maxQuantity = 99,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const locale = getLocale();
  const currencySymbol = currency || getCurrencySymbol();
  const insets = useSafeAreaInsets();

  // Calculate lock fee (using default 4hr = 10%)
  const lockFeePercentage = LOCK_FEE_PERCENTAGES[4]; // 10%
  const lockFee = Math.ceil((price * lockFeePercentage) / 100);

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* Left: Price Info */}
      <View style={styles.priceSection}>
        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>
            {currencySymbol}{price.toLocaleString(locale)}
          </Text>
          {originalPrice && originalPrice > price && (
            <Text style={styles.originalPrice}>
              {currencySymbol}{originalPrice.toLocaleString(locale)}
            </Text>
          )}
        </View>
        <Text style={styles.lockFeeText}>
          Lock for just {currencySymbol}{lockFee.toLocaleString(locale)}
        </Text>
      </View>

      {/* Center: Quantity Selector */}
      {onQuantityChange && (
        <View style={styles.quantitySection}>
          <Pressable
            style={[styles.qtyButton, quantity <= 1 && styles.qtyButtonDisabled]}
            onPress={() => quantity > 1 && onQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
           
          >
            <Ionicons name="remove" size={18} color={quantity <= 1 ? colors.neutral[300] : colors.neutral[700]} />
          </Pressable>
          <Text style={styles.qtyText}>{quantity}</Text>
          <Pressable
            style={[styles.qtyButton, quantity >= maxQuantity && styles.qtyButtonDisabled]}
            onPress={() => quantity < maxQuantity && onQuantityChange(quantity + 1)}
            disabled={quantity >= maxQuantity}
           
          >
            <Ionicons name="add" size={18} color={quantity >= maxQuantity ? colors.neutral[300] : colors.neutral[700]} />
          </Pressable>
        </View>
      )}

      {/* Right: Lock Now Button */}
      <Pressable
        style={styles.lockButton}
        onPress={onLockPress}
       
        disabled={isLocked}
      >
        <LinearGradient
          colors={isLocked ? [colors.neutral[400], colors.neutral[500]] : [colors.nileBlue, '#0f2636']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.lockButtonGradient}
        >
          <Ionicons
            name={isLocked ? 'checkmark-circle' : 'lock-closed'}
            size={18}
            color={colors.background.primary}
          />
          <Text style={styles.lockButtonText}>
            {isLocked ? 'Locked' : 'Lock Now'}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 -3px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },

  // Price Section (Left)
  priceSection: {
    flex: 1,
    marginRight: 16,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },

  currentPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral[900],
    letterSpacing: -0.5,
  },

  originalPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },

  lockFeeText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.lightMustard,
    marginTop: 2,
  },

  // Quantity Section (Center)
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
    marginRight: 12,
  },
  qtyButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonDisabled: {
    opacity: 0.4,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    minWidth: 24,
    textAlign: 'center',
  },

  // Lock Button (Right)
  lockButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  lockButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },

  lockButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.3,
  },
});

export default React.memo(ProductStickyBottomBar);
