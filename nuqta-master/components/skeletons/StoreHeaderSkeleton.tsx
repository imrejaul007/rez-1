/**
 * StoreHeaderSkeleton - Store header skeleton - banner + logo + name
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

function StoreHeaderSkeleton() {
  return (
    <View style={styles.container} accessibilityLabel="Loading store" accessibilityRole="none">
      <SkeletonLoader width="100%" height={140} style={styles.mb} />
      <View style={styles.row}>
        <SkeletonLoader width={64} height={64} borderRadius={32} style={styles.mr} />
        <View style={styles.flex1}>
          <SkeletonLoader width="70%" height={18} style={styles.mb} />
          <SkeletonLoader width="50%" height={14} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  mr: { marginRight: 12 },
  flex1: { flex: 1 },
  mb: { marginBottom: 8 },
});

export default StoreHeaderSkeleton;
