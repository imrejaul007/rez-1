/**
 * ProductCardSkeleton - Matches StoreProductCard layout
 *
 * Shows skeleton for:
 * - Product image (180x180)
 * - Product title (2 lines)
 * - Rating stars
 * - Price
 * - Add to cart button
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

function ProductCardSkeleton() {
  return (
    <View
      style={styles.card}
      accessibilityLabel="Loading product"
      accessibilityRole="none"
    >
      {/* Image Skeleton */}
      <SkeletonLoader
        width="100%"
        height={180}
        borderRadius={12}
        style={styles.image}
      />

      {/* Info Container */}
      <View style={styles.infoContainer}>
        {/* Title Lines (2 lines) */}
        <SkeletonLoader
          width="95%"
          height={14}
          borderRadius={4}
          style={styles.titleLine1}
        />
        <SkeletonLoader
          width="70%"
          height={14}
          borderRadius={4}
          style={styles.titleLine2}
        />

        {/* Rating Skeleton */}
        <View style={styles.ratingContainer}>
          <SkeletonLoader
            width={80}
            height={12}
            borderRadius={4}
          />
        </View>

        {/* Price Row */}
        <View style={styles.priceRow}>
          <SkeletonLoader
            width={90}
            height={18}
            borderRadius={6}
          />
          <SkeletonLoader
            width={50}
            height={14}
            borderRadius={4}
          />
        </View>

        {/* Cashback Badge */}
        <SkeletonLoader
          width={100}
          height={20}
          borderRadius={10}
          style={styles.cashbackBadge}
        />

        {/* Add to Cart Button */}
        <SkeletonLoader
          width="100%"
          height={44}
          borderRadius={12}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  image: {
    marginBottom: 0,
  },
  infoContainer: {
    padding: 12,
  },
  titleLine1: {
    marginBottom: 6,
  },
  titleLine2: {
    marginBottom: 10,
  },
  ratingContainer: {
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cashbackBadge: {
    marginBottom: 12,
  },
  button: {
    marginTop: 4,
  },
});

export default React.memo(ProductCardSkeleton);
