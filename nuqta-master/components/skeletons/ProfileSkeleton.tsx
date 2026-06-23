/**
 * ProfileSkeleton - For profile/user pages
 *
 * Layout: avatar + name + stats row + content sections
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

function ProfileSkeleton() {
  return (
    <View style={styles.container}>
      {/* Avatar + Name */}
      <View style={styles.header}>
        <SkeletonLoader width={80} height={80} variant="circle" />
        <SkeletonLoader width={140} height={20} borderRadius={6} style={styles.name} />
        <SkeletonLoader width={100} height={14} borderRadius={4} style={styles.handle} />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.statItem}>
            <SkeletonLoader width={40} height={20} borderRadius={6} />
            <SkeletonLoader width={50} height={12} borderRadius={4} style={styles.statLabel} />
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <SkeletonLoader width="48%" height={42} borderRadius={12} />
        <SkeletonLoader width="48%" height={42} borderRadius={12} />
      </View>

      {/* Content Cards */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.contentCard}>
          <SkeletonLoader width="75%" height={14} borderRadius={4} />
          <SkeletonLoader width="50%" height={12} borderRadius={4} style={styles.cardSubtext} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    marginBottom: 20,
  },
  name: {
    marginTop: 12,
  },
  handle: {
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral[100],
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  contentCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardSubtext: {
    marginTop: 6,
  },
});

export default React.memo(ProfileSkeleton);
