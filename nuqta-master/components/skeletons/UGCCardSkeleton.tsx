// @ts-nocheck
/**
 * UGCCardSkeleton - Matches UGC card layout (tall portrait)
 *
 * Shows skeleton for:
 * - Square/portrait image/video
 * - View count badge (top-left)
 * - Like/bookmark buttons (top-right)
 * - Product plate at bottom (avatar, name, price)
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

interface UGCCardSkeletonProps {
  cardWidth?: number;
  cardHeight?: number;
}

function UGCCardSkeleton({
  cardWidth = 200,
  cardHeight = 355
}: UGCCardSkeletonProps) {
  return (
    <View
      style={[styles.card, { width: cardWidth, height: cardHeight }]}
      accessibilityLabel="Loading content"
      accessibilityRole="none"
    >
      {/* Main Image/Video Skeleton */}
      <SkeletonLoader
        width="100%"
        height="100%"
        borderRadius={18}
      />

      {/* View Count Badge (top-left) */}
      <View style={styles.viewCountBadge}>
        <SkeletonLoader
          width={60}
          height={24}
          borderRadius={12}
        />
      </View>

      {/* Action Buttons (top-right) */}
      <View style={styles.actionsContainer}>
        <SkeletonLoader
          width={32}
          height={32}
          variant="circle"
          style={styles.actionButton}
        />
        <SkeletonLoader
          width={32}
          height={32}
          variant="circle"
          style={styles.actionButton}
        />
      </View>

      {/* Product Plate (bottom) */}
      <View style={styles.productPlate}>
        <SkeletonLoader
          width={36}
          height={36}
          borderRadius={8}
          style={styles.productThumb}
        />
        <View style={styles.productInfo}>
          <SkeletonLoader
            width="80%"
            height={13}
            borderRadius={4}
            style={styles.productTitle}
          />
          <SkeletonLoader
            width="50%"
            height={12}
            borderRadius={4}
            style={styles.productPrice}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.neutral[100],
    shadowColor: colors.neutral[800],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  viewCountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  actionsContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  actionButton: {
    marginBottom: 8,
  },
  productPlate: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  productThumb: {
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    marginBottom: 4,
  },
  productPrice: {},
});

export default React.memo(UGCCardSkeleton);
