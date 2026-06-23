import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import SkeletonCard from '@/components/common/SkeletonCard';
import { colors } from '@/constants/theme';

interface StoreCardSkeletonProps {
  width?: number;
}

/**
 * Store Card Skeleton Loader
 *
 * Matches the layout of StoreCard component:
 * - Store image (140px height)
 * - Store name and rating
 * - Description (2 lines)
 * - Location and delivery time
 * - Cashback badge and minimum order
 */
function StoreCardSkeleton({ width = 280 }: StoreCardSkeletonProps) {
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
          {/* Header: Name and Rating */}
          <View style={styles.header}>
            <SkeletonCard
              width={120}
              height={18}
              borderRadius={4}
            />
            <View style={styles.ratingContainer}>
              <SkeletonCard
                width={16}
                height={16}
                variant="circle"
                style={styles.starIcon}
              />
              <SkeletonCard
                width={25}
                height={14}
                borderRadius={4}
                style={styles.ratingText}
              />
              <SkeletonCard
                width={30}
                height={12}
                borderRadius={4}
              />
            </View>
          </View>

          {/* Description - Line 1 */}
          <SkeletonCard
            width="95%"
            height={14}
            borderRadius={4}
            style={styles.descriptionFirst}
          />

          {/* Description - Line 2 */}
          <SkeletonCard
            width="75%"
            height={14}
            borderRadius={4}
            style={styles.descriptionSecond}
          />

          {/* Location and Delivery Info */}
          <View style={styles.locationInfo}>
            <View style={styles.locationContainer}>
              <SkeletonCard
                width={14}
                height={14}
                variant="circle"
                style={styles.icon}
              />
              <SkeletonCard
                width={70}
                height={13}
                borderRadius={4}
              />
            </View>

            <View style={styles.deliveryContainer}>
              <SkeletonCard
                width={14}
                height={14}
                variant="circle"
                style={styles.icon}
              />
              <SkeletonCard
                width={50}
                height={13}
                borderRadius={4}
              />
            </View>
          </View>

          {/* Footer: Cashback and Min Order */}
          <View style={styles.footer}>
            <SkeletonCard
              width={100}
              height={24}
              borderRadius={6}
            />
            <SkeletonCard
              width={50}
              height={12}
              borderRadius={4}
            />
          </View>
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  image: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    marginRight: 4,
  },
  descriptionFirst: {
    marginBottom: 4,
  },
  descriptionSecond: {
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    marginRight: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default React.memo(StoreCardSkeleton);
