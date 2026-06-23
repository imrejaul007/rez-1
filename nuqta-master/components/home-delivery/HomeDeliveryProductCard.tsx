import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { HomeDeliveryProductCardProps } from '@/types/home-delivery.types';
import { normalizeProductPrice, normalizeProductRating } from '@/utils/productDataNormalizer';
import { formatPrice } from '@/utils/priceFormatter';
import { colors } from '@/constants/theme';

function _HomeDeliveryProductCardInner({
  product,
  onPress,
  showCashback = true,
  showDeliveryTime = true,
  compact = false,
}: HomeDeliveryProductCardProps) {
  const [imageError, setImageError] = React.useState(false);

  // Normalize price and rating using utility functions
  const normalizedPrice = normalizeProductPrice(product);
  const normalizedRating = normalizeProductRating(product);

  const discountPercentage = normalizedPrice.discount || 0;
  const hasDiscount = discountPercentage > 0;

  // Build comprehensive accessibility label
  const buildAccessibilityLabel = () => {
    const currentPrice = normalizedPrice.current;
    const originalPrice = normalizedPrice.original;
    const ratingValue = normalizedRating.value;

    const parts = [
      product.name || 'Product',
      product.brand ? `by ${product.brand}` : '',
      currentPrice !== null ? `Price ${product.price?.currency || 'INR'}${currentPrice}` : '',
      originalPrice !== null ? `was ${product.price?.currency || 'INR'}${originalPrice}` : '',
      hasDiscount ? `${discountPercentage}% off` : '',
      ratingValue !== null ? `Rated ${ratingValue} stars` : '',
      showCashback && product.cashback?.percentage ? `Up to ${product.cashback.percentage}% cashback` : '',
      showDeliveryTime && product.deliveryTime ? `Delivery in ${product.deliveryTime}` : '',
      product.shipping?.freeShippingEligible ? 'Free shipping available' : '',
      product.isNew ? 'New product' : '',
      product.store?.name ? `From ${product.store.name}` : '',
    ];
    return parts.filter(Boolean).join('. ');
  };

  return (
    <Pressable
      style={[
        styles.container,
        compact && styles.containerCompact,
      ]}
      onPress={onPress}
     
      accessibilityLabel={buildAccessibilityLabel()}
      accessibilityRole="button"
      accessibilityHint="Double tap to view product details"
    >
      {/* Product Image */}
      <View style={styles.imageContainer}>
        {product.image && !imageError ? (
          <CachedImage
            source={product.image}
            style={styles.productImage}
            contentFit="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.productImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={40} color={colors.neutral[400]} />
          </View>
        )}
        
        {/* Discount Badge */}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>
              -{discountPercentage}%
            </ThemedText>
          </View>
        )}
        
        {/* New Badge */}
        {product.isNew && (
          <View style={styles.newBadge}>
            <ThemedText style={styles.newText}>NEW</ThemedText>
          </View>
        )}
        
        {/* Free Shipping Badge */}
        {product.shipping?.freeShippingEligible && (
          <View style={styles.shippingBadge}>
            <Ionicons name="car-outline" size={12} color={colors.nileBlue} />
            <ThemedText style={styles.shippingText}>Free</ThemedText>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        {/* Product Name */}
        <ThemedText style={styles.productName} numberOfLines={2}>
          {product.name}
        </ThemedText>
        
        {/* Brand */}
        {product.brand && (
          <ThemedText style={styles.brandText} numberOfLines={1}>
            {product.brand}
          </ThemedText>
        )}
        
        {/* Price Section */}
        <View style={styles.priceSection}>
          <View style={styles.priceContainer}>
            {normalizedPrice.current !== null && (
              <ThemedText style={styles.currentPrice}>
                {formatPrice(normalizedPrice.current, product.price?.currency || 'INR', false)}
              </ThemedText>
            )}
            {normalizedPrice.original !== null && (
              <ThemedText style={styles.originalPrice}>
                {formatPrice(normalizedPrice.original, product.price?.currency || 'INR', false)}
              </ThemedText>
            )}
          </View>

          {/* Rating */}
          {normalizedRating.value !== null && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color={colors.warningScale[400]} />
              <ThemedText style={styles.ratingText}>
                {normalizedRating.value.toFixed(1)}
              </ThemedText>
            </View>
          )}
        </View>
        
        {/* Cashback */}
        {showCashback && product.cashback?.percentage && (
          <View style={styles.cashbackContainer}>
            <Ionicons name="gift-outline" size={14} color={colors.nileBlue} />
            <ThemedText style={styles.cashbackText}>
              Upto {product.cashback.percentage}% cash back
            </ThemedText>
          </View>
        )}
        
        {/* Delivery Time */}
        {showDeliveryTime && product.deliveryTime && (
          <View style={styles.deliveryContainer}>
            <Ionicons name="time-outline" size={12} color={colors.neutral[500]} />
            <ThemedText style={styles.deliveryText}>
              {product.deliveryTime}
            </ThemedText>
          </View>
        )}
        
        {/* Store Info */}
        {product.store?.name && (
          <View style={styles.storeContainer}>
            <Ionicons name="storefront-outline" size={12} color={colors.neutral[500]} />
            <ThemedText style={styles.storeText} numberOfLines={1}>
              {product.store.name}
            </ThemedText>
          </View>
        )}
      </View>
    </Pressable>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    height: 380, // Fixed height for all cards
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  containerCompact: {
    padding: 8,
    height: 340,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.neutral[100],
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  shippingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#fde6c5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  shippingText: {
    color: colors.nileBlue,
    fontSize: 10,
    fontWeight: '600',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
    lineHeight: 18,
    minHeight: 36, // Fixed height for 2 lines
  },
  brandText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '400',
    minHeight: 16,
    marginTop: 4,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  originalPrice: {
    fontSize: 12,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  cashbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fde6c5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  cashbackText: {
    fontSize: 11,
    color: colors.nileBlue,
    fontWeight: '600',
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  deliveryText: {
    fontSize: 11,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  storeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeText: {
    fontSize: 10,
    color: colors.neutral[400],
    fontWeight: '400',
    flex: 1,
  },
});

export const HomeDeliveryProductCard = React.memo(_HomeDeliveryProductCardInner);
