/**
 * CategoryGridSkeleton - Category grid skeleton
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

interface CategoryGridSkeletonProps {
  count?: number;
}

function CategoryGridSkeleton({ count = 8 }: CategoryGridSkeletonProps) {
  return (
    <View style={styles.grid} accessibilityLabel="Loading categories" accessibilityRole="none">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.item}>
          <SkeletonLoader width={56} height={56} borderRadius={28} style={styles.mb} />
          <SkeletonLoader width="80%" height={12} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  item: { width: '22%', alignItems: 'center' },
  mb: { marginBottom: 8 },
});

export default CategoryGridSkeleton;
