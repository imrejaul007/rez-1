import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Store Search Screen for Pay-In-Store Flow
 *
 * Premium search interface for finding stores to pay at.
 * Features:
 * - Animated search header with parallax
 * - Category filter chips
 * - Nearby stores section (location-based)
 * - Recent payments section
 * - Popular stores section
 * - Search results with pagination
 * - Floating location button
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePaymentStoreSearch } from '@/hooks/usePaymentStoreSearch';
import {
  PaymentStoreInfo,
  PAYMENT_SEARCH_COLORS,
} from '@/types/paymentStoreSearch.types';

import { colors } from '@/constants/theme';
import {
  PremiumSearchHeader,
  CategoryChips,
  NearbyStoresSection,
  RecentStoresSection,
  PopularStoresSection,
  PaymentStoreCard,
  PaymentStoreCardSkeleton,
  EmptySearchState,
} from '@/components/pay-store-search';

// Use Animated.ScrollView directly from reanimated
const AnimatedScrollView = Animated.ScrollView;

function StoreSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  // Hook for search functionality
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    nearbyStores,
    recentStores,
    popularStores,
    isLoadingNearby,
    isLoadingRecent,
    isLoadingPopular,
    isInitialLoading,
    selectedCategory,
    setSelectedCategory,
    categories,
    hasMore,
    loadMore,
    isLoadingMore,
    refresh,
    clearSearch,
    retry,
  } = usePaymentStoreSearch();


  // Scroll handler for parallax
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Navigation handlers
  const handleBack = useCallback(() => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }, [router]);

  const handleStorePress = useCallback((store: PaymentStoreInfo) => {
    router.push({
      pathname: '/pay-in-store/enter-amount',
      params: {
        storeId: store._id,
        storeName: store.name,
        storeLogo: store.logo || '',
      },
    });
  }, [router]);

  // Determine what to show
  const isShowingSearchResults = searchQuery.trim().length > 0 || selectedCategory !== null;
  const hasNoResults = isShowingSearchResults && searchResults.length === 0 && !isSearching;

  // Render search results
  const renderSearchResults = () => {
    if (isSearching && searchResults.length === 0) {
      return <PaymentStoreCardSkeleton variant="full" count={3} />;
    }

    if (hasNoResults) {
      return (
        <EmptySearchState
          query={searchQuery || selectedCategory || ''}
          onClearSearch={clearSearch}
          onRetry={retry}
        />
      );
    }

    return (
      <View style={styles.searchResultsContainer}>
        {searchResults.map((store, index) => (
          <PaymentStoreCard
            key={store._id}
            store={store}
            onPress={handleStorePress}
            index={index}
            variant="full"
            showCTA
          />
        ))}

        {/* Load More */}
        {hasMore && (
          <Pressable
            onPress={loadMore}
            style={styles.loadMoreButton}
           
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <ActivityIndicator size="small" color={PAYMENT_SEARCH_COLORS.primary} />
            ) : (
              <Ionicons name="chevron-down" size={24} color={PAYMENT_SEARCH_COLORS.primary} />
            )}
          </Pressable>
        )}
      </View>
    );
  };

  // Render default sections (when not searching)
  const renderDefaultSections = () => {
    const showNearby = isLoadingNearby || nearbyStores.length > 0;
    const showRecent = isLoadingRecent || recentStores.length > 0;
    const showPopular = isLoadingPopular || popularStores.length > 0 || isInitialLoading;

    return (
      <>
        {/* Nearby Stores */}
        {showNearby && (
          <NearbyStoresSection
            stores={nearbyStores}
            isLoading={isLoadingNearby}
            onStorePress={handleStorePress}
          />
        )}

        {/* Recent Payments */}
        {showRecent && (
          <RecentStoresSection
            stores={recentStores}
            isLoading={isLoadingRecent}
            onStorePress={handleStorePress}
          />
        )}

        {/* Popular Stores - Always show with loading state initially */}
        <PopularStoresSection
          stores={popularStores}
          isLoading={isLoadingPopular || isInitialLoading}
          onStorePress={handleStorePress}
        />

        {/* Empty State if nothing loaded */}
        {!isInitialLoading && !showNearby && !showRecent && popularStores.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={48} color={colors.neutral[400]} />
            <Text style={styles.emptyText}>No stores available</Text>
            <Text style={styles.emptySubtext}>Try searching for a specific store</Text>
          </View>
        )}
      </>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Background */}
        <LinearGradient
          colors={[PAYMENT_SEARCH_COLORS.background, colors.background.primary]}
          style={StyleSheet.absoluteFill}
        />

      {/* Search Header */}
      <PremiumSearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onBack={handleBack}
        isSearching={isSearching}
        scrollY={scrollY}
      />

      {/* Category Chips */}
      <CategoryChips
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isLoading={isInitialLoading}
      />

      {/* Main Content */}
      <AnimatedScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refresh}
            tintColor={PAYMENT_SEARCH_COLORS.primary}
            colors={[PAYMENT_SEARCH_COLORS.primary]}
          />
        }
      >
        {isShowingSearchResults ? renderSearchResults() : renderDefaultSections()}
      </AnimatedScrollView>

      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAYMENT_SEARCH_COLORS.background,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
  },
  searchResultsContainer: {
    paddingTop: 8,
  },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: PAYMENT_SEARCH_COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PAYMENT_SEARCH_COLORS.border,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.neutral[400],
    marginTop: 4,
    textAlign: 'center',
  },
});

export default withErrorBoundary(StoreSearchScreen, 'PayInStoreStoreSearch');
