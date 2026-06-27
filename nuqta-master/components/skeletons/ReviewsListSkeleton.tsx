/**
 * ReviewsListSkeleton - Reviews list skeleton
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

interface ReviewsListSkeletonProps {
  count?: number;
}

function ReviewsListSkeleton({ count = 3 }: ReviewsListSkeletonProps) {
  return (
    <View style={styles.container} accessibilityLabel="Loading reviews" accessibilityRole="none">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.item}>
          <View style={styles.header}>
            <SkeletonLoader width={36} height={36} borderRadius={18} style={styles.mr} />
            <SkeletonLoader width={120} height={14} />
          </View>
          <SkeletonLoader width="100%" height={12} style={styles.mb} />
          <SkeletonLoader width="80%" height={12} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  item: { padding: 12, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mr: { marginRight: 8 },
  mb: { marginBottom: 6 },
});

export default ReviewsListSkeleton;
