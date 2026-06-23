// @ts-nocheck
import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import SkeletonCard from '@/components/common/SkeletonCard';
import { ThemedView } from '@/components/ThemedView';
import TopStoreCardSkeleton from './TopStoreCardSkeleton';
import PopularStoreCardSkeleton from './PopularStoreCardSkeleton';

interface StoreDiscoverySkeletonProps {
  showTopStores?: boolean;
  showPopularStores?: boolean;
}

/**
 * Store Discovery Section Skeleton Loader
 *
 * Shows skeleton for the entire Store Discovery section:
 * - "Today's Top Stores" section with horizontal cards
 * - "Popular Near You" section with compact cards
 */
function StoreDiscoverySkeleton({
  showTopStores = true,
  showPopularStores = true,
}: StoreDiscoverySkeletonProps) {
  // Generate array of skeleton cards for Top Stores
  const topStoreSkeletons = Array.from({ length: 4 }, (_, index) => ({
    id: `top-skeleton-${index}`,
  }));

  // Generate array of skeleton cards for Popular Stores
  const popularStoreSkeletons = Array.from({ length: 4 }, (_, index) => ({
    id: `popular-skeleton-${index}`,
  }));

  const renderTopStoreSkeletonItem = useCallback(({ item, index }: { item: { id: string }; index: number }) => (
    <View
      style={[
        styles.cardContainer,
        { marginRight: index === topStoreSkeletons.length - 1 ? 0 : 12 },
      ]}
    >
      <TopStoreCardSkeleton width={180} />
    </View>
  ), [topStoreSkeletons.length]);

  const renderPopularStoreSkeletonItem = useCallback(({ item, index }: { item: { id: string }; index: number }) => (
    <View
      style={[
        styles.cardContainer,
        { marginRight: index === popularStoreSkeletons.length - 1 ? 0 : 12 },
      ]}
    >
      <PopularStoreCardSkeleton width={170} />
    </View>
  ), [popularStoreSkeletons.length]);

  const renderTopStoresSkeleton = () => (
    <ThemedView style={styles.sectionContainer}>
      {/* Section Header Skeleton */}
      <View style={styles.sectionHeader}>
        <SkeletonCard
          width={160}
          height={22}
          borderRadius={6}
        />
        <SkeletonCard
          width={60}
          height={16}
          borderRadius={4}
        />
      </View>

      {/* Horizontal Scroll Content Skeleton */}
      {Platform.OS === 'web' ? (
        <FlashList
          data={topStoreSkeletons}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.webFlatListContainer}
          removeClippedSubviews={false}
          scrollEnabled={false}
          renderItem={renderTopStoreSkeletonItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={110}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={false}
        >
          {topStoreSkeletons.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.cardContainer,
                { marginRight: index === topStoreSkeletons.length - 1 ? 0 : 12 },
              ]}
            >
              <TopStoreCardSkeleton width={180} />
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );

  const renderPopularStoresSkeleton = () => (
    <ThemedView style={styles.sectionContainer}>
      {/* Section Header Skeleton */}
      <View style={styles.sectionHeader}>
        <SkeletonCard
          width={140}
          height={22}
          borderRadius={6}
        />
        <SkeletonCard
          width={60}
          height={16}
          borderRadius={4}
        />
      </View>

      {/* Horizontal Scroll Content Skeleton */}
      {Platform.OS === 'web' ? (
        <FlashList
          data={popularStoreSkeletons}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.webFlatListContainer}
          removeClippedSubviews={false}
          scrollEnabled={false}
          renderItem={renderPopularStoreSkeletonItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={110}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={false}
        >
          {popularStoreSkeletons.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.cardContainer,
                { marginRight: index === popularStoreSkeletons.length - 1 ? 0 : 12 },
              ]}
            >
              <PopularStoreCardSkeleton width={170} />
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      {showTopStores && renderTopStoresSkeleton()}
      {showPopularStores && renderPopularStoresSkeleton()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  webFlatListContainer: {
    overflow: 'scroll',
  },
  cardContainer: {
    flex: 0,
    flexShrink: 0,
  },
});

export default React.memo(StoreDiscoverySkeleton);
