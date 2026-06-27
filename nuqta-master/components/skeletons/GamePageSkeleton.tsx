/**
 * GamePageSkeleton - Game page skeleton
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

function GamePageSkeleton() {
  return (
    <View style={styles.container} accessibilityLabel="Loading game" accessibilityRole="none">
      <SkeletonLoader width="100%" height={200} style={styles.mb} borderRadius={12} />
      <SkeletonLoader width="70%" height={24} style={styles.mb} />
      <SkeletonLoader width="50%" height={16} style={styles.mb} />
      <View style={styles.row}>
        <SkeletonLoader width="48%" height={48} borderRadius={8} />
        <SkeletonLoader width="48%" height={48} borderRadius={8} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  mb: { marginBottom: 12 },
});

export default GamePageSkeleton;
