/**
 * TransactionListSkeleton - Transaction list skeleton
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

interface TransactionListSkeletonProps {
  count?: number;
}

function TransactionListSkeleton({ count = 6 }: TransactionListSkeletonProps) {
  return (
    <View style={styles.container} accessibilityLabel="Loading transactions" accessibilityRole="none">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonLoader width={40} height={40} borderRadius={20} style={styles.mr} />
          <View style={styles.flex1}>
            <SkeletonLoader width="60%" height={14} style={styles.mb} />
            <SkeletonLoader width="40%" height={12} />
          </View>
          <SkeletonLoader width={60} height={16} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  mr: { marginRight: 12 },
  flex1: { flex: 1 },
  mb: { marginBottom: 6 },
});

export default TransactionListSkeleton;
