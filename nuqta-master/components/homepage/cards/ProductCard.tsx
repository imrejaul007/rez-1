// @ts-nocheck
import React, { useMemo, useEffect, useState, useCallback, memo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ProductCardProps } from '@/types/homepage.types';
import { useCartState, useCartActions } from '@/stores/selectors';
import { useWishlist } from '@/contexts/WishlistContext';
import StockBadge from '@/components/common/StockBadge';
import RatingStars from '@/components/reviews/RatingStars';
import { useStockStatus } from '@/hooks/useStockStatus';
import { useStockNotifications } from '@/hooks/useStockNotifications';
import { useToast } from '@/hooks/useToast';
import { getProductId } from '@/types/product-unified.types';
import { formatPrice as formatPriceUtil } from '@/utils/priceFormatter';
import CachedImage from '@/components/ui/CachedImage';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function ProductCard({
  product,
  onPress,
  onAddToCart,
  width = 180,
  showAddToCart = true
}: ProductCardProps) {
  const cartState = useCartState();
  const cartActions = useCartActions();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { subscribe, subscribing } = useStockNotifications();
  const { showSuccess, showError } = useToast();
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const isMounted = useIsMounted();

  // Stock status
  const stock = product.inventory?.stock ?? (product.availabilityStatus === 'out_of_stock' ? 0 : 100);
  const lowStockThreshold = product.inventory?.lowStockThreshold ?? 5;
  const { isOutOfStock, isLowStock, canAddToCart: canAddToCartStock } = useStockStatus({
    stock,
    lowStockThreshold,
  });

  // Memoize product ID to avoid recalculation - use helper for consistency
  const productId = useMemo(() => getProductId(product), [product._id, product.id]);

  // Check if product is in cart and get quantity - ONLY for THIS product
  const { cartItem, quantityInCart, isInCart } = useMemo(() => {
    // Find this specific product in cart
    const item = cartState.items.find(i => i.productId === productId);
    const qty = item?.quantity || 0;
    const inCart = qty > 0;

    return {
      cartItem: item,
      quantityInCart: qty,
      isInCart: inCart
    };
  }, [productId, cartState.items]);

  // Normalize price — some products use `price`, others use `pricing`
  const price = useMemo(() => {
    if (product.price) return product.price;
    const p = (product as any).pricing;
    if (p) return { current: p.selling ?? p.current ?? 0, original: p.original ?? p.mrp, currency: p.currency || 'INR', discount: p.discount };
    return { current: 0, original: undefined, currency: 'INR', discount: undefined };
  }, [product.price, (product as any).pricing]);

  // Get currency from product data (supports both price.currency and pricing.currency)
  const productCurrency = useMemo(() => {
    return price.currency || 'INR';
  }, [price.currency]);

  // Memoize formatPrice function - uses product's currency
  const formatPrice = useCallback((priceVal: number) => {
    return formatPriceUtil(priceVal, productCurrency, false) || `${priceVal}`;
  }, [productCurrency]);

  // Memoize price calculations
  const priceData = useMemo(() => {
    const savings = price.original && price.original > price.current
      ? price.original - price.current
      : 0;

    let discount = 0;
    if (price.discount) {
      discount = price.discount;
    } else if (price.original && price.original > price.current) {
      discount = Math.round(((price.original - price.current) / price.original) * 100);
    }

    return { savings, discount };
  }, [price.original, price.current, price.discount]);

  // Memoize event handlers with useCallback
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
          productName: product.name,
          productImage: product.image,
          price: price.current,
          originalPrice: price.original,
          discount: priceData.discount,
          rating: product.rating?.value || 0,
          reviewCount: product.rating?.count || 0,
          brand: product.brand,
          category: product.category || 'General',
          availability: isOutOfStock ? 'OUT_OF_STOCK' : isLowStock ? 'LIMITED' : 'IN_STOCK',
        });
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsTogglingWishlist(false);
    }
  }, [isTogglingWishlist, isInWishlist, productId, removeFromWishlist, addToWishlist, product.name, product.image, price.current, price.original, priceData.discount, product.rating, product.brand, product.category, isOutOfStock, isLowStock]);

  // Memoize badge rendering
  const badges = useMemo(() => {
    const badgeElements = [];

    if (product.isNewArrival) {
      badgeElements.push(
        <View key="new" style={[styles.badge, styles.newBadge]}>
          <ThemedText style={styles.newBadgeText}>New</ThemedText>
        </View>
      );
    }

    if (priceData.discount > 0) {
      badgeElements.push(
        <View key="discount" style={[styles.badge, styles.discountBadge]}>
          <ThemedText style={styles.discountBadgeText}>{priceData.discount}% OFF</ThemedText>
        </View>
      );
    }

    return badgeElements.length > 0 ? (
      <View style={styles.badgesContainer}>
        {badgeElements}
      </View>
    ) : null;
  }, [product.isNewArrival, priceData.discount]);

  // Memoize stock badge rendering
  const stockBadge = useMemo(() => {
    // Show stock badge on the bottom-right corner of image
    if (product.inventory || isOutOfStock || isLowStock) {
      return (
        <View style={styles.stockBadgeContainer}>
          <StockBadge
            stock={stock}
            lowStockThreshold={lowStockThreshold}
            variant="compact"
          />
        </View>
      );
    }
    return null;
  }, [product.inventory, isOutOfStock, isLowStock, stock, lowStockThreshold]);

  // Memoize availability status rendering
  const availabilityStatus = useMemo(() => {
    switch (product.availabilityStatus) {
      case 'low_stock':
        return (
          <View style={styles.lowStockContainer}>
            <ThemedText style={styles.lowStockText}>Only few left!</ThemedText>
          </View>
        );
      case 'out_of_stock':
        return (
          <View style={styles.outOfStockContainer}>
            <ThemedText style={styles.outOfStockText}>Out of Stock</ThemedText>
          </View>
        );
      default:
        return null;
    }
  }, [product.availabilityStatus]);

  // Memoize accessibility label
  const productLabel = useMemo(() => {
    const stockStatus = isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'In stock';
    const wishlistStatus = isInWishlist(productId) ? 'in wishlist' : 'not in wishlist';

    return `${product.brand || 'Brand'} ${product.name || 'Product Name'}. Price ${formatPrice(price.current)}${price.original && price.original > price.current ? `. Was ${formatPrice(price.original)}` : ''}${priceData.discount > 0 ? `. ${priceData.discount}% off` : ''}${product.rating ? `. ${product.rating.value} stars, ${product.rating.count} reviews` : ''}. ${stockStatus}${product.cashback ? `. ${product.cashback.percentage}% cashback` : ''}. ${wishlistStatus}`;
  }, [product.brand, product.name, price.current, price.original, priceData.discount, product.rating, product.cashback, isOutOfStock, isLowStock, isInWishlist, productId, formatPrice]);

  // Memoize press handler
  const handlePress = useCallback(() => {
    onPress(product);
  }, [onPress, product]);

  // Memoize notify me handler
  const handleNotifyMe = useCallback((e: any) => {
    e.stopPropagation();
    subscribe(productId, 'push');
  }, [subscribe, productId]);

  // Memoize decrease quantity handler
  const handleDecreaseQuantity = useCallback(async (e: any) => {
    e.stopPropagation();
    try {
      if (quantityInCart > 1) {
        await cartActions.updateQuantity(cartItem!.id, quantityInCart - 1);
        showSuccess(`${product.name} quantity decreased`);
      } else {
        await cartActions.removeItem(cartItem!.id);
        showSuccess(`${product.name} removed from cart`);
      }
    } catch (error) {
      showError(`Failed to update ${product.name}`);
    }
  }, [quantityInCart, cartActions, cartItem, showSuccess, showError, product.name]);

  // Memoize increase quantity handler
  const handleIncreaseQuantity = useCallback(async (e: any) => {
    e.stopPropagation();
    try {
      if (quantityInCart < stock) {
        await cartActions.updateQuantity(cartItem!.id, quantityInCart + 1);
        showSuccess(`${product.name} quantity increased`);
      } else {
        showError(`Maximum quantity reached for ${product.name}`);
      }
    } catch (error) {
      showError(`Failed to update ${product.name}`);
    }
  }, [quantityInCart, stock, cartActions, cartItem, showSuccess, showError, product.name]);

  // Memoize add to cart handler
  const handleAddToCart = useCallback(async (e: any) => {
    e.stopPropagation();
    if (onAddToCart && canAddToCartStock) {
      try {
        await onAddToCart(product);
        showSuccess(`${product.name} added to cart`);
      } catch (error) {
        showError(`Failed to add ${product.name} to cart`);
      }
    }
  }, [onAddToCart, canAddToCartStock, product, showSuccess, showError]);

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={handlePress}
      accessibilityLabel={productLabel}
      accessibilityHint="Double tap to view product details"
    >
      <ThemedView style={styles.card}>
        {/* Product Image */}
        <View
          style={styles.imageContainer}
          accessibilityLabel={`Product image for ${product.name}`}
          accessibilityRole="image"
        >
          <CachedImage
            source={product.image || 'https://via.placeholder.com/200x200?text=No+Image'}
            style={styles.image}
            contentFit="cover"
            priority="normal"
            showShimmer={true}
            accessibilityLabel={`Product image for ${product.name}`}
          />
          {badges}
          {stockBadge}

          {/* Wishlist Heart Button */}
          <Pressable
            style={styles.wishlistButton}
            onPress={handleToggleWishlist}
            disabled={isTogglingWishlist}
           
            accessibilityLabel={isInWishlist(productId) ? "Remove from wishlist" : "Add to wishlist"}
            accessibilityRole="button"
            accessibilityHint={isInWishlist(productId) ? "Double tap to remove from wishlist" : "Double tap to add to wishlist"}
            accessibilityState={{ disabled: isTogglingWishlist }}
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
            {product.brand || 'Brand'}
          </ThemedText>
          
          <ThemedText style={styles.name} numberOfLines={2}>
            {product.name || 'Product Name'}
          </ThemedText>

          {/* Rating - Using RatingStars component for consistency */}
          {product.rating && (
            <View style={styles.ratingContainer}>
              <RatingStars
                rating={product.rating.value}
                size={12}
                showCount={true}
                count={product.rating.count}
              />
            </View>
          )}

          {/* Price Information */}
          <View
            style={styles.priceContainer}
            accessibilityLabel={`Price: ${formatPrice(price.current)}${price.original && price.original > price.current ? `. Was ${formatPrice(price.original)}. You save ${formatPrice(priceData.savings)}` : ''}`}
            accessibilityRole="text"
          >
            <ThemedText style={styles.currentPrice}>
              {formatPrice(price.current)}
            </ThemedText>
            {price.original && price.original > price.current && (
              <ThemedText style={styles.originalPrice}>
                {formatPrice(price.original)}
              </ThemedText>
            )}
          </View>

          {/* Savings */}
          {priceData.savings > 0 && (
            <ThemedText
              style={styles.savings}
              accessibilityLabel={`You save ${formatPrice(priceData.savings)}`}
            >
              You save {formatPrice(priceData.savings)}
            </ThemedText>
          )}

          {/* Availability Status */}
          {availabilityStatus}
        </View>

        {/* Add to Cart Button / Quantity Controls - Bottom aligned */}
        <View style={styles.bottomSection}>
          {/* Cashback - Enhanced for New Arrivals - Moved to bottom section */}
          {product.cashback && (() => {
            const cashbackPercentage = product.cashback.percentage || 0;
            const cashbackAmount = Math.round((price.current * cashbackPercentage) / 100);
            const maxCashback = product.cashback.maxAmount;
            const finalCashback = maxCashback && cashbackAmount > maxCashback ? maxCashback : cashbackAmount;
            
            return (
              <View
                style={styles.cashbackContainer}
                accessibilityLabel={`Earn ${cashbackPercentage}% cashback, up to ${formatPrice(finalCashback)}`}
                accessibilityRole="text"
              >
                <Ionicons name="cash" size={12} color={colors.nileBlue} style={{ marginRight: 4 }} />
                <ThemedText style={styles.cashbackText}>
                  Earn {cashbackPercentage}% cashback
                </ThemedText>
                {finalCashback > 0 && (
                  <ThemedText style={styles.cashbackAmount}>
                    {' '}(Up to {formatPrice(finalCashback)})
                  </ThemedText>
                )}
              </View>
            );
          })()}
          {showAddToCart && (
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
                  accessibilityLabel={subscribing[productId] ? 'Subscribing to stock notifications' : 'Notify me when product is back in stock'}
                  accessibilityRole="button"
                  accessibilityHint="Double tap to subscribe to notifications when this product is available"
                  accessibilityState={{ disabled: subscribing[productId] }}
                >
                  <Ionicons name="notifications-outline" size={18} color={colors.lightMustard} />
                  <ThemedText style={styles.notifyMeText}>
                    {subscribing[productId] ? 'Subscribing...' : 'Notify Me'}
                  </ThemedText>
                </Pressable>
              ) : isInCart ? (
                // Quantity Controls (Flipkart style)
                <View
                  style={styles.quantityControls}
                  key="quantity-controls"
                  accessibilityLabel={`Quantity in cart: ${quantityInCart}. Use buttons to adjust quantity`}
                  accessibilityRole="adjustable"
                >
                  <Pressable
                    style={styles.quantityButton}
                    onPress={handleDecreaseQuantity}
                   
                    accessibilityLabel={quantityInCart > 1 ? "Decrease quantity" : "Remove from cart"}
                    accessibilityRole="button"
                    accessibilityHint={quantityInCart > 1 ? "Double tap to decrease quantity by one" : "Double tap to remove product from cart"}
                  >
                    <Ionicons name="remove" size={18} color={colors.background.primary} />
                  </Pressable>

                  <View
                    style={styles.quantityDisplay}
                    accessibilityLabel={`Current quantity: ${quantityInCart}`}
                    accessibilityRole="text"
                  >
                    <ThemedText style={styles.quantityText}>{quantityInCart}</ThemedText>
                  </View>

                  <Pressable
                    style={[
                      styles.quantityButton,
                      quantityInCart >= stock && styles.quantityButtonDisabled
                    ]}
                    onPress={handleIncreaseQuantity}
                   
                    disabled={quantityInCart >= stock}
                    accessibilityLabel="Increase quantity"
                    accessibilityRole="button"
                    accessibilityHint={quantityInCart >= stock ? `Maximum stock reached: ${stock}` : "Double tap to increase quantity by one"}
                    accessibilityState={{ disabled: quantityInCart >= stock }}
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
                  accessibilityLabel={`Add ${product.name} to cart`}
                  accessibilityRole="button"
                  accessibilityHint="Double tap to add this product to your shopping cart"
                  accessibilityState={{ disabled: !canAddToCartStock }}
                >
                  <Ionicons name="cart" size={18} color={colors.background.primary} />
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

// Memoize the component with a custom comparison function
// Only re-render when THIS product's data or cart quantity changes
const MemoizedProductCard = memo(ProductCard, (prevProps, nextProps) => {
  // If product ID changed, re-render - use helper for consistency
  if (getProductId(prevProps.product) !== getProductId(nextProps.product)) {
    return false;
  }

  // If product data changed (price, stock, etc), re-render
  const prevPrice = prevProps.product.price || (prevProps.product as any).pricing;
  const nextPrice = nextProps.product.price || (nextProps.product as any).pricing;
  if (
    prevPrice?.current !== nextPrice?.current ||
    prevPrice?.original !== nextPrice?.original ||
    prevPrice?.discount !== nextPrice?.discount ||
    prevPrice?.selling !== nextPrice?.selling ||
    prevProps.product.inventory?.stock !== nextProps.product.inventory?.stock ||
    prevProps.product.availabilityStatus !== nextProps.product.availabilityStatus ||
    prevProps.product.name !== nextProps.product.name ||
    prevProps.product.image !== nextProps.product.image
  ) {
    return false;
  }

  // If width or showAddToCart props changed, re-render
  if (prevProps.width !== nextProps.width || prevProps.showAddToCart !== nextProps.showAddToCart) {
    return false;
  }

  // If callbacks changed (they shouldn't with stable refs), re-render
  if (prevProps.onPress !== nextProps.onPress || prevProps.onAddToCart !== nextProps.onAddToCart) {
    return false;
  }

  // Otherwise, don't re-render (cart changes to OTHER products won't trigger re-render)
  return true;
});

export default MemoizedProductCard;

const styles = StyleSheet.create({
  container: {
    // Container styles handled by parent
    flex: 0,
    flexShrink: 0,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
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
    height: 280,
  },
  imageContainer: {
    position: 'relative',
    height: 100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'column',
    gap: 4,
  },
  stockBadgeContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  newBadge: {
    backgroundColor: colors.nileBlue,
  },
  newBadgeText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  discountBadge: {
    backgroundColor: colors.lightMustard,
  },
  discountBadgeText: {
    color: colors.nileBlue,
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    flex: 1,
    gap: 6,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    gap: 8,
  },
  brand: {
    fontSize: 10,
    color: colors.nileBlue,
    fontWeight: '600',
    textTransform: 'uppercase',
    lineHeight: 12,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
    lineHeight: 18,
    minHeight: 36,
    maxHeight: 36,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  ratingCount: {
    fontSize: 10,
    color: colors.neutral[500],
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  savings: {
    fontSize: 11,
    color: colors.nileBlue,
    fontWeight: '500',
  },
  cashbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  cashbackText: {
    fontSize: 11,
    color: colors.nileBlue,
    fontWeight: '600',
  },
  cashbackAmount: {
    fontSize: 10,
    color: colors.nileBlue,
    fontWeight: '600',
  },
  lowStockContainer: {
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  lowStockText: {
    fontSize: 11,
    color: colors.brand.amberDark,
    fontWeight: '600',
  },
  outOfStockContainer: {
    backgroundColor: colors.errorScale[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  outOfStockText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '600',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.lightMustard,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addToCartText: {
    fontSize: 13,
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
    backgroundColor: colors.brand.nileBlueLight,
  },
  notifyMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.background.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.lightMustard,
  },
  notifyMeText: {
    fontSize: 13,
    color: colors.lightMustard,
    fontWeight: '600',
  },
  notifyMeButtonDisabled: {
    opacity: 0.5,
  },
});
