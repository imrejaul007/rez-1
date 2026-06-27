/**
 * MapViewSkeleton - Map view skeleton
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

function MapViewSkeleton() {
  return (
    <View style={styles.container} accessibilityLabel="Loading map" accessibilityRole="none">
      <SkeletonLoader width="100%" height="100%" />
      <View style={styles.pin}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pin: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20 },
});

export default MapViewSkeleton;
