/**
 * LockProductSection Component
 *
 * Inline lock section that replaces the modal approach
 * Features:
 * - "Lock this product now" header with badge
 * - Description of lock feature
 * - Duration selection chips (2hr/4hr/8hr)
 * - Lock button
 * - "What happens after locking" info
 * - "Price Protected" badge
 *
 * Based on reference design from ProductPage redesign
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { triggerImpact, triggerNotification } from '@/utils/haptics';
import { useIsAuthenticated, useCartActions, useGetCurrencySymbol, useGetLocale, useAvailableBalance, useRefreshWallet } from '@/stores/selectors';
import cartService from '@/services/cartApi';
import DurationChips, {
  LockDuration,
  LOCK_FEE_PERCENTAGES,
  calculateLockFee,
} from './DurationChips';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface LockProductSectionProps {
  /** Product ID */
  productId: string;
  /** Product name */
  productName: string;
  /** Product price */
  productPrice: number;
  /** Quantity */
  quantity: number;
  /** Variant (optional) */
  variant?: { type: string; value: string };
  /** Currency symbol */
  currency?: string;
  /** Callback on successful lock */
  onLockSuccess?: (lockDetails: {
    lockFee: number;
    duration: number;
    expiresAt: string;
    message: string;
  }) => void;
  /** Callback to add to cart without lock */
  onAddToCart?: () => void;
  /** Custom style */
  style?: any;
}

// What happens after locking - info items
const LOCK_INFO_ITEMS = [
  { number: 1, text: 'Product is reserved under your name' },
  { number: 2, text: 'Price is locked — no changes' },
  { number: 3, text: 'Store is notified instantly' },
  { number: 4, text: 'You choose how to complete purchase' },
];

export const LockProductSection: React.FC<LockProductSectionProps> = ({
  productId,
  productName,
  productPrice,
  quantity,
  variant,
  currency,
  onLockSuccess,
  onAddToCart,
  style,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const locale = getLocale();
  const currencySymbol = currency || getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const availableBalance = useAvailableBalance();
  const refreshWallet = useRefreshWallet();
  const cartActions = useCartActions();

  // Check if product is already in cart (this is the source of truth)
  const isInCart = cartActions.isItemInCart(productId);

  const [selectedDuration, setSelectedDuration] = useState<LockDuration>(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const isMounted = useIsMounted();

  const totalPrice = productPrice * quantity;
  const lockFee = calculateLockFee(totalPrice, selectedDuration);
  const walletBalance = availableBalance || 0;
  const hasEnoughBalance = walletBalance >= lockFee;

  // Refresh wallet on mount
  useEffect(() => {
    refreshWallet();
  }, []);

  const handleLock = useCallback(async () => {
    if (!hasEnoughBalance) {
      setError(`Insufficient wallet balance. You need ${currencySymbol}${lockFee} but have ${currencySymbol}${walletBalance}`);
      return;
    }

    if (!isAuthenticated) {
      setError('Please login to lock this product');
      return;
    }

    setIsLoading(true);
    setError(null);
    triggerImpact('Medium');

    try {
      const response = await cartService.lockItemWithPayment({
        productId,
        quantity,
        variant,
        duration: selectedDuration as any, // Backend will be updated to accept 2|4|8
        paymentMethod: 'wallet',
      });

      if (response.success && response.data) {
        triggerNotification('Success');
        onLockSuccess?.({
          lockFee: response.data.lockDetails.lockFee,
          duration: response.data.lockDetails.duration,
          expiresAt: response.data.lockDetails.expiresAt,
          message: response.data.lockDetails.message,
        });
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to lock item');
        triggerNotification('Error');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to lock item. Please try again.');
      triggerNotification('Error');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, [
    productId,
    quantity,
    variant,
    selectedDuration,
    hasEnoughBalance,
    lockFee,
    walletBalance,
    isAuthenticated,
    onLockSuccess,
    currency,
  ]);

  // Handler for adding to cart without lock
  const handleAddToCart = useCallback(async () => {
    if (!onAddToCart || isAddingToCart || isInCart) return;

    setIsAddingToCart(true);
    try {
      await onAddToCart();
      if (!isMounted()) return;
      setIsAddingToCart(false);
      triggerNotification('Success');
    } catch (err) {
      triggerNotification('Error');
      if (!isMounted()) return;
      setIsAddingToCart(false);
    }
  }, [onAddToCart, isAddingToCart, isInCart]);

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <Pressable
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
       
      >
        <View style={styles.headerLeft}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={20} color={colors.lightMustard} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Lock this product now</Text>
            <View style={styles.badgeRow}>
              <View style={styles.uniqueBadge}>
                <Text style={styles.uniqueBadgeText}>Unique Feature</Text>
              </View>
            </View>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.neutral[500]}
        />
      </Pressable>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Description */}
          <View style={styles.descriptionCard}>
            <Text style={styles.description}>
              Pay just <Text style={styles.descriptionHighlight}>{LOCK_FEE_PERCENTAGES[selectedDuration]}%</Text> to reserve this product for a few hours. Visit the store or choose delivery later — <Text style={styles.descriptionHighlight}>price stays locked.</Text>
            </Text>
          </View>

          {/* Duration Chips */}
          <DurationChips
            selectedDuration={selectedDuration}
            onSelectDuration={setSelectedDuration}
            productPrice={totalPrice}
            currency={currencySymbol}
            style={styles.durationChips}
          />

          {/* Lock Button */}
          <Pressable
            style={[
              styles.lockButton,
              (!hasEnoughBalance || isLoading) && styles.lockButtonDisabled,
            ]}
            onPress={handleLock}
            disabled={!hasEnoughBalance || isLoading}
           
          >
            <LinearGradient
              colors={hasEnoughBalance && !isLoading ? [colors.lightMustard, colors.brand.goldRich] : [colors.neutral[400], colors.neutral[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.lockButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.background.primary} />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={18} color={colors.background.primary} />
                  <Text style={styles.lockButtonText}>
                    Lock Product for {currencySymbol}{lockFee.toLocaleString(locale)}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Insufficient Balance Warning */}
          {!hasEnoughBalance && (
            <View style={styles.insufficientBalanceSection}>
              <View style={styles.warningCard}>
                <Ionicons name="wallet-outline" size={18} color={colors.warningScale[400]} />
                <Text style={styles.warningText}>
                  Add {currencySymbol}{(lockFee - walletBalance).toFixed(0)} to your wallet to lock this price
                </Text>
              </View>

              {/* Divider with OR */}
              <View style={styles.orDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Add to Cart without Lock */}
              <Pressable
                style={[
                  styles.addToCartButton,
                  isInCart && styles.addToCartButtonSuccess,
                ]}
                onPress={handleAddToCart}
               
                disabled={isAddingToCart || isInCart}
              >
                {isAddingToCart ? (
                  <ActivityIndicator size="small" color={colors.nileBlue} />
                ) : isInCart ? (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={colors.brand.greenDark} />
                    <Text style={styles.addToCartTextSuccess}>Added to Cart</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="cart-outline" size={20} color={colors.nileBlue} />
                    <Text style={styles.addToCartText}>Add to Cart without Lock</Text>
                  </>
                )}
              </Pressable>
              {!isInCart && (
                <Text style={styles.addToCartHint}>
                  Price may change • No reservation
                </Text>
              )}
              {isInCart && (
                <Text style={styles.addToCartSuccessHint}>
                  Product added! Go to cart to checkout.
                </Text>
              )}
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* What happens after locking */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>What happens after locking:</Text>
            {LOCK_INFO_ITEMS.map((item) => (
              <View key={item.number} style={styles.infoItem}>
                <View style={styles.infoNumber}>
                  <Text style={styles.infoNumberText}>{item.number}</Text>
                </View>
                <Text style={styles.infoText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* Price Protected Badge */}
          <View style={styles.protectedBadge}>
            <Ionicons name="shield-checkmark" size={18} color={colors.lightMustard} />
            <Ionicons name="lock-closed" size={14} color={colors.warningScale[400]} style={{ marginLeft: -4 }} />
            <Text style={styles.protectedText}>Price Protected</Text>
          </View>
        </View>
      )}

      {/* Collapsed Preview */}
      {!isExpanded && (
        <View style={styles.collapsedPreview}>
          <Text style={styles.collapsedText}>
            Pay {LOCK_FEE_PERCENTAGES[4]}% to reserve • Price stays locked
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E8F5EE',
    overflow: 'hidden',
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.successScale[50],
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  lockIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
    letterSpacing: -0.3,
  },

  badgeRow: {
    flexDirection: 'row',
  },

  uniqueBadge: {
    backgroundColor: colors.tint.amber,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  uniqueBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warningScale[400],
  },

  // Content
  content: {
    padding: 16,
    paddingTop: 0,
  },

  descriptionCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  description: {
    fontSize: 14,
    color: colors.neutral[600],
    lineHeight: 22,
  },

  descriptionHighlight: {
    fontWeight: '700',
    color: colors.lightMustard,
  },

  durationChips: {
    marginBottom: 16,
  },

  // Lock Button
  lockButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  lockButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0,
  },

  lockButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },

  lockButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.2,
  },

  // Insufficient Balance Section
  insufficientBalanceSection: {
    marginBottom: 12,
  },

  // Warning/Error Cards
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amber,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },

  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.brand.amberDeep,
    fontWeight: '500',
  },

  // OR Divider
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral[200],
  },

  orText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[400],
    marginHorizontal: 12,
  },

  // Add to Cart Button
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },

  addToCartText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.nileBlue,
  },

  addToCartHint: {
    fontSize: 11,
    color: colors.neutral[400],
    textAlign: 'center',
    marginTop: 8,
  },

  addToCartButtonSuccess: {
    backgroundColor: colors.successScale[100],
    borderColor: colors.brand.greenDark,
  },

  addToCartTextSuccess: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brand.greenDark,
  },

  addToCartSuccessHint: {
    fontSize: 11,
    color: colors.brand.greenDark,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorScale[50],
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 12,
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },

  // Info Section
  infoSection: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 12,
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },

  infoNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.lightMustard,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[600],
  },

  // Protected Badge
  protectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint.greenLight,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.tint.green,
  },

  protectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.lightMustard,
  },

  // Collapsed Preview
  collapsedPreview: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  collapsedText: {
    fontSize: 13,
    color: colors.neutral[500],
  },
});

export default React.memo(LockProductSection);
