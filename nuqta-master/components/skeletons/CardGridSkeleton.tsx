/**
 * CardGridSkeleton - Card grid skeleton - matches the layout of a grid of cards
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

interface CardGridSkeletonProps {
  count?: number;
  columns?: number;
}

function CardGridSkeleton({ count = 6, columns = 2 }: CardGridSkeletonProps) {
  const cols = columns;
  return (
    <View style={styles.grid} accessibilityLabel="Loading cards" accessibilityRole="none">
      {Array.from({ length: count * cols }).map((_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonLoader width="100%" height={120} borderRadius={12} style={styles.mb} />
          <SkeletonLoader width="80%" height={14} style={styles.mb} />
          <SkeletonLoader width="60%" height={14} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%' },
  mb: { marginBottom: 8 },
});

export default CardGridSkeleton;
