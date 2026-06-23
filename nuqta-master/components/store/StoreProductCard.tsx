// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ProductItem } from '@/types/homepage.types';
import { useCartActions } from '@/stores/selectors';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast } from '@/hooks/useToast';
import ProductVariantModal, { VariantSelection } from '@/components/cart/ProductVariantModal';
import { hasVariants, createCartItemFromVariant } from '@/utils/variantHelper';
import { normalizeProductPrice, normalizeProductRating } from '@/utils/productDataNormalizer';
import { formatPrice } from '@/utils/priceFormatter';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface StoreProductCardProps {
  product: ProductItem;
  onPress?: () => void;
  onAddToCart?: (variant?: VariantSelection) => void;
  isFavorited?: boolean;
  onWishlistToggle?: () => void;
  variants?: any[];
  onLongPress?: () => void;
}

function StoreProductCard({
  product,
  onPress,
  onAddToCart,
  isFavorited = false,
  onWishlistToggle,
  variants = [],
  onLongPress,
}: StoreProductCardProps) {
  const cartActions = useCartActions();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { showSuccess, showError } = useToast();
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const heartScale = useSharedValue(1);
  const isMounted = useIsMounted();

  // Get main image or fallback
  const mainImage = product.images?.[0]?.url || product.image || 'https://via.placeholder.com/300';

  // Normalize price and rating using utility functions
  const normalizedPrice = normalizeProductPrice(product);
  const normalizedRating = normalizeProductRating(product);

  const currentPrice = normalizedPrice.current;
  const originalPrice = normalizedPrice.original;
  const discountPercentage = normalizedPrice.discount;

  const hasDiscount = discountPercentage !== null && discountPercentage > 0;

  // Render rating stars
  const renderStars = () => {
    if (normalizedRating.value === null) return null;

    const fullStars = Math.floor(normalizedRating.value);
    const stars = [];

    for (let i = 0; i < 5; i++) {
      stars.push(
        <Text key={i} style={styles.star}>
          {i < fullStars ? '★' : '☆'}
        </Text>
      );
    }

    return stars;
  };

  // Get rating info
  const getRatingInfo = () => {
    if (normalizedRating.count === null || normalizedRating.count === 0) {
      return null;
    }
    return normalizedRating.count;
  };

  // Handle variant confirmation
  const handleVariantConfirm = async (selectedVariant: VariantSelection) => {
    setIsAddingToCart(true);
    setShowVariantModal(false);

    try {
      // Create cart item from variant
      const cartItem = createCartItemFromVariant(product, selectedVariant, 1);

      // Add to cart
      await cartActions.addItem(cartItem);

      // Call parent callback if provided
      if (onAddToCart) {
        onAddToCart(selectedVariant);
      }

      showSuccess('Added to cart!');
    } catch (error) {
      showError('Failed to add to cart. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsAddingToCart(false);
    }
  };

  // Handle add to cart button click
  const handleAddToCart = async (e?: any) => {
    if (e) {
      e.stopPropagation();
    }

    // If custom onAddToCart is provided, use it
    if (onAddToCart) {
      // Check if product requires variant selection
      if (hasVariants(product)) {
        setShowVariantModal(true);
        return;
      }

      // Call custom handler without variant
      onAddToCart(undefined);
      return;
    }

    // Check if product has variants
    if (hasVariants(product)) {
      setShowVariantModal(true);
      return;
    }

    // Add directly to cart without variants
    setIsAddingToCart(true);

    try {
      // Only add to cart if price is valid
      if (currentPrice === null) {
        showError('Product price unavailable');
        return;
      }

      const cartItem = {
        id: product.id,
        productId: product.id,
        name: product.name,
        brand: product.brand,
        image: mainImage,
        originalPrice: originalPrice || currentPrice,
        discountedPrice: currentPrice,
        quantity: 1,
        selected: true,
        addedAt: new Date().toISOString(),
        category: product.category,
      };

      await cartActions.addItem(cartItem);
      showSuccess('Added to cart!');
    } catch (error) {
      showError('Failed to add to cart. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsAddingToCart(false);
    }
  };

  // Get product ID
  const productId = product._id || product.id;

  // Check if in wishlist (using context or prop)
  const inWishlist = onWishlistToggle ? isFavorited : isInWishlist(productId);

  // Handle wishlist toggle with animation
  const handleWishlistToggle = async (e?: any) => {
    if (e) {
      e.stopPropagation();
    }

    // If custom callback provided, use it
    if (onWishlistToggle) {
      onWishlistToggle();
      return;
    }

    if (isTogglingWishlist) return;

    // Animate heart
    heartScale.value = withSequence(withTiming(1.3, { duration: 150 }), withTiming(1, { duration: 150 }));

    setIsTogglingWishlist(true);
    try {
      if (inWishlist) {
        await removeFromWishlist(productId);
        showSuccess('Removed from wishlist');
      } else {
        await addToWishlist({
          productId,
          productName: product.name,
          productImage: mainImage,
          price: currentPrice || 0,
          originalPrice: originalPrice || currentPrice || 0,
          discount: discountPercentage || 0,
          rating: normalizedRating.value || 0,
          reviewCount: normalizedRating.count || 0,
          brand: product.brand || 'Brand',
          category: product.category || 'General',
          availability: 'IN_STOCK',
        });
        showSuccess('Added to wishlist');
      }
    } catch (error) {
      showError('Failed to update wishlist');
    } finally {
      if (!isMounted()) return;
      setIsTogglingWishlist(false);
    }
  };

  return (
    <>
      <Pressable
        style={styles.card}
        onPress={onPress}
        onLongPress={onLongPress}
       
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <CachedImage
            source={mainImage}
            style={styles.image}
            contentFit="cover"
          />

          {/* Discount Badge */}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
            </View>
          )}

          {/* Wishlist Heart Icon - Enhanced with Ionicons */}
          <Pressable
            style={({ pressed }) => [
              styles.wishlistButton,
              pressed && { opacity: 0.7 }
            ]}
            onPress={handleWishlistToggle}
            disabled={isTogglingWishlist}
            role="button"
            aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={inWishlist ? 'heart' : 'heart-outline'}
                size={22}
                color={inWishlist ? colors.error : colors.text.white}
              />
            </Animated.View>
          </Pressable>
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          {/* Product Name */}
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

          {/* Rating */}
          {getRatingInfo() !== null && (
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {renderStars()}
              </View>
              <Text style={styles.ratingCount}>({getRatingInfo()})</Text>
            </View>
          )}

          {/* Price */}
          <View style={styles.priceContainer}>
            {currentPrice !== null && (
              <Text style={styles.currentPrice}>
                {formatPrice(currentPrice, 'INR', false)}
              </Text>
            )}
            {hasDiscount && originalPrice !== null && (
              <Text style={styles.originalPrice}>
                {formatPrice(originalPrice, 'INR', false)}
              </Text>
            )}
          </View>

          {/* Store Name */}
          {(product as any).store?.name && (
            <Text style={styles.storeName} numberOfLines={1}>
              {(product as any).store.name}
            </Text>
          )}

          {/* Variant Info Display */}
          {hasVariants(product) && (
            <Text style={styles.variantHint}>Select options below</Text>
          )}

          {/* Add to Cart Button */}
          <Pressable
            style={({ pressed }) => [
              styles.addToCartButton,
              isAddingToCart && styles.addToCartButtonDisabled,
              pressed && !isAddingToCart && { opacity: 0.8 }
            ]}
            onPress={handleAddToCart}
            disabled={isAddingToCart}
            role="button"
            aria-label="Add to cart"
          >
            {isAddingToCart ? (
              <>
                <ActivityIndicator size="small" color={colors.background.primary} />
                <Text style={styles.addToCartText} numberOfLines={1}>Adding...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cart-outline" size={16} color={colors.background.primary} style={{ marginRight: 4 }} />
                <Text style={styles.addToCartText} numberOfLines={1}>Add to Cart</Text>
              </>
            )}
          </Pressable>
        </View>
      </Pressable>

      {/* Variant Modal */}
      {variants && variants.length > 0 ? (
        <ProductVariantModal
          visible={showVariantModal}
          product={product}
          variants={variants}
          onConfirm={handleVariantConfirm}
          onCancel={() => setShowVariantModal(false)}
          loading={isAddingToCart}
        />
      ) : (
        <ProductVariantModal
          visible={showVariantModal}
          product={product}
          onConfirm={handleVariantConfirm}
          onCancel={() => setShowVariantModal(false)}
          loading={isAddingToCart}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
      } as any,
    }),
  },
  imageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: colors.neutral[50],
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#FF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  discountText: {
    color: colors.text.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoContainer: {
    padding: 14,
  },
  productName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 6,
    lineHeight: 18,
    minHeight: 36,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  star: {
    fontSize: 12,
    color: colors.warning,
    marginRight: 1,
  },
  ratingCount: {
    fontSize: 11,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  currentPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brand.purple,
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  storeName: {
    fontSize: 11,
    color: colors.neutral[400],
    marginTop: 0,
    marginBottom: 6,
    fontWeight: '500',
  },
  variantHint: {
    fontSize: 10,
    color: colors.brand.purpleLight,
    fontWeight: '600',
    marginBottom: 6,
  },
  wishlistButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.purple,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purple,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  addToCartButtonDisabled: {
    opacity: 0.6,
  },
  cartIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  addToCartText: {
    color: colors.text.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default React.memo(StoreProductCard);
