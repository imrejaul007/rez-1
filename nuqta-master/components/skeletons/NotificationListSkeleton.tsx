/**
 * NotificationListSkeleton - Notification list skeleton
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

interface NotificationListSkeletonProps {
  count?: number;
}

function NotificationListSkeleton({ count = 6 }: NotificationListSkeletonProps) {
  return (
    <View style={styles.container} accessibilityLabel="Loading notifications" accessibilityRole="none">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.item}>
          <SkeletonLoader width={40} height={40} borderRadius={20} style={styles.mr} />
          <View style={styles.flex1}>
            <SkeletonLoader width="80%" height={14} style={styles.mb} />
            <SkeletonLoader width="60%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  item: { flexDirection: 'row', padding: 12, borderRadius: 8 },
  mr: { marginRight: 12 },
  flex1: { flex: 1 },
  mb: { marginBottom: 6 },
});

export default NotificationListSkeleton;
