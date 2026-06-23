/**
 * ProductGridSkeleton - Shows grid of product card skeletons
 *
 * Usage:
 * <ProductGridSkeleton count={6} />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import ProductCardSkeleton from './ProductCardSkeleton';

interface ProductGridSkeletonProps {
  count?: number;
  columns?: number;
}

function ProductGridSkeleton({
  count = 6,
  columns = 2,
}: ProductGridSkeletonProps) {
  return (
    <View style={[styles.grid, { gap: 16 }]}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={{
            width: columns === 2 ? '48%' : columns === 3 ? '31%' : '100%',
          }}
        >
          <ProductCardSkeleton />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

export default React.memo(ProductGridSkeleton);
