/**
 * Food & Dining Module - Skeleton Loaders
 */

import React from 'react';
import { View } from 'react-native';
import SkeletonLoader from '@/components/skeletons/SkeletonLoader';
import { colors } from '@/constants/theme';

export const SectionHeaderSkeleton = React.memo(() => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 16 }}>
    <SkeletonLoader width={20} height={20} variant="circle" />
    <SkeletonLoader width={150} height={18} borderRadius={6} />
    <View style={{ flex: 1 }} />
    <SkeletonLoader width={60} height={12} borderRadius={4} />
  </View>
));

export const RestaurantCardSkeleton = React.memo(({ count = 3, variant = 'default' }: { count?: number; variant?: 'default' | 'compact' }) => {
  const isCompact = variant === 'compact';
  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ backgroundColor: colors.background.primary, borderRadius: 12, overflow: 'hidden' }}>
          {!isCompact && <SkeletonLoader width="100%" height={140} borderRadius={0} />}
          <View style={{ padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isCompact && <SkeletonLoader width={48} height={48} borderRadius={8} />}
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonLoader width="70%" height={14} borderRadius={4} />
                <SkeletonLoader width="50%" height={10} borderRadius={4} />
              </View>
              <SkeletonLoader width={36} height={18} borderRadius={9} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <SkeletonLoader width={60} height={10} borderRadius={4} />
              <SkeletonLoader width={80} height={10} borderRadius={4} />
              <SkeletonLoader width={50} height={10} borderRadius={4} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
});

export const DishCardSkeleton = React.memo(({ count = 4 }: { count?: number }) => (
  <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12 }}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={{ width: 140, marginRight: 12 }}>
        <SkeletonLoader width={140} height={100} borderRadius={10} />
        <SkeletonLoader width={100} height={12} borderRadius={4} style={{ marginTop: 8 }} />
        <SkeletonLoader width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} />
      </View>
    ))}
  </View>
));
