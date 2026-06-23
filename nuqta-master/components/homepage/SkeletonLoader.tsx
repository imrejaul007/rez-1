// @ts-nocheck
import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { useShimmer } from '@/contexts/ShimmerContext';
import { colors } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

interface SkeletonLoaderProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({
  width = 100,
  height = 20,
  borderRadius = 4,
  style
}: SkeletonLoaderProps) {
  const shimmerAnim = useShimmer();
  const opacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        opacityStyle,
        style,
      ]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no"
    />
  );
}

// Skeleton for Event Card
export function EventCardSkeleton({ width = 280 }: { width?: number }) {
  return (
    <View
      style={[styles.cardSkeleton, { width }]}
      accessibilityLabel="Loading event"
      accessibilityRole="none"
    >
      <SkeletonLoader width={width} height={140} borderRadius={12} />
      <View style={styles.cardContent}>
        <SkeletonLoader width={width * 0.8} height={16} style={styles.skeletonMargin} />
        <SkeletonLoader width={width * 0.6} height={14} style={styles.skeletonMargin} />
        <SkeletonLoader width={width * 0.4} height={12} style={styles.skeletonMargin} />
        <SkeletonLoader width={width * 0.5} height={12} />
      </View>
    </View>
  );
}

// Skeleton for Store Card
export function StoreCardSkeleton({ width = 280 }: { width?: number }) {
  return (
    <View
      style={[styles.cardSkeleton, { width }]}
      accessibilityLabel="Loading store"
      accessibilityRole="none"
    >
      <SkeletonLoader width={width} height={140} borderRadius={12} />
      <View style={styles.cardContent}>
        <View style={styles.storeHeader}>
          <SkeletonLoader width={width * 0.6} height={16} />
          <SkeletonLoader width={60} height={14} />
        </View>
        <SkeletonLoader width={width * 0.9} height={14} style={styles.skeletonMargin} />
        <View style={styles.storeFooter}>
          <SkeletonLoader width={width * 0.45} height={12} />
          <SkeletonLoader width={width * 0.3} height={12} />
        </View>
      </View>
    </View>
  );
}

// Skeleton for Product Card
export function ProductCardSkeleton({ width = 200 }: { width?: number }) {
  return (
    <View
      style={[styles.cardSkeleton, { width }]}
      accessibilityLabel="Loading product"
      accessibilityRole="none"
    >
      <SkeletonLoader width={width} height={120} borderRadius={12} />
      <View style={styles.cardContent}>
        <SkeletonLoader width={width * 0.4} height={12} style={styles.skeletonMargin} />
        <SkeletonLoader width={width * 0.85} height={14} style={styles.skeletonMargin} />
        <View style={styles.productPrice}>
          <SkeletonLoader width={80} height={16} />
          <SkeletonLoader width={60} height={14} />
        </View>
        <SkeletonLoader width={width} height={32} borderRadius={8} style={styles.skeletonMargin} />
      </View>
    </View>
  );
}

// Skeleton for Branded Store Card
export function BrandedStoreCardSkeleton({ width = 200 }: { width?: number }) {
  return (
    <View
      style={[styles.brandedCardSkeleton, { width }]}
      accessibilityLabel="Loading store"
      accessibilityRole="none"
    >
      <SkeletonLoader width={width * 0.8} height={12} style={styles.skeletonMargin} />
      <SkeletonLoader width={60} height={60} borderRadius={30} style={styles.skeletonMargin} />
      <SkeletonLoader width={width * 0.7} height={16} style={styles.skeletonMargin} />
      <SkeletonLoader width={width * 0.6} height={12} />
    </View>
  );
}

// Skeleton for Section Header
export function SectionHeaderSkeleton() {
  return (
    <View style={styles.sectionHeader}>
      <SkeletonLoader width={150} height={20} />
    </View>
  );
}

// Skeleton for Horizontal Section
export function HorizontalSectionSkeleton({ 
  cardType = 'default',
  cardCount = 3 
}: {
  cardType?: 'event' | 'store' | 'product' | 'branded' | 'default';
  cardCount?: number;
}) {
  const renderSkeletonCard = () => {
    switch (cardType) {
      case 'event':
        return <EventCardSkeleton />;
      case 'store':
        return <StoreCardSkeleton />;
      case 'product':
        return <ProductCardSkeleton />;
      case 'branded':
        return <BrandedStoreCardSkeleton />;
      default:
        return <StoreCardSkeleton />;
    }
  };

  return (
    <View style={styles.sectionSkeleton}>
      <SectionHeaderSkeleton />
      <View style={styles.horizontalContent}>
        {Array.from({ length: cardCount }, (_, index) => (
          <View key={index} style={styles.skeletonCard}>
            {renderSkeletonCard()}
          </View>
        ))}
      </View>
    </View>
  );
}

// Complete Homepage Skeleton
export function HomepageSkeleton() {
  return (
    <View
      style={styles.homepageSkeleton}
      accessibilityLabel="Loading homepage"
      accessibilityRole="none"
    >
      {/* Header Skeleton */}
      <View style={styles.headerSkeleton}>
        <View style={styles.headerTop}>
          <SkeletonLoader width={100} height={16} />
          <View style={styles.headerRight}>
            <SkeletonLoader width={60} height={16} />
            <SkeletonLoader width={24} height={24} borderRadius={12} />
            <SkeletonLoader width={32} height={32} borderRadius={16} />
          </View>
        </View>
        <SkeletonLoader width={200} height={24} style={styles.skeletonMargin} />
        <SkeletonLoader width={screenWidth - 40} height={48} borderRadius={24} />
      </View>

      {/* Quick Actions Skeleton */}
      <View style={styles.quickActionsSkeleton}>
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} style={styles.quickAction}>
            <SkeletonLoader width={40} height={40} borderRadius={20} />
            <SkeletonLoader width={32} height={12} style={{ marginTop: 4 }} />
            <SkeletonLoader width={24} height={10} />
          </View>
        ))}
      </View>

      {/* Sections Skeleton */}
      <HorizontalSectionSkeleton cardType="event" />
      <HorizontalSectionSkeleton cardType="product" />
      <HorizontalSectionSkeleton cardType="store" />
      <HorizontalSectionSkeleton cardType="branded" />
    </View>
);
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.neutral[200],
  },
  cardSkeleton: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  brandedCardSkeleton: {
    backgroundColor: colors.offWhite,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardContent: {
    padding: 16,
  },
  skeletonMargin: {
    marginBottom: 8,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  productPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionSkeleton: {
    marginBottom: 24,
  },
  horizontalContent: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
  },
  skeletonCard: {
    // Individual card styling
  },
  homepageSkeleton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerSkeleton: {
    backgroundColor: colors.brand.purpleLight,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  quickActionsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
});

export default React.memo(SkeletonLoader);