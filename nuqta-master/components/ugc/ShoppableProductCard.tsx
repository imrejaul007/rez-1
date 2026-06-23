// ShoppableProductCard.tsx
// Enhanced product card for UGC videos with shop functionality

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ProductItem } from '@/types/homepage.types';
import { LinearGradient } from 'expo-linear-gradient';
import { normalizeProductPrice, normalizeProductRating } from '@/utils/productDataNormalizer';
import { formatPrice } from '@/utils/priceFormatter';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ShoppableProductCardProps {
  product: any; // Can be ProductItem or backend product structure
  onPress?: () => void;
  onAddToCart?: () => Promise<void>;
  compact?: boolean;
  showAddButton?: boolean;
  width?: number;
}

/**
 * Enhanced product card for shoppable UGC videos
 * Displays product with add to cart and navigation functionality
 */
function ShoppableProductCard({
  product,
  onPress,
  onAddToCart,
  compact = false,
  showAddButton = true,
  width = 160,
}: ShoppableProductCardProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [isAdding, setIsAdding] = useState(false);
  const scaleAnim = useSharedValue(1);
  const isMounted = useIsMounted();

  // Normalize price and rating using utility functions
  const normalizedPrice = normalizeProductPrice(product);
  const normalizedRating = normalizeProductRating(product);

  // Extract image from various possible structures
  let extractedImage = product.image || product.thumbnail;
  if (!extractedImage && product.images) {
    if (Array.isArray(product.images)) {
      if (typeof product.images[0] === 'string') {
        extractedImage = product.images[0];
      } else if (product.images[0]?.url) {
        extractedImage = product.images[0].url;
      }
    }
  }

  const productData = {
    id: product._id || product.id,
    name: product.name || product.title,
    image: extractedImage,
    price: normalizedPrice.current,
    originalPrice: normalizedPrice.original,
    discount: normalizedPrice.discount,
    currency: product.price?.currency || product.pricing?.currency || currencySymbol,
    rating: normalizedRating.value,
    ratingCount: normalizedRating.count,
    storeName: product.store?.name || product.brand,
    availabilityStatus: product.availabilityStatus || (product.inventory?.isAvailable ? 'in_stock' : 'out_of_stock'),
    cashback: product.cashback?.percentage,
  };

  // Debug logging for troubleshooting

  const isInStock = productData.availabilityStatus === 'in_stock';
  const hasDiscount = productData.discount !== null && productData.discount > 0;

  /**
   * Format price for display
   */
  const formattedPrice = productData.price !== null
    ? formatPrice(productData.price, productData.currency, false)
    : null;

  /**
   * Handle add to cart with animation
   */
  const handleAddToCart = useCallback(async () => {
    if (!onAddToCart || !isInStock) return;

    try {
      setIsAdding(true);

      // Animate button press
      scaleAnim.value = withSequence(withTiming(0.95, { duration: 100 }), withTiming(1, { duration: 100 }));

      await onAddToCart();
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsAdding(false);
    }
  }, [onAddToCart, isInStock, scaleAnim]);

  /**
   * Handle card press with animation
   */
  const handlePress = useCallback(() => {
    if (!onPress) return;

    scaleAnim.value = withSequence(withTiming(0.97, { duration: 100 }), withTiming(1, { duration: 100 }));

    onPress();
  }, [onPress, scaleAnim]);

  /**
   * Render rating stars
   */
  const renderRating = () => {
    if (productData.rating === null) return null;

    return (
      <View style={styles.ratingContainer}>
        <Ionicons name="star" size={12} color={colors.warningScale[400]} style={styles.ratingStar} />
        <View style={styles.ratingTextWrapper}>
          <Text style={styles.ratingText}>
            {productData.rating.toFixed(1)}
          </Text>
        </View>
        {productData.ratingCount !== null && productData.ratingCount > 0 && (
          <Text style={styles.ratingCount}>
            ({productData.ratingCount})
          </Text>
        )}
      </View>
    );
  };

  /**
   * Render price section
   */
  const renderPrice = () => {
    if (!formattedPrice) return null;

    return (
      <View style={styles.priceContainer}>
        <Text style={[styles.price, styles.priceItem]}>{formattedPrice}</Text>
        {hasDiscount && productData.originalPrice !== null && productData.discount !== null && (
          <>
            <Text style={[styles.originalPrice, styles.priceItem]}>
              {formatPrice(productData.originalPrice, productData.currency, false)}
            </Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {Math.round(productData.discount)}% OFF
              </Text>
            </View>
          </>
        )}
      </View>
    );
  };

  /**
   * Render compact version (smaller card)
   */
  if (compact) {
    return (
      <Animated.View style={[styles.compactCard, { width, transform: [{ scale: scaleAnim }] }]}>
        <Pressable onPress={handlePress}>
          <CachedImage
            source={productData.image}
            style={styles.compactImage}
            contentFit="cover"
          />
          {hasDiscount && productData.discount !== null && (
            <View style={[styles.badge, styles.discountBadgeCompact]}>
              <Text style={styles.badgeText}>{Math.round(productData.discount)}% OFF</Text>
            </View>
          )}
          {!isInStock && (
            <View style={[styles.badge, styles.outOfStockBadge]}>
              <Text style={styles.badgeText}>Out of Stock</Text>
            </View>
          )}
          <View style={styles.compactInfo}>
            <Text style={styles.compactName} numberOfLines={1}>
              {productData.name}
            </Text>
            {formattedPrice && (
              <Text style={styles.compactPrice}>{formattedPrice}</Text>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  /**
   * Render full card version
   */
  return (
    <Animated.View style={[styles.card, { width, transform: [{ scale: scaleAnim }] }]}>
      <Pressable onPress={handlePress}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <CachedImage
            source={productData.image}
            style={styles.productImage}
            contentFit="cover"
          />

          {/* Badges */}
          {hasDiscount && productData.discount !== null && (
            <View style={[styles.badge, styles.discountBadgeTop]}>
              <Text style={styles.badgeText}>{Math.round(productData.discount)}% OFF</Text>
            </View>
          )}

          {!isInStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}

          {productData.cashback !== null && productData.cashback !== undefined && typeof productData.cashback === 'number' && productData.cashback > 0 && (
            <View style={[styles.badge, styles.cashbackBadge]}>
              <Ionicons name="cash-outline" size={10} color={colors.background.primary} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>
                {productData.cashback}% back
              </Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          {/* Store Name */}
          {productData.storeName && (
            <Text style={styles.storeName} numberOfLines={1}>
              {productData.storeName}
            </Text>
          )}

          {/* Product Name */}
          <Text style={styles.productName} numberOfLines={2}>
            {productData.name}
          </Text>

          {/* Rating */}
          {renderRating()}

          {/* Price */}
          {renderPrice()}
        </View>

        {/* Add to Cart Button */}
        {showAddButton && (
          <Pressable
            style={[
              styles.addButton,
              !isInStock && styles.addButtonDisabled,
            ]}
            onPress={handleAddToCart}
            disabled={!isInStock || isAdding}
           
          >
            <LinearGradient
              colors={isInStock ? [colors.brand.purple, colors.brand.indigo] : [colors.neutral[400], colors.neutral[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color={colors.background.primary} />
              ) : (
                <>
                  <Ionicons
                    name={isInStock ? "cart-outline" : "close-circle-outline"}
                    size={16}
                    color={colors.background.primary}
                    style={styles.addButtonIcon}
                  />
                  <Text style={styles.addButtonText}>
                    {isInStock ? 'Add to Cart' : 'Unavailable'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Full Card Styles
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.brand.purple,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.08)',
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1.9,
    backgroundColor: colors.neutral[100],
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeIcon: {
    marginRight: 2,
  },
  discountBadgeTop: {
    top: 6,
    left: 6,
    backgroundColor: colors.error,
  },
  cashbackBadge: {
    bottom: 6,
    left: 6,
    backgroundColor: colors.lightMustard,
  },
  badgeText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  productInfo: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    height: 82, // Fixed height to ensure perfect alignment (increased to accommodate padding)
  },
  storeName: {
    fontSize: 9,
    color: colors.brand.purple,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 8, // Increased to match height
    paddingTop: 0, // Add top padding to prevent clipping
    paddingLeft: 0,
  },
  productName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 2,
    lineHeight: 20, // Increased from 14 to prevent top clipping
    minHeight: 20, // Changed from fixed height to minHeight
    paddingTop: 1, // Add slight top padding to prevent clipping
    paddingLeft: 0,
    includeFontPadding: false,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    height: 16, // Fixed height to prevent misalignment
  },
  ratingStar: {
    marginRight: 2,
  },
  ratingTextWrapper: {
    marginRight: 4,
  },
  ratingText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  ratingCount: {
    fontSize: 10,
    color: colors.neutral[500],
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    minHeight: 20, // Fixed minimum height to prevent misalignment
  },
  priceItem: {
    marginRight: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.brand.purple,
    letterSpacing: -0.3,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.warningScale[400],
  },
  discountText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.warningScale[700],
    letterSpacing: 0.2,
  },
  addButton: {
    margin: 6,
    marginTop: 4,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.brand.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    height: 36, // Fixed button height
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  addButtonIcon: {
    marginRight: 6,
  },
  addButtonText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Compact Card Styles
  compactCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    marginRight: 10,
  },
  compactImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.neutral[100],
  },
  discountBadgeCompact: {
    top: 6,
    left: 6,
    backgroundColor: colors.error,
  },
  outOfStockBadge: {
    top: 6,
    right: 6,
    backgroundColor: colors.neutral[500],
  },
  compactInfo: {
    padding: 8,
  },
  compactName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  compactPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral[900],
  },
});

export default React.memo(ShoppableProductCard);
