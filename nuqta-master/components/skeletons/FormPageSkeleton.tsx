/**
 * FormPageSkeleton - Form page skeleton - stacked input fields
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

function FormPageSkeleton() {
  return (
    <View style={styles.container} accessibilityLabel="Loading form" accessibilityRole="none">
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.field}>
          <SkeletonLoader width={80} height={12} style={styles.mb} />
          <SkeletonLoader width="100%" height={44} borderRadius={8} />
        </View>
      ))}
      <SkeletonLoader width="100%" height={48} borderRadius={8} style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  field: { marginBottom: 16 },
  mb: { marginBottom: 6 },
  btn: { marginTop: 16 },
});

export default FormPageSkeleton;
