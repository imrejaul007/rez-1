/**
 * TransactionListSkeleton - For transaction/earnings list screens
 *
 * Layout: summary card + filter chips + transaction rows
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

function TransactionRow() {
  return (
    <View style={styles.row}>
      <SkeletonLoader width={36} height={36} variant="circle" />
      <View style={styles.rowText}>
        <SkeletonLoader width="70%" height={14} borderRadius={4} />
        <SkeletonLoader width="45%" height={12} borderRadius={4} style={styles.rowSubtext} />
      </View>
      <SkeletonLoader width={60} height={16} borderRadius={4} />
    </View>
  );
}

function TransactionListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <SkeletonLoader width={100} height={12} borderRadius={4} />
        <SkeletonLoader width={140} height={28} borderRadius={6} style={styles.balanceAmount} />
        <View style={styles.summaryRow}>
          <SkeletonLoader width={80} height={12} borderRadius={4} />
          <SkeletonLoader width={80} height={12} borderRadius={4} />
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <SkeletonLoader width={60} height={32} borderRadius={16} />
        <SkeletonLoader width={70} height={32} borderRadius={16} />
        <SkeletonLoader width={65} height={32} borderRadius={16} />
      </View>

      {/* Transaction Rows */}
      {Array.from({ length: count }).map((_, i) => (
        <TransactionRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  balanceAmount: {
    marginTop: 8,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  rowSubtext: {
    marginTop: 2,
  },
});

export default React.memo(TransactionListSkeleton);
