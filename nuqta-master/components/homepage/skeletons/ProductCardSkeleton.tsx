import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import SkeletonCard from '@/components/common/SkeletonCard';
import { colors } from '@/constants/theme';

interface ProductCardSkeletonProps {
  width?: number;
}

/**
 * Product Card Skeleton Loader
 *
 * Matches the layout of ProductCard component:
 * - Image placeholder (120px height)
 * - Brand text
 * - Product name (2 lines)
 * - Rating stars and count
 * - Price information
 * - Cashback badge
 * - Add to Cart button
 */
function ProductCardSkeleton({ width = 180 }: ProductCardSkeletonProps) {
  return (
    <View
      style={[styles.container, { width }]}
      accessibilityLabel="Loading product"
      accessibilityRole="none"
    >
      <View style={styles.card}>
        {/* Product Image Skeleton */}
        <SkeletonCard
          width="100%"
          height={120}
          borderRadius={0}
          variant="rectangle"
          style={styles.image}
        />

        {/* Product Details */}
        <View style={styles.content}>
          {/* Brand */}
          <SkeletonCard
            width="50%"
            height={12}
            borderRadius={4}
            style={styles.brand}
          />

          {/* Product Name - Line 1 */}
          <SkeletonCard
            width="90%"
            height={14}
            borderRadius={4}
            style={styles.nameFirst}
          />

          {/* Product Name - Line 2 */}
          <SkeletonCard
            width="70%"
            height={14}
            borderRadius={4}
            style={styles.nameSecond}
          />

          {/* Rating Container */}
          <View style={styles.ratingContainer}>
            <SkeletonCard
              width={12}
              height={12}
              variant="circle"
              style={styles.star}
            />
            <SkeletonCard
              width={12}
              height={12}
              variant="circle"
              style={styles.star}
            />
            <SkeletonCard
              width={12}
              height={12}
              variant="circle"
              style={styles.star}
            />
            <SkeletonCard
              width={12}
              height={12}
              variant="circle"
              style={styles.star}
            />
            <SkeletonCard
              width={12}
              height={12}
              variant="circle"
              style={styles.star}
            />
            <SkeletonCard
              width={30}
              height={10}
              borderRadius={4}
              style={styles.ratingCount}
            />
          </View>

          {/* Price Information */}
          <View style={styles.priceContainer}>
            <SkeletonCard
              width={60}
              height={16}
              borderRadius={4}
            />
            <SkeletonCard
              width={50}
              height={14}
              borderRadius={4}
            />
          </View>

          {/* Savings Text */}
          <SkeletonCard
            width="65%"
            height={12}
            borderRadius={4}
            style={styles.savings}
          />

          {/* Cashback Badge */}
          <SkeletonCard
            width={80}
            height={20}
            borderRadius={6}
            style={styles.cashback}
          />
        </View>

        {/* Add to Cart Button Skeleton */}
        <View style={styles.bottomSection}>
          <SkeletonCard
            width="100%"
            height={36}
            borderRadius={8}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
    flexShrink: 0,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    height: 320,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  image: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  content: {
    padding: 10,
    paddingBottom: 48,
    flex: 1,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  brand: {
    marginBottom: 4,
  },
  nameFirst: {
    marginBottom: 4,
  },
  nameSecond: {
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  star: {
    marginRight: 2,
  },
  ratingCount: {
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  savings: {
    marginBottom: 2,
  },
  cashback: {
    marginBottom: 8,
  },
});

export default React.memo(ProductCardSkeleton);
