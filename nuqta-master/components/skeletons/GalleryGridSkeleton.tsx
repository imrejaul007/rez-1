// GalleryGridSkeleton.tsx
// Skeleton loader for gallery grid

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = (SCREEN_WIDTH - 48) / 3;

function GalleryGridSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SkeletonLoader width={100} height={24} borderRadius={4} />
        <SkeletonLoader width={80} height={20} borderRadius={4} />
      </View>
      
      {/* Category filter skeleton */}
      <View style={styles.categoryFilter}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonLoader
            key={i}
            width={80}
            height={32}
            borderRadius={16}
            style={styles.categoryChip}
          />
        ))}
      </View>

      {/* Gallery grid skeleton */}
      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonLoader
            key={i}
            width={ITEM_SIZE}
            height={ITEM_SIZE}
            borderRadius={8}
            style={styles.gridItem}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  categoryFilter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  categoryChip: {
    marginRight: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 4,
  },
  gridItem: {
    margin: 2,
  },
});

export default React.memo(GalleryGridSkeleton);
