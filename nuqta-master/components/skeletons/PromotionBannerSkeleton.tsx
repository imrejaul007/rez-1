/**
 * PromotionBannerSkeleton - Skeleton for promotion banners
 *
 * Shows skeleton for:
 * - Banner image
 * - Promotion details
 * - CTA buttons
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

interface PromotionBannerSkeletonProps {
  count?: number;
}

function PromotionBannerSkeleton({ count = 2 }: PromotionBannerSkeletonProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.banner}>
          {/* Banner Image */}
          <SkeletonLoader
            width="100%"
            height={140}
            borderRadius={12}
            style={styles.bannerImage}
          />

          {/* Title */}
          <SkeletonLoader
            width="70%"
            height={18}
            borderRadius={4}
            style={styles.title}
          />

          {/* Description */}
          <SkeletonLoader
            width="90%"
            height={14}
            borderRadius={4}
            style={styles.description}
          />

          {/* CTA Row */}
          <View style={styles.ctaRow}>
            <SkeletonLoader
              width={100}
              height={36}
              borderRadius={18}
            />
            <SkeletonLoader
              width={100}
              height={36}
              borderRadius={18}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  banner: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  bannerImage: {
    marginBottom: 12,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 12,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default React.memo(PromotionBannerSkeleton);
