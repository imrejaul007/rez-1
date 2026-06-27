/**
 * DetailPageSkeleton - Detail page skeleton - header image + body content
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

function DetailPageSkeleton() {
  return (
    <View style={styles.container} accessibilityLabel="Loading details" accessibilityRole="none">
      <SkeletonLoader width="100%" height={240} style={styles.mb} />
      <View style={styles.body}>
        <SkeletonLoader width="90%" height={24} style={styles.mb} />
        <SkeletonLoader width="70%" height={16} style={styles.mb} />
        <SkeletonLoader width="100%" height={14} style={styles.mb} />
        <SkeletonLoader width="100%" height={14} style={styles.mb} />
        <SkeletonLoader width="80%" height={14} style={styles.mb} />
        <SkeletonLoader width="50%" height={40} style={styles.btn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16 },
  mb: { marginBottom: 12 },
  btn: { marginTop: 16, borderRadius: 8 },
});

export default DetailPageSkeleton;
