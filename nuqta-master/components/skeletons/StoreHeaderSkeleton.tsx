/**
 * StoreHeaderSkeleton - Matches store header layout
 *
 * Shows skeleton for:
 * - Store logo (circle)
 * - Store name
 * - Rating (stars + count)
 * - Follow button
 * - Action buttons (call, directions, share)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

function StoreHeaderSkeleton() {
  return (
    <View
      style={styles.container}
      accessibilityLabel="Loading store information"
      accessibilityRole="none"
    >
      {/* Store Logo */}
      <SkeletonLoader
        width={80}
        height={80}
        variant="circle"
        style={styles.logo}
      />

      {/* Store Name */}
      <SkeletonLoader
        width={180}
        height={24}
        borderRadius={6}
        style={styles.storeName}
      />

      {/* Rating Row */}
      <View style={styles.ratingRow}>
        <SkeletonLoader
          width={100}
          height={18}
          borderRadius={4}
        />
        <SkeletonLoader
          width={60}
          height={16}
          borderRadius={4}
        />
      </View>

      {/* Location Info */}
      <View style={styles.locationRow}>
        <SkeletonLoader
          width={16}
          height={16}
          variant="circle"
          style={styles.locationIcon}
        />
        <SkeletonLoader
          width={140}
          height={14}
          borderRadius={4}
        />
      </View>

      {/* Follow Button */}
      <SkeletonLoader
        width={120}
        height={40}
        borderRadius={20}
        style={styles.followButton}
      />

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        <SkeletonLoader
          width={100}
          height={44}
          borderRadius={12}
        />
        <SkeletonLoader
          width={100}
          height={44}
          borderRadius={12}
        />
        <SkeletonLoader
          width={100}
          height={44}
          borderRadius={12}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: 20,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  logo: {
    marginBottom: 16,
  },
  storeName: {
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  locationIcon: {},
  followButton: {
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 12,
  },
});

export default React.memo(StoreHeaderSkeleton);
