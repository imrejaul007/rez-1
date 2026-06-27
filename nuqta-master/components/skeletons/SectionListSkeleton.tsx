/**
 * SectionListSkeleton - Section list skeleton - vertical list of sections
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

interface SectionListSkeletonProps {
  count?: number;
}

function SectionListSkeleton({ count = 4 }: SectionListSkeletonProps) {
  return (
    <View style={styles.container} accessibilityLabel="Loading sections" accessibilityRole="none">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.section}>
          <SkeletonLoader width={120} height={18} style={styles.mb} />
          <SkeletonLoader width="100%" height={80} borderRadius={8} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  section: { marginBottom: 16 },
  mb: { marginBottom: 8 },
});

export default SectionListSkeleton;
