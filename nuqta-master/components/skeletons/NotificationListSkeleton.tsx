/**
 * NotificationListSkeleton - For notification list screens
 *
 * Layout: rows with circle avatar + text lines + timestamp
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

function NotificationRow() {
  return (
    <View style={styles.row}>
      <SkeletonLoader width={40} height={40} variant="circle" />
      <View style={styles.textContainer}>
        <SkeletonLoader width="80%" height={14} borderRadius={4} />
        <SkeletonLoader width="55%" height={12} borderRadius={4} style={styles.subtitle} />
      </View>
      <SkeletonLoader width={40} height={10} borderRadius={4} />
    </View>
  );
}

function NotificationListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <SkeletonLoader width={160} height={20} borderRadius={6} style={styles.header} />

      {Array.from({ length: count }).map((_, i) => (
        <NotificationRow key={i} />
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
  header: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    gap: 6,
  },
  subtitle: {
    marginTop: 2,
  },
});

export default React.memo(NotificationListSkeleton);
