/**
 * UGCCardSkeleton - UGC card skeleton
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

function UGCCardSkeleton() {
  return (
    <View style={styles.card} accessibilityLabel="Loading content" accessibilityRole="none">
      <SkeletonLoader width="100%" height={200} style={styles.mb} borderRadius={8} />
      <View style={styles.row}>
        <SkeletonLoader width={32} height={32} borderRadius={16} style={styles.mr} />
        <SkeletonLoader width={120} height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  mr: { marginRight: 8 },
  mb: { marginBottom: 8 },
});

export default UGCCardSkeleton;
