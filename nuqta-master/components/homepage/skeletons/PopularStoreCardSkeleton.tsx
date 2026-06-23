import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import SkeletonCard from '@/components/common/SkeletonCard';
import { colors } from '@/constants/theme';

interface PopularStoreCardSkeletonProps {
  width?: number;
}

/**
 * Popular Store Card Skeleton Loader
 *
 * Matches the layout of PopularStoreCard component:
 * - Store logo (48x48)
 * - Store name and rating
 * - Distance and reward amount
 */
function PopularStoreCardSkeleton({ width = 170 }: PopularStoreCardSkeletonProps) {
  return (
    <View
      style={[styles.container, { width }]}
      accessibilityLabel="Loading store"
      accessibilityRole="none"
    >
      <View style={styles.card}>
        {/* Logo and Info Row */}
        <View style={styles.mainRow}>
          {/* Store Logo Skeleton */}
          <SkeletonCard
            width={48}
            height={48}
            borderRadius={10}
            style={styles.logo}
          />

          {/* Store Info */}
          <View style={styles.infoContainer}>
            {/* Store Name */}
            <SkeletonCard
              width={90}
              height={14}
              borderRadius={4}
              style={styles.name}
            />

            {/* Rating */}
            <View style={styles.ratingRow}>
              <SkeletonCard
                width={12}
                height={12}
                variant="circle"
              />
              <SkeletonCard
                width={24}
                height={12}
                borderRadius={4}
                style={styles.ratingText}
              />
            </View>
          </View>
        </View>

        {/* Bottom Row - Distance and Reward */}
        <View style={styles.bottomRow}>
          <SkeletonCard
            width={70}
            height={12}
            borderRadius={4}
          />
          <SkeletonCard
            width={40}
            height={16}
            borderRadius={4}
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
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(11, 34, 64, 0.06)',
      },
    }),
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    marginRight: 10,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default React.memo(PopularStoreCardSkeleton);
