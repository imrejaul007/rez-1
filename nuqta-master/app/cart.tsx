// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { platformAlertSimple } from '@/utils/platformAlert';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ supports 'edges'

import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import CartHeader from '@/components/cart/CartHeader';
import SlidingTabs from '@/components/cart/SlidingTabs';
import CartItem from '@/components/cart/CartItem';
import LockedItem from '@/components/cart/LockedItem';
import PriceSection from '@/components/cart/PriceSection';
import CartValidation from '@/components/cart/CartValidation';
import StockWarningBanner from '@/components/cart/StockWarningBanner';
import CardOffersSection from '@/components/cart/CardOffersSection';
import { ThemedText } from '@/components/ThemedText';
import { CartItem as CartItemType, LockedProduct, LOCK_CONFIG } from '@/types/cart';
import {
  calculateTotal,
  getItemCount,
  calculateLockedTotal,
  getLockedItemCount,
  updateLockedProductTimers,
} from '@/utils/cartHelpers';
import { useCartValidation } from '@/hooks/useCartValidation';
import { useCartStore } from '@/stores/cartStore';
import { useTotalBalance, useWalletLoading, useIsAuthenticated } from '@/stores';
import CachedImage from '@/components/ui/CachedImage';
import cartApi from '@/services/cartApi';
import { CartItemSkeleton } from '@/components/common/SkeletonLoader';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

/**
 * Safe haptic wrapper — fails silently on devices without haptic support (e.g., web).
 */
const safeHaptic = (
  style: Haptics.NotificationFeedbackType | Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
) => {
  try {
    if (
      style === Haptics.ImpactFeedbackStyle.Light ||
      style === Haptics.ImpactFeedbackStyle.Medium ||
      style === Haptics.ImpactFeedbackStyle.Heavy
    ) {
      Haptics.impactAsync(style).catch(() => {});
    } else {
      Haptics.notificationAsync(style as Haptics.NotificationFeedbackType).catch(() => {});
    }
  } catch {
    // haptics not available — fail silently
  }
};

// Helper function to format time slot for display
const formatTimeSlot = (start: string, end?: string): string => {
  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const formattedStart = formatTime(start);
  if (end) {
    const formattedEnd = formatTime(end);
    return `${formattedStart} - ${formattedEnd}`;
  }
  return formattedStart;
};

function CartPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams<{ offerRedemptionCode?: string }>();
  const cartState = useCartStore((s) => s.state);
  const cartActions = useCartStore((s) => s.actions);
  const totalBalance = useTotalBalance();
  const walletLoading = useWalletLoading();
  const isAuthenticated = useIsAuthenticated();
  const [activeTab, setActiveTab] = useState<'products' | 'service' | 'lockedproduct'>('products');
  const [lockedProducts, setLockedProducts] = useState<LockedProduct[]>([]);

  // Cart validation state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showWarningBanner, setShowWarningBanner] = useState(true);

  // Use cart validation hook
  const {
    validationState,
    hasInvalidItems,
    canCheckout,
    invalidItemCount,
    warningCount,
    errorCount,
    validateCart,
    clearValidation,
    removeInvalidItems,
  } = useCartValidation({
    autoValidate: false, // Manual validation before checkout
    validationInterval: 0, // Disable periodic validation on cart page
    showToastNotifications: false, // We'll handle notifications via modal
  });

  // Use real cart items from CartContext - separate products and services
  const productItems = useMemo(() => {
    return cartState.items
      .filter(item => (item as any).itemType !== 'service') // Only non-service items
      .map(item => {
        // Preserve metadata for event items
        const metadata = (item as any).metadata || {};
        const isEvent = metadata.eventType === 'event';

        return {
          id: item.id,
          productId: (item as any).productId || item.id,
          name: item.name,
          image: item.image || '',
          price: item.discountedPrice || item.originalPrice || 0,
          originalPrice: item.originalPrice,
          cashback: isEvent ? '0' : `Upto 12% cash back`, // Events don't have cashback
          quantity: item.quantity,
          discount: (item as any).discount,
          variant: (item as any).variant,
          store: (item as any).store,
          category: 'products' as const,
          itemType: (item as any).itemType || 'product',
          // Preserve event metadata
          metadata: isEvent ? metadata : undefined,
          isEvent: isEvent,
        };
      });
  }, [cartState.items, cartState.isLoading, cartState.error]);

  // Service items from cart
  const serviceItems = useMemo(() => {
    return cartState.items
      .filter(item => (item as any).itemType === 'service')
      .map(item => {
        const bookingDetails = (item as any).serviceBookingDetails || {};
        const bookingDate = bookingDetails.bookingDate ? new Date(bookingDetails.bookingDate) : null;

        return {
          id: item.id,
          productId: (item as any).productId || item.id,
          name: item.name,
          image: item.image || '',
          price: item.discountedPrice || item.originalPrice || 0,
          originalPrice: item.originalPrice,
          cashback: '0', // Services typically don't have cashback
          quantity: item.quantity,
          discount: (item as any).discount,
          variant: (item as any).variant,
          store: (item as any).store,
          category: 'service' as const,
          itemType: 'service' as const,
          // Service booking details
          serviceBookingDetails: {
            bookingDate: bookingDate,
            timeSlot: bookingDetails.timeSlot,
            duration: bookingDetails.duration,
            serviceType: bookingDetails.serviceType,
            customerNotes: bookingDetails.customerNotes,
            customerName: bookingDetails.customerName,
            customerPhone: bookingDetails.customerPhone,
          },
          // Formatted display values
          bookingDateFormatted: bookingDate
            ? bookingDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            : '',
          bookingTimeFormatted: bookingDetails.timeSlot?.start
            ? formatTimeSlot(bookingDetails.timeSlot.start, bookingDetails.timeSlot.end)
            : '',
        };
      });
  }, [cartState.items, cartState.isLoading, cartState.error]);

  const currentItems = useMemo(() => {
    if (activeTab === 'products') return productItems;
    if (activeTab === 'service') return serviceItems;
    if (activeTab === 'lockedproduct') return lockedProducts;
    return [];
  }, [activeTab, productItems, serviceItems, lockedProducts]);

  const allItems = useMemo(() => [...productItems, ...serviceItems], [productItems, serviceItems]);

  // Use real cart totals from CartContext
  const overallTotal = useMemo(() => {
    // ✅ FIX: Add type checking and safe number conversion
    const cartTotal = typeof cartState.totalPrice === 'number' && !isNaN(cartState.totalPrice)
      ? cartState.totalPrice
      : 0;
    const lockedTotal = typeof calculateLockedTotal === 'function'
      ? calculateLockedTotal(lockedProducts)
      : 0;
    const total = cartTotal + lockedTotal;

    return total;
  }, [cartState.totalPrice, lockedProducts]);

  const overallItemCount = useMemo(() => {
    // ✅ FIX: Add type checking for item count calculation
    const cartCount = typeof cartState.totalItems === 'number' && !isNaN(cartState.totalItems)
      ? cartState.totalItems
      : 0;
    const lockedCount = typeof getLockedItemCount === 'function'
      ? getLockedItemCount(lockedProducts)
      : 0;

    return cartCount + lockedCount;
  }, [cartState.totalItems, lockedProducts]);

  // Function to load locked items
  const loadLockedItems = useCallback(async () => {
    try {
      const response = await cartApi.getLockedItems();
      if (response.success && response.data) {
        const formattedLockedItems = response.data.lockedItems.map((item: any) => {
          const productId = item.product?._id || item.product;
          const lockedAt = new Date(item.lockedAt);
          const expiresAt = new Date(item.expiresAt);
          const remainingTime = expiresAt.getTime() - Date.now();
          const lockDuration = expiresAt.getTime() - lockedAt.getTime();
          
          // Determine status based on remaining time
          const status: 'active' | 'expiring' | 'expired' = 
            remainingTime <= 0 ? 'expired' : 
            remainingTime <= 120000 ? 'expiring' : 
            'active';
          
          return {
            id: item._id || item.product?._id,
            productId: productId,
            name: item.product?.name || 'Product',
            price: item.lockedPrice,
            originalPrice: item.originalPrice,
            quantity: item.quantity,
            image: item.product?.images?.[0]?.url || item.product?.images?.[0],
            store: item.store?.name || 'Store',
            variant: item.variant,
            cashback: `Upto 12% cash back`,
            category: 'products' as const,
            lockedAt,
            expiresAt,
            remainingTime: Math.max(0, remainingTime),
            lockDuration,
            status,
            notes: item.notes,
            // Paid lock fields
            lockFee: item.lockFee,
            lockFeePercentage: item.lockFeePercentage,
            paymentMethod: item.paymentMethod,
            lockPaymentStatus: item.lockPaymentStatus,
            isPaidLock: item.isPaidLock,
          };
        });
        setLockedProducts(formattedLockedItems);
      }
    } catch (error) {
      // silently handle
    }
  }, []);

  // Load cart on mount
  useEffect(() => {
    const loadData = async () => {
      await cartActions.loadCart();
      await loadLockedItems();
    };
    loadData();
  }, [loadLockedItems]);

  // Reload locked items when page comes into focus
  useFocusEffect(
    useCallback(() => {
      loadLockedItems();
    }, [loadLockedItems])
  );

  const handleTabChange = (tabKey: 'products' | 'service' | 'lockedproduct') => {
    setActiveTab(tabKey);
  };

  const handleRemoveItem = useCallback(async (itemId: string) => {
    if (activeTab === 'products' || activeTab === 'service') {
      // Use CartContext to remove item (will sync with backend)
      await cartActions.removeItem(itemId);
    }
  }, [activeTab, cartActions]);

  const handleUpdateQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (activeTab === 'products') {
      await cartActions.updateQuantity(itemId, newQuantity);
    }
  }, [activeTab, cartActions]);

  const handleUnlockItem = useCallback(async (itemId: string, productId: string) => {
    if (!productId) {
      platformAlertSimple('Error', 'Product ID is missing');
      return;
    }

    try {
      const response = await cartApi.unlockItem(productId);

      if (response.success) {
        if (!isMounted()) return;
        setLockedProducts(prev => prev.filter(item => item.id !== itemId));
        platformAlertSimple('Success', 'Item unlocked successfully');
      } else {
        platformAlertSimple('Error', response.message || response.error || 'Failed to unlock item');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Unable to unlock item. Please try again.');
    }
  }, []);

  const handleMoveToCart = useCallback(async (itemId: string, productId: string) => {
    try {
      const response = await cartApi.moveLockedToCart(productId);
      if (response.success) {
        // Remove from locked items
        setLockedProducts(prev => prev.filter(item => item.id !== itemId));
        // Reload cart to show the moved item
        await cartActions.loadCart();
        // Switch to Products tab so user can see the moved item
        setActiveTab('products');
        platformAlertSimple(
          'Moved to Cart!',
          'Item has been moved to your cart at the locked price.'
        );
      } else {
        platformAlertSimple('Error', response.message || 'Failed to move item to cart');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Unable to move item to cart. Please try again.');
    }
  }, [cartActions]);

  const handleExpireItem = (itemId: string) => {
    setLockedProducts(prev => prev.filter(item => item.id !== itemId));
  };

  // Timer management for locked products
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Set up interval only once when component mounts or when we have locked products
    if (lockedProducts.length > 0 && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setLockedProducts(prev => {
          // Only update if there are still locked products
          if (prev.length === 0) return prev;

          const updated = updateLockedProductTimers(prev);

          // Only update state if something actually changed
          const hasChanges = updated.length !== prev.length ||
            updated.some((item, i) => item.remainingTime !== prev[i]?.remainingTime);

          return hasChanges ? updated : prev;
        });
      }, LOCK_CONFIG.UPDATE_INTERVAL);
    }

    // Clear interval if no locked products
    if (lockedProducts.length === 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [lockedProducts.length]); // Safe to ignore timeLeft changes


  const handleBuyNow = async () => {
    // Validate cart before proceeding to checkout
    const validationResult = await validateCart();

    if (!validationResult) {
      platformAlertSimple('Validation Error', 'Unable to validate cart. Please try again.');
      return;
    }

    // If there are any issues, show validation modal
    if (validationResult.issues.length > 0 || !validationResult.canCheckout) {
      if (!isMounted()) return;
      setShowValidationModal(true);
      return;
    }

    // If validation passed, proceed to checkout (pass offerRedemptionCode if present)
    if (params.offerRedemptionCode) {
      router.push({ pathname: '/checkout', params: { offerRedemptionCode: params.offerRedemptionCode } });
    } else {
      router.push('/checkout');
    }
  };

  const handleContinueToCheckout = () => {
    setShowValidationModal(false);

    // Only proceed if we have valid items
    if (validationState.validationResult?.validItems.length ?? 0 > 0) {
      // Pass offerRedemptionCode if present
      if (params.offerRedemptionCode) {
        router.push({ pathname: '/checkout', params: { offerRedemptionCode: params.offerRedemptionCode } });
      } else {
        router.push('/checkout');
      }
    } else {
      platformAlertSimple('Cannot Checkout', 'No valid items in cart to checkout');
    }
  };

  const handleRemoveInvalidItems = async () => {
    await removeInvalidItems();
    if (!isMounted()) return;
    setShowValidationModal(false);
  };

  const handleRefreshValidation = async () => {
    await validateCart();
  };

  const handleBackPress = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const renderCartItem = useCallback(({ item }: { item: CartItemType }) => {
    // Render locked item if on locked products tab
    if (activeTab === 'lockedproduct') {
      return (
        <View style={styles.cardWrapper}>
          <LockedItem
            item={item as any}
            onMoveToCart={handleMoveToCart}
            onUnlock={handleUnlockItem}
            showAnimation={true}
          />
        </View>
      );
    }

    // Render service item with booking details
    if (activeTab === 'service') {
      const serviceItem = item as any;
      return (
        <View style={styles.cardWrapper}>
          <CartItem
            item={item}
            onRemove={handleRemoveItem}
            onUpdateQuantity={handleUpdateQuantity}
            showAnimation={true}
            hideQuantityControls={true} // Services don't have quantity controls
          />
          {/* Service Booking Details */}
          {serviceItem.serviceBookingDetails && (
            <View style={styles.serviceBookingDetails}>
              <View style={styles.serviceBookingRow}>
                <ThemedText style={styles.serviceBookingIcon}>📅</ThemedText>
                <ThemedText style={styles.serviceBookingText}>
                  {serviceItem.bookingDateFormatted || 'Date not set'}
                </ThemedText>
              </View>
              <View style={styles.serviceBookingRow}>
                <ThemedText style={styles.serviceBookingIcon}>🕐</ThemedText>
                <ThemedText style={styles.serviceBookingText}>
                  {serviceItem.bookingTimeFormatted || 'Time not set'}
                </ThemedText>
              </View>
              {serviceItem.serviceBookingDetails.duration && (
                <View style={styles.serviceBookingRow}>
                  <ThemedText style={styles.serviceBookingIcon}>⏱️</ThemedText>
                  <ThemedText style={styles.serviceBookingText}>
                    {serviceItem.serviceBookingDetails.duration} min
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </View>
      );
    }

    // Render regular cart item
    return (
      <View style={styles.cardWrapper}>
        <CartItem
          item={item}
          onRemove={handleRemoveItem}
          onUpdateQuantity={handleUpdateQuantity}
          showAnimation={true}
        />
      </View>
    );
  }, [activeTab, handleMoveToCart, handleUnlockItem, handleRemoveItem, handleUpdateQuantity]);

  const renderEmptyState = () => {
    let title = "Your cart is empty 🛒";
    let subtitle = "Add some items to get started";
    let actionLabel: string | null = null;
    let onAction: (() => void) | null = null;

    if (activeTab === 'lockedproduct') {
      title = "No locked products 🔒";
      subtitle = "Lock products to reserve them at current price for 24 hours";
    } else if (activeTab === 'products') {
      subtitle = "Browse stores and add products to your cart to checkout.";
      actionLabel = 'Browse stores';
      onAction = () => {
        safeHaptic();
        router.push('/(tabs)');
      };
    } else if (activeTab === 'service') {
      subtitle = "Browse services and book a slot to see them here.";
      actionLabel = 'Browse services';
      onAction = () => {
        safeHaptic();
        router.push('/(tabs)');
      };
    }

    return (
      <View
        style={styles.emptyContainer}
        accessibilityRole="text"
        accessibilityLabel={`${title}. ${subtitle}`}
      >
        <ThemedText style={styles.emptyTitle}>{title}</ThemedText>
        <ThemedText style={styles.emptySubtitle}>{subtitle}</ThemedText>
        {actionLabel && onAction && (
          <Pressable
            style={styles.emptyActionButton}
            onPress={onAction}
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            accessibilityHint={`Double tap to ${actionLabel.toLowerCase()}`}
          >
            <Ionicons name="arrow-forward" size={16} color={Colors.text.inverse} />
            <ThemedText style={styles.emptyActionText}>{actionLabel}</ThemedText>
          </Pressable>
        )}
      </View>
    );
  };

  return (
   <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      <StatusBar barStyle="dark-content" backgroundColor={Colors.gold} />

      <CartHeader onBack={handleBackPress} />

      <SlidingTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Stock Warning Banner */}
      {showWarningBanner && validationState.validationResult && validationState.validationResult.issues.length > 0 && (
        <StockWarningBanner
          issues={validationState.validationResult.issues}
          onDismiss={() => setShowWarningBanner(false)}
          onViewDetails={() => setShowValidationModal(true)}
          autoHide={false}
        />
      )}

      <View style={styles.listContainer}>
        {cartState.isLoading && activeTab === 'products' ? (
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map(i => (
              <View key={i} style={{ paddingHorizontal: 16 }}>
                <CartItemSkeleton />
              </View>
            ))}
          </View>
        ) : (
          <FlashList
            data={currentItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              currentItems.length === 0 && styles.emptyListContent,
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={
              overallItemCount > 0 && overallTotal > 0 && activeTab === 'products' ? (
                <CardOffersSection
                  storeId={(productItems[0] as any)?.store?.id || (productItems[0] as any)?.storeId}
                  orderValue={overallTotal}
                  onOfferApplied={(offer) => {
                    // Apply card offer via cart context - will be passed to checkout
                    cartActions.setCardOffer(offer);
                  }}
                />
              ) : null
            }
            estimatedItemSize={100}
          />
        )}
      </View>

      {/* Wallet Balance Banner */}
      {overallItemCount > 0 && isAuthenticated && !walletLoading && totalBalance > 0 && (
        <Pressable
          style={styles.walletBanner}
          onPress={() => {
            safeHaptic(Haptics.ImpactFeedbackStyle.Medium);
            handleBuyNow();
          }}
          accessibilityLabel={`Apply ${BRAND.CURRENCY_CODE} ${totalBalance.toLocaleString()} wallet balance at checkout`}
          accessibilityRole="button"
          accessibilityHint="Double tap to apply your wallet balance and proceed to checkout"
        >
          <CachedImage
            source={BRAND.COIN_IMAGE}
            style={styles.walletBannerCoin}
            contentFit="contain"
          />
          <View style={styles.walletBannerTextContainer}>
            <ThemedText style={styles.walletBannerTitle}>
              {BRAND.CURRENCY_CODE} {totalBalance.toLocaleString()} available
            </ThemedText>
            <ThemedText style={styles.walletBannerSubtitle}>
              Apply at checkout
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.nileBlue} />
        </Pressable>
      )}

      {overallItemCount > 0 && (
        <PriceSection
          totalPrice={overallTotal}
          onBuyNow={handleBuyNow}
          itemCount={overallItemCount}
          loading={validationState.isValidating}
        />
      )}

      {/* Validation Modal */}
      <CartValidation
        visible={showValidationModal}
        validationResult={validationState.validationResult}
        loading={validationState.isValidating}
        onClose={() => setShowValidationModal(false)}
        onContinueToCheckout={handleContinueToCheckout}
        onRemoveInvalidItems={handleRemoveInvalidItems}
        onRefresh={handleRefreshValidation}
      />
    </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.linen, // Nuqta Linen background
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: Colors.nileBlue, // Nile Blue shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)', // Mustard tint
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.lightPeach, // Light Peach
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.nileBlue,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  emptyActionText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 16,
  },
  // Service booking details styles
  serviceBookingDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 205, 87, 0.3)', // Mustard tint
    backgroundColor: 'rgba(250, 241, 224, 0.5)', // Linen tint
    borderRadius: 12,
    padding: 12,
    marginHorizontal: -4,
  },
  serviceBookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceBookingIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  serviceBookingText: {
    ...Typography.bodySmall,
    color: Colors.nileBlue,
    fontWeight: '500',
  },
  walletBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 205, 87, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.4)',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  walletBannerCoin: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  walletBannerTextContainer: {
    flex: 1,
  },
  walletBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  walletBannerSubtitle: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 1,
  },
});

export default withErrorBoundary(CartPage, 'Cart');
