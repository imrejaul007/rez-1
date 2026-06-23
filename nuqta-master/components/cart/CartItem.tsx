// @ts-nocheck
import React, { useState} from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions} from 'react-native';
import Animated, { runOnJS, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { CartItemProps } from '@/types/cart';
import { useStockStatus } from '@/hooks/useStockStatus';
import StockBadge from '@/components/common/StockBadge';
import QuantitySelector from '@/components/cart/QuantitySelector';
import { useToast } from '@/hooks/useToast';
import { useCartActions, useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function CartItem({
  item,
  onRemove,
  onUpdateQuantity,
  showAnimation = true,
  hideQuantityControls = false,
}: CartItemProps) {
  const { width } = Dimensions.get('window');
  const isSmallScreen = width < 360;
  const scaleAnim = useSharedValue(1);
  const fadeAnim = useSharedValue(1);
  const [isUpdating, setIsUpdating] = useState(false);
  const isMounted = useIsMounted();
  const router = useRouter();

  // Cart context and toast
  const cartActions = useCartActions();
  const { showSuccess, showError } = useToast();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();

  // Stock status
  const stock = item.inventory?.stock ?? (item.availabilityStatus === 'out_of_stock' ? 0 : 100);
  const lowStockThreshold = item.inventory?.lowStockThreshold ?? 5;
  const { isOutOfStock, isLowStock, stockMessage } = useStockStatus({
    stock,
    lowStockThreshold,
  });

  const isAtMaxStock = (item.quantity || 1) >= stock;

  const handleDelete = () => {
    if (showAnimation) {
      scaleAnim.value = withTiming(0.8, { duration: 200 });
      fadeAnim.value = withTiming(0, { duration: 200 });
      onRemove(item.id);
    } else {
      onRemove(item.id);
    }
  };

  const handlePress = () => {
    scaleAnim.value = withSequence(withTiming(0.98, { duration: 100 }), withTiming(1, { duration: 100 }));
      // Navigate to ProductPage with proper parameters
      const productId = (item as any).productId || item.id;
      if (productId) {
        // Create card data object for ProductPage
        const cardData = {
          id: productId,
          name: item.name,
          price: item.price,
          originalPrice: item.originalPrice,
          image: item.image,
          category: item.category,
          store: (item as any).store,
          discount: (item as any).discount,
        };

        // Navigate to ProductPage with query params
        router.push({
          pathname: '/product-page',
          params: {
            cardId: productId,
            cardType: 'just_for_you',
            cardData: JSON.stringify(cardData),
          },
        });
      }
  };

  // Handle quantity change from QuantitySelector
  const handleQuantityChange = async (newQty: number) => {
    if (isUpdating) return;

    try {
      setIsUpdating(true);

      if (newQty === 0) {
        // Remove item when quantity reaches 0
        await cartActions.removeItem(item.id);
        showSuccess('Item removed from cart');
        // Call onRemove if provided for parent component updates
        if (onRemove) {
          onRemove(item.id);
        }
      } else {
        // Update quantity
        await cartActions.updateQuantity(item.id, newQty);
        showSuccess('Quantity updated');
        // Call onUpdateQuantity if provided for parent component updates
        if (onUpdateQuantity) {
          onUpdateQuantity(item.id, newQty);
        }
      }
    } catch (error) {
      showError('Failed to update quantity');
    } finally {
      if (!isMounted()) return;
      setIsUpdating(false);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <Pressable
        style={styles.card}
        onPress={handlePress}
       
        accessibilityLabel={`${item.name}, ${item.price} rupees`}
        accessibilityRole="button"
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {item.image && typeof item.image === 'string' && item.image.trim() !== '' ? (
            <CachedImage
              source={item.image}
              style={styles.productImage}
              contentFit="cover"
              onError={(e) => {

              }}
              accessibilityLabel={`Product image of ${item.name}`}
              accessibilityRole="image"
            />
          ) : (
            <View
              style={[styles.productImage, styles.placeholderImage]}
              accessibilityLabel="No product image available"
              accessible={true}
            >
              <Ionicons name="image-outline" size={32} color={colors.neutral[400]} />
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <View style={styles.topRow}>
            <View style={styles.nameAndPriceContainer}>
              <ThemedText
                style={[
                  styles.productName,
                  { fontSize: isSmallScreen ? 14 : 15 },
                ]}
                numberOfLines={2}
              >
                {item.name}
              </ThemedText>

              {/* Event Details - Show slot time, location, date for events */}
              {(item as any).isEvent && (item as any).metadata && (
                <View style={styles.eventDetails}>
                  {(item as any).metadata.slotTime && (
                    <View style={styles.eventDetailRow}>
                      <Ionicons name="time-outline" size={12} color={colors.neutral[500]} />
                      <ThemedText style={styles.eventDetailText}>
                        {(item as any).metadata.slotTime}
                      </ThemedText>
                    </View>
                  )}
                  {(item as any).metadata.location && (
                    <View style={styles.eventDetailRow}>
                      <Ionicons name="location-outline" size={12} color={colors.neutral[500]} />
                      <ThemedText style={styles.eventDetailText}>
                        {(item as any).metadata.location}
                      </ThemedText>
                    </View>
                  )}
                  {(item as any).metadata.date && (
                    <View style={styles.eventDetailRow}>
                      <Ionicons name="calendar-outline" size={12} color={colors.neutral[500]} />
                      <ThemedText style={styles.eventDetailText}>
                        {(item as any).metadata.date}
                      </ThemedText>
                    </View>
                  )}
                </View>
              )}

              {/* Price Display - Show lock fee breakdown ONLY if item has lockedQuantity */}
              {(() => {
                const lockedQty = (item as any).lockedQuantity || 0;
                const lockFeeDiscount = lockedQty > 0 ? (item.discount || 0) : 0;
                const hasOriginalPrice = item.originalPrice && item.originalPrice > item.price;
                const saleDiscount = hasOriginalPrice ? item.originalPrice - item.price : 0;

                // Case 1: Item has lock fee (was locked)
                if (lockFeeDiscount > 0) {
                  return (
                    <View style={styles.lockPriceContainer}>
                      <View style={styles.lockPriceRow}>
                        <ThemedText
                          style={[
                            styles.originalPriceStrike,
                            { fontSize: isSmallScreen ? 13 : 14 },
                          ]}
                        >
                          {currencySymbol}{item.price?.toLocaleString(locale) || 0}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.productPrice,
                            { fontSize: isSmallScreen ? 16 : 17, marginTop: 0 },
                          ]}
                        >
                          {currencySymbol}{(item.price - lockFeeDiscount)?.toLocaleString(locale) || 0}
                        </ThemedText>
                      </View>
                      <View style={styles.lockFeeBadge}>
                        <Ionicons name="lock-closed" size={10} color={colors.nileBlue} />
                        <ThemedText style={styles.lockFeeText}>
                          {currencySymbol}{lockFeeDiscount?.toLocaleString(locale)} paid at lock
                        </ThemedText>
                      </View>
                    </View>
                  );
                }

                // Case 2: Item has sale discount (originalPrice > price)
                if (hasOriginalPrice) {
                  return (
                    <View style={styles.lockPriceRow}>
                      <ThemedText
                        style={[
                          styles.originalPriceStrike,
                          { fontSize: isSmallScreen ? 13 : 14 },
                        ]}
                      >
                        {currencySymbol}{item.originalPrice?.toLocaleString(locale)}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.productPrice,
                          { fontSize: isSmallScreen ? 16 : 17, marginTop: 0 },
                        ]}
                      >
                        {currencySymbol}{item.price?.toLocaleString(locale) || 0}
                      </ThemedText>
                    </View>
                  );
                }

                // Case 3: Regular price (no discount)
                return (
                  <ThemedText
                    style={[
                      styles.productPrice,
                      { fontSize: isSmallScreen ? 16 : 17 },
                    ]}
                  >
                    {currencySymbol}{item.price?.toLocaleString(locale) || 0}
                  </ThemedText>
                );
              })()}
            </View>
          </View>

          {/* Bottom Row - Badges and Quantity */}
          <View style={styles.bottomRow}>
            <View style={styles.badgesRow}>
              {/* Stock Badge */}
              <StockBadge
                stock={stock}
                lowStockThreshold={lowStockThreshold}
                variant="default"
                showIcon={true}
              />

              {/* Cashback Badge */}
              {item.cashback && (
                <View style={styles.cashbackBadge}>
                  <Ionicons name="gift" size={12} color={colors.lightMustard} />
                  <ThemedText style={styles.cashbackText}>
                    {item.cashback}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Quantity Controls - Hide for services */}
            {onUpdateQuantity && !hideQuantityControls && (
              <QuantitySelector
                quantity={item.quantity || 1}
                min={0}
                max={stock > 0 ? stock : 99}
                onQuantityChange={handleQuantityChange}
                disabled={isUpdating || isOutOfStock}
                size="small"
              />
            )}

            {/* Delete Button - Show when no quantity controls or for services */}
            {(!onUpdateQuantity || hideQuantityControls) && (
              <Pressable
                style={styles.deleteButton}
                onPress={handleDelete}
               
                accessibilityLabel="Remove item from cart"
                accessibilityRole="button"
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            )}
          </View>

          {/* Quantity Warning - Show if cart quantity exceeds available stock */}
          {(item.quantity || 1) > stock && stock > 0 && (
            <View style={styles.quantityWarning}>
              <Ionicons name="alert-circle" size={12} color={colors.warningScale[700]} />
              <ThemedText style={styles.quantityWarningText}>
                Only {stock} available
              </ThemedText>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(CartItem);

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    shadowColor: colors.nileBlue, // Nile Blue shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 110,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)', // Mustard tint border
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  topRow: {
    flex: 1,
  },
  nameAndPriceContainer: {
    flex: 1,
  },
  productName: {
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 6,
    lineHeight: 20,
  },
  eventDetails: {
    marginTop: 4,
    marginBottom: 6,
    gap: 4,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDetailText: {
    fontSize: 11,
    color: colors.neutral[500],
    fontWeight: '400',
  },
  productPrice: {
    fontWeight: '800',
    color: colors.nileBlue, // Nile Blue for better readability
    marginTop: 4,
    fontSize: 17,
  },
  lockPriceContainer: {
    marginTop: 4,
  },
  lockPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPriceStrike: {
    fontWeight: '600',
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  lockFeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  lockFeeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  quantityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.tint.amberLight,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  quantityWarningText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warningScale[700],
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
  },
  cashbackText: {
    color: colors.nileBlue,
    fontWeight: '600',
    fontSize: 11,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    marginLeft: 8,
  },
});
