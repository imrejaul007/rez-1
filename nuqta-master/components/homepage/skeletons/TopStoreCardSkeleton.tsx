import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import SkeletonCard from '@/components/common/SkeletonCard';
import { colors } from '@/constants/theme';

interface TopStoreCardSkeletonProps {
  width?: number;
}

/**
 * Top Store Card Skeleton Loader
 *
 * Matches the layout of TopStoreCard component:
 * - Store image (140px height)
 * - Store name
 * - Rating and distance
 * - Earn badge
 */
function TopStoreCardSkeleton({ width = 180 }: TopStoreCardSkeletonProps) {
  return (
    <View
      style={[styles.container, { width }]}
      accessibilityLabel="Loading store"
      accessibilityRole="none"
    >
      <View style={styles.card}>
        {/* Store Image Skeleton */}
        <SkeletonCard
          width="100%"
          height={140}
          borderRadius={0}
          variant="rectangle"
          style={styles.image}
        />

        {/* Store Details */}
        <View style={styles.content}>
          {/* Store Name */}
          <SkeletonCard
            width={120}
            height={16}
            borderRadius={4}
            style={styles.name}
          />

          {/* Rating and Distance Row */}
          <View style={styles.infoRow}>
            <SkeletonCard
              width={14}
              height={14}
              variant="circle"
            />
            <SkeletonCard
              width={28}
              height={14}
              borderRadius={4}
              style={styles.rating}
            />
            <View style={styles.dot} />
            <SkeletonCard
              width={50}
              height={14}
              borderRadius={4}
            />
          </View>

          {/* Earn Badge Skeleton */}
          <SkeletonCard
            width={80}
            height={28}
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
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(26, 58, 82, 0.08)',
      },
    }),
  },
  image: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    padding: 12,
  },
  name: {
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rating: {
    marginLeft: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[200],
    marginHorizontal: 6,
  },
});

export default React.memo(TopStoreCardSkeleton);
