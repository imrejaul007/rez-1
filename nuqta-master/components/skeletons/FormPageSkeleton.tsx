/**
 * FormPageSkeleton - For pages with form inputs
 *
 * Layout: title + input fields + submit button
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

function FormPageSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <View style={styles.container}>
      {/* Page Title */}
      <SkeletonLoader width={180} height={22} borderRadius={6} style={styles.title} />
      <SkeletonLoader width="70%" height={14} borderRadius={4} style={styles.subtitle} />

      {/* Form Fields */}
      {Array.from({ length: fields }).map((_, i) => (
        <View key={i} style={styles.field}>
          <SkeletonLoader width={90} height={12} borderRadius={4} style={styles.label} />
          <SkeletonLoader width="100%" height={48} borderRadius={12} />
        </View>
      ))}

      {/* Submit Button */}
      <SkeletonLoader width="100%" height={50} borderRadius={14} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
  },
});

export default React.memo(FormPageSkeleton);
