/**
 * VoucherCardSkeleton - Voucher card skeleton
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

function VoucherCardSkeleton() {
  return (
    <View style={styles.card} accessibilityLabel="Loading voucher" accessibilityRole="none">
      <View style={styles.row}>
        <SkeletonLoader width={60} height={60} borderRadius={8} style={styles.mr} />
        <View style={styles.flex1}>
          <SkeletonLoader width="80%" height={16} style={styles.mb} />
          <SkeletonLoader width="60%" height={12} />
        </View>
        <SkeletonLoader width={70} height={28} borderRadius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, marginBottom: 8, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  mr: { marginRight: 12 },
  flex1: { flex: 1 },
  mb: { marginBottom: 6 },
});

export default VoucherCardSkeleton;
