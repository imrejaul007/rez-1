/**
 * PromotionBannerSkeleton - Promotion banner skeleton
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

function PromotionBannerSkeleton() {
  return (
    <View style={styles.container} accessibilityLabel="Loading promotion" accessibilityRole="none">
      <SkeletonLoader width="100%" height={120} borderRadius={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
});

export default PromotionBannerSkeleton;
