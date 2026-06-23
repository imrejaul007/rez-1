/**
 * ProductInfo Component
 *
 * Displays product information (brand, name, price, rating, cashback)
 *
 * @component
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import RatingStars from '@/components/reviews/RatingStars';
import { colors } from '@/constants/theme';

export interface ProductInfoProps {
  product: any;
  priceData: { savings: number; discount: number };
  formatPrice: (price: number) => string;
  isOutOfStock: boolean;
  isLowStock: boolean;
}

const ProductInfo: React.FC<ProductInfoProps> = ({
  product,
  priceData,
  formatPrice,
  isOutOfStock,
  isLowStock,
}) => {
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

  return (
    <View style={styles.content}>
      <ThemedText style={styles.brand} numberOfLines={1}>
        {product.brand || 'Brand'}
      </ThemedText>

      <ThemedText style={styles.name} numberOfLines={2}>
        {product.name || 'Product Name'}
      </ThemedText>

      {/* Rating */}
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
        accessibilityLabel={`Price: ${formatPrice(product.price?.current || 0)}${
          product.price?.original && product.price.original > product.price.current
            ? `. Was ${formatPrice(product.price.original)}. You save ${formatPrice(
                priceData.savings
              )}`
            : ''
        }`}
        accessibilityRole="text"
      >
        <ThemedText style={styles.currentPrice}>{formatPrice(product.price?.current || 0)}</ThemedText>
        {product.price?.original && product.price.original > (product.price?.current || 0) && (
          <ThemedText style={styles.originalPrice}>
            {formatPrice(product.price.original)}
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

      {/* Cashback */}
      {product.cashback && (
        <View
          style={styles.cashbackContainer}
          accessibilityLabel={`${product.cashback.percentage || 0}% cashback available`}
          accessibilityRole="text"
        >
          <ThemedText style={styles.cashbackText}>
            {product.cashback.percentage || 0}% cashback
          </ThemedText>
        </View>
      )}

      {/* Availability Status */}
      {availabilityStatus}
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 10,
    paddingBottom: 48,
    flex: 1,
  },
  brand: {
    fontSize: 10,
    color: colors.nileBlue,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    lineHeight: 12,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 6,
    lineHeight: 18,
    minHeight: 36,
    maxHeight: 36,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
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
    marginBottom: 2,
  },
  cashbackContainer: {
    alignSelf: 'flex-start',
    backgroundColor: colors.indigoMist,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  cashbackText: {
    fontSize: 11,
    color: '#4F46E5',
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
});

export default React.memo(ProductInfo);
