// @ts-nocheck
import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useStoreDiscovery, DiscoveryStore } from '@/hooks/useStoreDiscovery';
import TopStoreCard from './cards/TopStoreCard';
import PopularStoreCard from './cards/PopularStoreCard';
import StoreDiscoverySkeleton from './skeletons/StoreDiscoverySkeleton';
import { colors } from '@/constants/theme';

interface StoreDiscoverySectionProps {
  limit?: number;
}

/**
 * Store Discovery Section
 *
 * Displays two sub-sections:
 * 1. Today's Top Stores - Trending stores with images, ratings, distance, and "Earn ₹X" badges
 * 2. Popular Near You - Location-based stores with compact cards showing logos and rewards
 *
 * Builds trust and confidence for users to try new merchants.
 */
const StoreDiscoverySection = React.memo(function StoreDiscoverySection({
  limit = 10,
}: StoreDiscoverySectionProps) {
  const router = useRouter();
  const {
    topStores,
    popularStores,
    isLoadingTop,
    isLoadingPopular,
    errorTop,
    errorPopular,
  } = useStoreDiscovery(limit);

  // Handle store press - navigate to store page
  const handleStorePress = useCallback(
    (store: DiscoveryStore) => {
      try {
        router.push(`/MainStorePage?storeId=${store.id}` as any);
      } catch (error) {
        // silently handle
      }
    },
    [router]
  );

  // Handle "View all" press for Top Stores
  const handleViewAllTopStores = useCallback(() => {
    try {
      router.push({
        pathname: '/StoreListPage',
        params: { filter: 'trending' },
      });
    } catch (error) {
      // silently handle
    }
  }, [router]);

  // Handle "View all" press for Popular Stores
  const handleViewAllPopularStores = useCallback(() => {
    try {
      router.push({
        pathname: '/StoreListPage',
        params: { filter: 'nearby' },
      });
    } catch (error) {
      // silently handle
    }
  }, [router]);

  // Render Top Store Card
  const renderTopStoreCard = useCallback(
    ({ item, index }: { item: DiscoveryStore; index: number }) => (
      <View
        style={[
          styles.cardContainer,
          { marginRight: index === topStores.length - 1 ? 0 : 12 },
        ]}
      >
        <TopStoreCard
          store={item}
          onPress={handleStorePress}
          width={180}
        />
      </View>
    ),
    [topStores.length, handleStorePress]
  );

  // Render Popular Store Card
  const renderPopularStoreCard = useCallback(
    ({ item, index }: { item: DiscoveryStore; index: number }) => (
      <View
        style={[
          styles.cardContainer,
          { marginRight: index === popularStores.length - 1 ? 0 : 12 },
        ]}
      >
        <PopularStoreCard
          store={item}
          onPress={handleStorePress}
          width={170}
        />
      </View>
    ),
    [popularStores.length, handleStorePress]
  );

  // Key extractors
  const keyExtractorTop = useCallback((item: DiscoveryStore) => `top-${item.id}`, []);
  const keyExtractorPopular = useCallback((item: DiscoveryStore) => `popular-${item.id}`, []);


  // Show skeleton while loading
  const isLoading = isLoadingTop && isLoadingPopular;
  const hasTopStores = topStores.length > 0;
  const hasPopularStores = popularStores.length > 0;

  // Don't render anything if no data and no loading
  if (!isLoading && !hasTopStores && !hasPopularStores) {
    return null;
  }

  // Show skeleton while initial loading
  if (isLoading) {
    return <StoreDiscoverySkeleton />;
  }

  return (
    <ThemedView style={styles.container}>
      {/* Today's Top Stores Section */}
      {(isLoadingTop || hasTopStores) && (
        <View style={styles.sectionContainer}>
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Today's Top Stores</ThemedText>
            <Pressable onPress={handleViewAllTopStores}>
              <ThemedText style={styles.viewAllText}>View all</ThemedText>
            </Pressable>
          </View>

          {/* Horizontal Scroll */}
          {isLoadingTop ? (
            <StoreDiscoverySkeleton showTopStores={true} showPopularStores={false} />
          ) : (
            <FlashList
              data={topStores}
              renderItem={renderTopStoreCard}
              keyExtractor={keyExtractorTop}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              removeClippedSubviews={Platform.OS !== 'web'}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={50}
              initialNumToRender={4}
              windowSize={5}
              scrollEventThrottle={16}
              decelerationRate="normal"
              estimatedItemSize={110}
            />
          )}
        </View>
      )}

      {/* Popular Near You Section */}
      {(isLoadingPopular || hasPopularStores) && (
        <View style={styles.sectionContainer}>
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Popular</ThemedText>
            <Pressable onPress={handleViewAllPopularStores}>
              <ThemedText style={styles.viewAllText}>View all</ThemedText>
            </Pressable>
          </View>

          {/* Horizontal Scroll */}
          {isLoadingPopular ? (
            <StoreDiscoverySkeleton showTopStores={false} showPopularStores={true} />
          ) : (
            <FlashList
              data={popularStores}
              renderItem={renderPopularStoreCard}
              keyExtractor={keyExtractorPopular}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              removeClippedSubviews={Platform.OS !== 'web'}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={50}
              initialNumToRender={4}
              windowSize={5}
              scrollEventThrottle={16}
              decelerationRate="normal"
              estimatedItemSize={110}
            />
          )}
        </View>
      )}
    </ThemedView>
  );
});

export default StoreDiscoverySection;

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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  cardContainer: {
    flex: 0,
    flexShrink: 0,
  },
});
