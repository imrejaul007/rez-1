// @ts-nocheck
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/ThemedText';
import { GoingOutProductCardProps } from '@/types/going-out.types';
import { normalizeProductPrice, normalizeProductRating } from '@/utils/productDataNormalizer';
import { formatPrice } from '@/utils/priceFormatter';
import { useCartState, useCartActions } from '@/stores/selectors';
import { colors } from '@/constants/theme';

function _GoingOutProductCardInner({
  product,
  onPress,
  onAddToCart,
  onToggleWishlist,
  showAddToCart = true,
  width = 180,
  isInWishlist = false,
}: GoingOutProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const cartState = useCartState();
  const cartActions = useCartActions();

  // Get product ID and check if in cart
  const productId = product._id || product.id;
  const { cartItem, quantityInCart, isInCart } = useMemo(() => {
    const item = cartState.items.find(i => i.productId === productId || i.id === productId);
    const qty = item?.quantity || 0;
    return {
      cartItem: item,
      quantityInCart: qty,
      isInCart: qty > 0
    };
  }, [productId, cartState.items]);

  // Normalize price and rating using utility functions
  const normalizedPrice = normalizeProductPrice(product);
  const normalizedRating = normalizeProductRating(product);

  const getDiscountPercentage = () => {
    return normalizedPrice.discount || 0;
  };

  const handlePress = () => {
    onPress(product);
  };

  const handleAddToCart = (e: any) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  // Internal add to cart using cartActions directly
  const handleAddToCartInternal = useCallback(async (e: any) => {
    e.stopPropagation();

    // If external handler provided, use it
    if (onAddToCart) {
      onAddToCart(product);
      return;
    }

    // Otherwise use cartActions directly
    try {
      const price = normalizedPrice.current || 0;
      const originalPrice = normalizedPrice.original || price;

      await cartActions.addItem({
        id: productId,
        name: product.name,
        image: product.image || '',
        price: price,
        originalPrice: originalPrice,
        discountedPrice: price,
        quantity: 1,
        cashback: product.cashback?.percentage || 0,
        category: product.categoryId || 'general',
      });
    } catch (error) {
      // silently handle
    }
  }, [onAddToCart, product, productId, normalizedPrice, cartActions]);

  const handleDecreaseQuantity = useCallback(async (e: any) => {
    e.stopPropagation();
    if (cartItem) {
      if (quantityInCart > 1) {
        await cartActions.updateQuantity(cartItem.id, quantityInCart - 1);
      } else {
        await cartActions.removeItem(cartItem.id);
      }
    }
  }, [quantityInCart, cartItem, cartActions]);

  const handleIncreaseQuantity = useCallback(async (e: any) => {
    e.stopPropagation();
    if (cartItem) {
      await cartActions.updateQuantity(cartItem.id, quantityInCart + 1);
    }
  }, [quantityInCart, cartItem, cartActions]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleWishlistToggle = (e: any) => {
    e.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(product);
    }
  };

  const getAccessibilityLabel = () => {
    const parts = [product.name];

    if (product.brand) {
      parts.push(`by ${product.brand}`);
    }

    if (normalizedRating.value !== null && normalizedRating.count !== null) {
      parts.push(`${normalizedRating.value} stars with ${normalizedRating.count} reviews`);
    }

    if (normalizedPrice.current !== null) {
      const formattedPrice = formatPrice(normalizedPrice.current, 'INR', false);
      if (formattedPrice) parts.push(formattedPrice);
    }

    const discount = getDiscountPercentage();
    if (discount > 0) {
      parts.push(`${discount}% off`);
    }

    if (product.cashback?.percentage) {
      parts.push(`${product.cashback.percentage}% cashback available`);
    }

    if (product.availabilityStatus === 'out_of_stock') {
      parts.push('Out of stock');
    } else {
      parts.push('In stock');
    }

    if (isInWishlist) {
      parts.push('Added to wishlist');
    }

    return parts.join('. ');
  };

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={handlePress}
     
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityRole="button"
      accessibilityHint="Double tap to view product details and offers"
    >
      <View style={styles.card}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {!imageError && product.image ? (
            <CachedImage 
              source={product.image} 
              style={styles.image}
              contentFit="cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons 
                name="image-outline" 
                size={48} 
                color={colors.neutral[300]} 
              />
              <ThemedText style={styles.placeholderText}>
                No Image
              </ThemedText>
            </View>
          )}
          
          {imageLoading && !imageError && (
            <View style={styles.imageLoadingOverlay}>
              <Ionicons 
                name="hourglass-outline" 
                size={24} 
                color={colors.brand.purpleLight} 
              />
            </View>
          )}
          
          {/* Cashback Badge */}
          {product.cashback?.percentage && (
            <LinearGradient
              colors={[colors.brand.purpleLight, colors.brand.purpleMedium]}
              style={styles.cashbackBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ThemedText style={styles.cashbackText}>
                Upto {product.cashback.percentage}% cash back
              </ThemedText>
            </LinearGradient>
          )}

          {/* New Badge */}
          {product.isNew && (
            <View style={styles.newBadge}>
              <ThemedText style={styles.newBadgeText}>New</ThemedText>
            </View>
          )}

          {/* Discount Badge */}
          {getDiscountPercentage() > 0 && (
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountBadgeText}>
                {getDiscountPercentage()}% OFF
              </ThemedText>
            </View>
          )}

          {/* Favorite Button */}
          <Pressable
            style={styles.favoriteButton}
           
            onPress={handleWishlistToggle}
            accessibilityLabel={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
            accessibilityRole="button"
            accessibilityState={{ selected: isInWishlist }}
            accessibilityHint={`Double tap to ${isInWishlist ? 'remove this product from' : 'add this product to'} your wishlist`}
          >
            <Ionicons
              name={isInWishlist ? "heart" : "heart-outline"}
              size={16}
              color={isInWishlist ? colors.error : colors.neutral[500]}
            />
          </Pressable>
        </View>

        {/* Product Details */}
        <View style={styles.content}>
          {/* Product Name */}
          <ThemedText style={styles.productName} numberOfLines={1}>
            {product.name}
          </ThemedText>

          {/* Brand */}
          {product.brand && (
            <ThemedText style={styles.brandName} numberOfLines={1}>
              {product.brand}
            </ThemedText>
          )}

          {/* Rating */}
          {normalizedRating.value !== null && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color={colors.warningScale[400]} />
              <ThemedText style={styles.ratingText}>
                {normalizedRating.value.toFixed(1)}
              </ThemedText>
              {normalizedRating.count !== null && normalizedRating.count > 0 && (
                <ThemedText style={styles.ratingCount}>
                  ({normalizedRating.count})
                </ThemedText>
              )}
            </View>
          )}

          {/* Price */}
          <View style={styles.priceContainer}>
            {normalizedPrice.current !== null && (
              <ThemedText style={styles.currentPrice}>
                {formatPrice(normalizedPrice.current, 'INR', false)}
              </ThemedText>
            )}
            {normalizedPrice.original !== null && normalizedPrice.current !== null && normalizedPrice.original > normalizedPrice.current && (
              <ThemedText style={styles.originalPrice}>
                {formatPrice(normalizedPrice.original, 'INR', false)}
              </ThemedText>
            )}
          </View>

          {/* Add to Cart Button / Quantity Controls */}
          {showAddToCart && product.availabilityStatus !== 'out_of_stock' && (
            <>
              {isInCart ? (
                // Quantity Controls
                <View style={styles.quantityControls}>
                  <Pressable
                    style={styles.quantityButton}
                    onPress={handleDecreaseQuantity}
                   
                  >
                    <Ionicons name="remove" size={16} color={colors.background.primary} />
                  </Pressable>

                  <View style={styles.quantityDisplay}>
                    <ThemedText style={styles.quantityText}>{quantityInCart}</ThemedText>
                  </View>

                  <Pressable
                    style={styles.quantityButton}
                    onPress={handleIncreaseQuantity}
                   
                  >
                    <Ionicons name="add" size={16} color={colors.background.primary} />
                  </Pressable>
                </View>
              ) : (
                // Add to Cart Button
                <Pressable
                  style={styles.addToCartButton}
                  onPress={handleAddToCartInternal}
                 
                  accessibilityLabel={`Add ${product.name} to cart`}
                  accessibilityRole="button"
                  accessibilityHint="Double tap to add this product to your shopping cart"
                >
                  <Ionicons name="cart-outline" size={16} color={colors.background.primary} />
                  <ThemedText style={styles.addToCartText}>Add to Cart</ThemedText>
                </Pressable>
              )}
            </>
          )}

          {/* Out of Stock */}
          {product.availabilityStatus === 'out_of_stock' && (
            <View style={styles.outOfStockContainer}>
              <ThemedText style={styles.outOfStockText}>Out of Stock</ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
    flexShrink: 0,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.tint.slate,
    height: 380, // Fixed height for all cards
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.12)',
      },
    }),
  },
  imageContainer: {
    position: 'relative',
    height: 160,
    backgroundColor: colors.tint.coolGray,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.tint.coolGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  placeholderText: {
    fontSize: 12,
    color: colors.neutral[400],
    fontWeight: '500',
    marginTop: 8,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cashbackBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purpleLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(139, 92, 246, 0.3)',
      },
    }),
  },
  cashbackText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.successScale[400],
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  newBadgeText: {
    color: colors.background.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: colors.background.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  content: {
    padding: 16,
    paddingTop: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 8,
    lineHeight: 20,
    letterSpacing: -0.2,
    minHeight: 40, // Fixed height for 2 lines
  },
  brandName: {
    fontSize: 12,
    color: colors.brand.purpleLight,
    fontWeight: '500',
    marginBottom: 6,
    minHeight: 16, // Ensure consistent height
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 16, // Ensure consistent height
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral[800],
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 11,
    color: colors.neutral[500],
    marginLeft: 4,
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 20, // Ensure consistent height
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral[800],
    marginRight: 8,
    letterSpacing: -0.3,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.green,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.green,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 192, 106, 0.2)',
      },
    }),
  },
  addToCartText: {
    fontSize: 12,
    color: colors.background.primary,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.green,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
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
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 14,
    color: colors.background.primary,
    fontWeight: '700',
  },
  outOfStockContainer: {
    backgroundColor: colors.errorScale[100],
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  outOfStockText: {
    fontSize: 10,
    color: colors.error,
    fontWeight: '600',
  },
});

export const GoingOutProductCard = React.memo(_GoingOutProductCardInner);
