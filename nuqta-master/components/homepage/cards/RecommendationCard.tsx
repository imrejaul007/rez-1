// @ts-nocheck
import React, { useMemo, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { RecommendationCardProps } from '@/types/homepage.types';
import { useCartState, useCartActions } from '@/stores/selectors';
import { useWishlist } from '@/contexts/WishlistContext';
import StockBadge from '@/components/common/StockBadge';
import { useStockStatus } from '@/hooks/useStockStatus';
import { useStockNotifications } from '@/hooks/useStockNotifications';
import FastImage from '@/components/common/FastImage';
import { formatPrice } from '@/utils/priceFormatter';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function RecommendationCard({
  recommendation,
  onPress,
  onAddToCart,
  width = 230,
  showReason = true
}: RecommendationCardProps) {
  const cartState = useCartState();
  const cartActions = useCartActions();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { subscribe, subscribing } = useStockNotifications();
  const [isTogglingWishlist, setIsTogglingWishlist] = React.useState(false);
  const isMounted = useIsMounted();

  // Stock status
  const stock = recommendation.inventory?.stock ?? (recommendation.availabilityStatus === 'out_of_stock' ? 0 : 100);
  const lowStockThreshold = recommendation.inventory?.lowStockThreshold ?? 5;
  const { isOutOfStock, isLowStock, canAddToCart: canAddToCartStock } = useStockStatus({
    stock,
    lowStockThreshold,
  });

  // Check if product is in cart and get quantity
  const { productId, cartItem, quantityInCart, isInCart } = useMemo(() => {
    const id = recommendation._id || recommendation.id;
    const item = cartState.items.find(i => i.productId === id);
    const qty = item?.quantity || 0;
    const inCart = qty > 0;

    return {
      productId: id,
      cartItem: item,
      quantityInCart: qty,
      isInCart: inCart
    };
  }, [recommendation._id, recommendation.id, cartState.items]);
  // Get currency from recommendation data
  const productCurrency = useMemo(() => {
    return recommendation.price?.currency || recommendation.pricing?.currency || 'INR';
  }, [recommendation.price?.currency, recommendation.pricing?.currency]);

  // Memoize price formatting - uses product's currency
  const formattedCurrentPrice = useMemo(() => {
    return formatPrice(recommendation.price.current, productCurrency, false) || `${recommendation.price.current}`;
  }, [recommendation.price.current, productCurrency]);

  const formattedOriginalPrice = useMemo(() => {
    if (!recommendation.price.original) return null;
    return formatPrice(recommendation.price.original, productCurrency, false) || `${recommendation.price.original}`;
  }, [recommendation.price.original, productCurrency]);

  // Memoize discount calculation
  const discountPercentage = useMemo(() => {
    if (recommendation.price.discount) {
      return recommendation.price.discount;
    }
    if (recommendation.price.original && recommendation.price.original > recommendation.price.current) {
      return Math.round(((recommendation.price.original - recommendation.price.current) / recommendation.price.original) * 100);
    }
    return 0;
  }, [recommendation.price.discount, recommendation.price.original, recommendation.price.current]);

  // Memoize recommendation score percentage
  const scorePercentage = useMemo(() => {
    return Math.round(recommendation.recommendationScore * 100);
  }, [recommendation.recommendationScore]);

  const handleToggleWishlist = useCallback(async (e: any) => {
    e.stopPropagation();

    if (isTogglingWishlist) return;

    setIsTogglingWishlist(true);
    try {
      const inWishlist = isInWishlist(productId);

      if (inWishlist) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist({
          productId,
          productName: recommendation.name,
          productImage: recommendation.image,
          price: recommendation.price.current,
          originalPrice: recommendation.price.original,
          discount: discountPercentage,
          rating: recommendation.rating?.value || 0,
          reviewCount: recommendation.rating?.count || 0,
          brand: recommendation.brand,
          category: recommendation.category || 'General',
          availability: isOutOfStock ? 'OUT_OF_STOCK' : isLowStock ? 'LIMITED' : 'IN_STOCK',
        });
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsTogglingWishlist(false);
    }
  }, [isTogglingWishlist, productId, isInWishlist, removeFromWishlist, addToWishlist, recommendation, discountPercentage, isOutOfStock, isLowStock]);

  // Memoize accessibility label
  const recommendationLabel = useMemo(() => {
    const stockStatus = isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'In stock';
    const wishlistStatus = isInWishlist(productId) ? 'in wishlist' : 'not in wishlist';

    return `Recommended for you. ${recommendation.brand} ${recommendation.name}. Price ${formattedCurrentPrice}${formattedOriginalPrice ? `. Was ${formattedOriginalPrice}` : ''}${discountPercentage > 0 ? `. ${discountPercentage}% off` : ''}${recommendation.rating ? `. ${recommendation.rating.value} stars, ${recommendation.rating.count} reviews` : ''}. ${scorePercentage}% match based on ${recommendation.recommendationReason}. ${stockStatus}${recommendation.cashback ? `. Up to ${recommendation.cashback.percentage}% cashback` : ''}. ${wishlistStatus}`;
  }, [recommendation, formattedCurrentPrice, formattedOriginalPrice, discountPercentage, scorePercentage, isOutOfStock, isLowStock, isInWishlist, productId]);

  // Memoize the main onPress callback
  const handlePress = useCallback(() => {
    onPress(recommendation);
  }, [onPress, recommendation]);

  // Memoize notify me callback
  const handleNotifyMe = useCallback((e: any) => {
    e.stopPropagation();
    subscribe(productId, 'push');
  }, [subscribe, productId]);

  // Memoize quantity decrease callback
  const handleDecreaseQuantity = useCallback(async (e: any) => {
    e.stopPropagation();
    if (quantityInCart > 1) {
      await cartActions.updateQuantity(cartItem!.id, quantityInCart - 1);
    } else {
      await cartActions.removeItem(cartItem!.id);
    }
  }, [quantityInCart, cartItem, cartActions]);

  // Memoize quantity increase callback
  const handleIncreaseQuantity = useCallback(async (e: any) => {
    e.stopPropagation();
    if (quantityInCart < stock) {
      await cartActions.updateQuantity(cartItem!.id, quantityInCart + 1);
    }
  }, [quantityInCart, stock, cartItem, cartActions]);

  // Memoize add to cart callback
  const handleAddToCart = useCallback((e: any) => {
    e.stopPropagation();
    if (canAddToCartStock && onAddToCart) {
      onAddToCart(recommendation);
    }
  }, [canAddToCartStock, onAddToCart, recommendation]);

  // Memoize formatted rating
  const formattedRating = useMemo(() => {
    if (!recommendation.rating) return null;
    return typeof recommendation.rating.value === 'number'
      ? recommendation.rating.value.toFixed(1)
      : recommendation.rating.value;
  }, [recommendation.rating]);

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={handlePress}
     
      accessibilityLabel={recommendationLabel}
      accessibilityRole="button"
      accessibilityHint="Double tap to view recommended product details"
    >
      <ThemedView style={styles.card}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <FastImage
            source={recommendation.image}
            style={styles.image}
            resizeMode="cover"
            showLoader={true}
          />
          {discountPercentage > 0 && (
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>
                {discountPercentage}% OFF
              </ThemedText>
            </View>
          )}
          {(recommendation.inventory || isOutOfStock || isLowStock) && (
            <View style={styles.stockBadgeContainer}>
              <StockBadge
                stock={stock}
                lowStockThreshold={lowStockThreshold}
                variant="compact"
              />
            </View>
          )}

          {/* Wishlist Heart Button */}
          <Pressable
            style={styles.wishlistButton}
            onPress={handleToggleWishlist}
            disabled={isTogglingWishlist}
           
          >
            <Ionicons
              name={isInWishlist(productId) ? "heart" : "heart-outline"}
              size={20}
              color={isInWishlist(productId) ? colors.lightMustard : colors.background.primary}
            />
          </Pressable>
        </View>

        {/* Product Details */}
        <View style={styles.content}>
          <ThemedText style={styles.brand} numberOfLines={1}>
            {recommendation.brand}
          </ThemedText>
          
          <ThemedText style={styles.name} numberOfLines={2}>
            {recommendation.name}
          </ThemedText>

          {/* Recommendation Reason */}
          {showReason && (
            <View style={styles.reasonContainer}>
              <Ionicons name="bulb-outline" size={12} color={colors.lightMustard} />
              <ThemedText style={styles.reasonText} numberOfLines={1}>
                {recommendation.recommendationReason}
              </ThemedText>
            </View>
          )}

          {/* Price Information */}
          <View style={styles.priceContainer}>
            <ThemedText style={styles.currentPrice}>
              {formattedCurrentPrice}
            </ThemedText>
            {formattedOriginalPrice && (
              <ThemedText style={styles.originalPrice}>
                {formattedOriginalPrice}
              </ThemedText>
            )}
          </View>

          {/* Rating */}
          {recommendation.rating && formattedRating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color={colors.warningScale[400]} />
              <ThemedText style={styles.ratingText}>
                {formattedRating}
              </ThemedText>
              <ThemedText style={styles.ratingCount}>
                ({recommendation.rating.count})
              </ThemedText>
            </View>
          )}

          {/* Cashback */}
          {recommendation.cashback && (
            <View style={styles.cashbackContainer}>
              <ThemedText style={styles.cashbackText}>
                Upto {recommendation.cashback.percentage}% cash back
              </ThemedText>
            </View>
          )}

          {/* Recommendation Score Indicator */}
          <View style={styles.scoreContainer}>
            <View style={styles.scoreBar}>
              <View
                style={[
                  styles.scoreProgress,
                  { width: `${scorePercentage}%` }
                ]}
              />
            </View>
            <ThemedText style={styles.scoreText}>
              {scorePercentage}% match
            </ThemedText>
          </View>

          {/* Add to Cart Button / Quantity Controls */}
          {onAddToCart && (
            <>
              {isOutOfStock ? (
                // Notify Me Button when out of stock
                <Pressable
                  style={[
                    styles.notifyMeButton,
                    subscribing[productId] && styles.notifyMeButtonDisabled
                  ]}
                  key="notify-me-button"
                  onPress={handleNotifyMe}
                 
                  disabled={subscribing[productId]}
                >
                  <Ionicons name="notifications-outline" size={18} color={colors.lightMustard} />
                  <ThemedText style={styles.notifyMeText}>
                    {subscribing[productId] ? 'Subscribing...' : 'Notify Me'}
                  </ThemedText>
                </Pressable>
              ) : isInCart ? (
                // Quantity Controls (Flipkart style)
                <View style={styles.quantityControls} key="quantity-controls">
                  <Pressable
                    style={styles.quantityButton}
                    onPress={handleDecreaseQuantity}
                   
                  >
                    <Ionicons name="remove" size={18} color={colors.background.primary} />
                  </Pressable>

                  <View style={styles.quantityDisplay}>
                    <ThemedText style={styles.quantityText}>{quantityInCart}</ThemedText>
                  </View>

                  <Pressable
                    style={[
                      styles.quantityButton,
                      quantityInCart >= stock && styles.quantityButtonDisabled
                    ]}
                    onPress={handleIncreaseQuantity}
                   
                    disabled={quantityInCart >= stock}
                  >
                    <Ionicons name="add" size={18} color={colors.background.primary} />
                  </Pressable>
                </View>
              ) : (
                // Add to Cart Button
                <Pressable
                  style={[
                    styles.addToCartButton,
                    !canAddToCartStock && styles.addToCartButtonDisabled
                  ]}
                  key="add-to-cart-button"
                  onPress={handleAddToCart}
                 
                  disabled={!canAddToCartStock}
                >
                  <Ionicons name="add-circle" size={18} color={colors.background.primary} />
                  <ThemedText style={styles.addToCartText}>Add to Cart</ThemedText>
                </Pressable>
              )}
            </>
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

export default React.memo(RecommendationCard);

const styles = StyleSheet.create({
  container: {
    // Container styles handled by parent
    flex: 0,
    flexShrink: 0,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 8px 24px rgba(11, 34, 64, 0.08)',
      },
    }),
    position: 'relative',
    height: 400,
  },
  imageContainer: {
    position: 'relative',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.brand.goldWarm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stockBadgeContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  discountText: {
    color: colors.nileBlue,
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: 12,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 12,
    color: colors.nileBlue,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
    marginBottom: 6,
    lineHeight: 18,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    backgroundColor: '#E8F5F1',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  reasonText: {
    fontSize: 11,
    color: colors.neutral[500],
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  ratingCount: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  cashbackContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  cashbackText: {
    fontSize: 11,
    color: colors.nileBlue,
    fontWeight: '600',
  },
  scoreContainer: {
    marginBottom: 10,
  },
  scoreBar: {
    height: 3,
    backgroundColor: colors.neutral[200],
    borderRadius: 2,
    marginBottom: 2,
  },
  scoreProgress: {
    height: '100%',
    backgroundColor: colors.lightMustard,
    borderRadius: 2,
  },
  scoreText: {
    fontSize: 10,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.lightMustard,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addToCartText: {
    fontSize: 12,
    color: colors.background.primary,
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lightMustard,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 12,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityDisplay: {
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 14,
    color: colors.background.primary,
    fontWeight: '600',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  addToCartButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.brand.goldRich,
  },
  notifyMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.background.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.lightMustard,
  },
  notifyMeText: {
    fontSize: 12,
    color: colors.lightMustard,
    fontWeight: '600',
  },
  notifyMeButtonDisabled: {
    opacity: 0.5,
  },
});