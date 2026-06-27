/**
 * ProfileSkeleton - Profile page skeleton
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

function ProfileSkeleton() {
  return (
    <View style={styles.container} accessibilityLabel="Loading profile" accessibilityRole="none">
      <View style={styles.header}>
        <SkeletonLoader width={80} height={80} borderRadius={40} style={styles.mb} />
        <SkeletonLoader width="60%" height={20} style={styles.mb} />
        <SkeletonLoader width="40%" height={14} />
      </View>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonLoader width="90%" height={16} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { alignItems: 'center', paddingVertical: 24 },
  row: { paddingVertical: 12 },
  mb: { marginBottom: 8 },
});

export default ProfileSkeleton;
