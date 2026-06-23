import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  FlatList,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import exploreApi, { ExploreStore } from '@/services/exploreApi';
import { useRegionState } from '@/stores/selectors';
import { useCurrentLocation } from '@/hooks/useLocation';
import { MapViewSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const categories = [
  { id: 'all', label: 'All', icon: 'grid', gradient: [colors.brand.indigo, colors.brand.purpleLight] },
  { id: 'food', label: 'Food', icon: 'restaurant', gradient: [colors.brand.orange, '#FB923C'] },
  { id: 'fashion', label: 'Fashion', icon: 'shirt', gradient: [colors.brand.pink, '#F472B6'] },
  { id: 'beauty', label: 'Beauty', icon: 'sparkles', gradient: [colors.brand.purpleLight, colors.brand.purpleSoft] },
  { id: 'electronics', label: 'Tech', icon: 'phone-portrait', gradient: [colors.infoScale[400], colors.infoScale[400]] },
  { id: 'grocery', label: 'Grocery', icon: 'cart', gradient: [colors.lightMustard, '#ffd977'] },
];

// Generate gradient colors based on store name
const getStoreGradient = (name: string): [string, string] => {
  const gradients: [string, string][] = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#a8edea', '#fed6e3'],
    ['#ff9a9e', '#fecfef'],
    ['#ffecd2', '#fcb69f'],
    ['#667eea', '#764ba2'],
    ['#6a11cb', '#2575fc'],
  ];
  const index = name.charCodeAt(0) % gradients.length;
  return gradients[index];
};

// Format rating to 1 decimal place
const formatRating = (rating: number | string | undefined): string => {
  if (!rating) return '';
  const num = typeof rating === 'string' ? parseFloat(rating) : rating;
  if (isNaN(num)) return '';
  return num.toFixed(1);
};

const ExploreStoresPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stores, setStores] = useState<ExploreStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'default' | 'rating' | 'name' | 'distance'>('default');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_LIMIT = 20;

  // Region context for coordinates and region name
  const regionState = useRegionState();
  const regionName = regionState.regionConfig?.name || 'your area';
  const currentRegion = regionState.currentRegion;

  // Location context for GPS coordinates
  const { currentLocation } = useCurrentLocation();

  // Get effective coordinates
  const effectiveCoordinates = useMemo(() => {
    if (currentLocation?.coordinates?.latitude && currentLocation?.coordinates?.longitude) {
      return {
        latitude: currentLocation.coordinates.latitude,
        longitude: currentLocation.coordinates.longitude,
        source: 'gps' as const,
      };
    }
    if (regionState.regionConfig?.defaultCoordinates) {
      return {
        latitude: regionState.regionConfig.defaultCoordinates.latitude,
        longitude: regionState.regionConfig.defaultCoordinates.longitude,
        source: 'region' as const,
      };
    }
    return { latitude: 12.9716, longitude: 77.5946, source: 'default' as const }; // Bangalore default
  }, [currentLocation?.coordinates, regionState.regionConfig?.defaultCoordinates]);

  // Fetch stores from API
  const fetchStores = useCallback(async (isRefresh = false, pageNum = 1) => {
    try {
      if (isRefresh || pageNum === 1) {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }
      setError(null);

      let response;
      if (searchQuery.trim()) {
        response = await exploreApi.searchStores(searchQuery, { page: pageNum, limit: PAGE_LIMIT });
      } else {
        response = await exploreApi.getStores({
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          page: pageNum,
          limit: PAGE_LIMIT,
        });
      }

      if (response.success && response.data) {
        if (!isMounted()) return;
        const newStores = response.data.stores || [];
        if (pageNum === 1) {
          setStores(newStores);
        } else {
          setStores(prev => [...prev, ...newStores]);
        }
        setPage(pageNum);
        setHasMore(newStores.length >= PAGE_LIMIT);
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to fetch stores');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, searchQuery]);

  // Initial fetch
  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Refetch when region changes
  useEffect(() => {
    if (currentRegion) {
      fetchStores();
    }
  }, [currentRegion]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchStores();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    fetchStores(true, 1);
  }, [fetchStores]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchStores(false, page + 1);
  }, [loadingMore, hasMore, page, fetchStores]);

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  // Stores are already filtered by category from the API call, apply local sort
  const filteredStores = useMemo(() => {
    if (sortBy === 'default') return stores;
    return [...stores].sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });
  }, [stores, sortBy]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setPage(1);
    setHasMore(true);
  };

  const handleSort = () => {
    // Cycle through sort options: default -> rating -> name -> default
    const sortOrder = ['default', 'rating', 'name'] as const;
    const currentIndex = sortOrder.indexOf(sortBy as any);
    const nextIndex = (currentIndex + 1) % sortOrder.length;
    const nextSort = sortOrder[nextIndex];
    const sortLabels = { default: 'Default', rating: 'Top Rated', name: 'Name (A-Z)' };
    setSortBy(nextSort);
  };

  // Render store card in list mode
  const renderListCard = (store: ExploreStore) => {
    const rating = formatRating(store.rating);
    const isOpen = store.isOpen !== false;
    const cashback = store.cashback || (store.cashbackRate ? `${store.cashbackRate}%` : null);
    const gradient = getStoreGradient(store.name || 'S');

    return (
      <Pressable
        key={store.id}
        style={styles.listCard}
        onPress={() => navigateTo(`/MainStorePage?storeId=${store.id}`)}
       
      >
        {/* Store Image/Logo */}
        <View style={styles.listCardLeft}>
          {store.image ? (
            <CachedImage source={store.image} style={styles.listCardImage} />
          ) : (
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.listCardImagePlaceholder}
            >
              <Text style={styles.listCardInitial}>{store.name?.charAt(0) || 'S'}</Text>
            </LinearGradient>
          )}
          {/* Status Indicator */}
          <View style={[styles.statusDot, { backgroundColor: isOpen ? colors.lightMustard : colors.error }]} />
        </View>

        {/* Store Info */}
        <View style={styles.listCardContent}>
          <View style={styles.listCardHeader}>
            <Text style={styles.listCardName} numberOfLines={1}>{store.name}</Text>
            {rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color={colors.warningScale[400]} />
                <Text style={styles.ratingText}>{rating}</Text>
              </View>
            )}
          </View>

          {store.category && (
            <Text style={styles.listCardCategory} numberOfLines={1}>{store.category}</Text>
          )}

          <View style={styles.listCardMeta}>
            {/* Status */}
            <View style={[styles.statusBadge, { backgroundColor: isOpen ? colors.linen : colors.errorScale[50] }]}>
              <Text style={[styles.statusText, { color: isOpen ? colors.nileBlue : colors.error }]}>
                {isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>

            {/* Cashback */}
            {cashback && (
              <View style={styles.cashbackBadge}>
                <Ionicons name="gift" size={10} color={colors.background.primary} />
                <Text style={styles.cashbackText}>{cashback}</Text>
              </View>
            )}

            {/* Distance */}
            {store.distance && (
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate" size={10} color={colors.infoScale[400]} />
                <Text style={styles.distanceText}>{store.distance}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.listCardArrow}>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </View>
      </Pressable>
    );
  };

  // Render store card in grid mode
  const renderGridCard = (store: ExploreStore) => {
    const rating = formatRating(store.rating);
    const isOpen = store.isOpen !== false;
    const cashback = store.cashback || (store.cashbackRate ? `${store.cashbackRate}%` : null);
    const gradient = getStoreGradient(store.name || 'S');

    return (
      <Pressable
        key={store.id}
        style={styles.gridCard}
        onPress={() => navigateTo(`/MainStorePage?storeId=${store.id}`)}
       
      >
        {/* Store Image */}
        <View style={styles.gridImageContainer}>
          {store.image ? (
            <CachedImage source={store.image} style={styles.gridImage} />
          ) : (
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gridImagePlaceholder}
            >
              <Text style={styles.gridInitial}>{store.name?.charAt(0) || 'S'}</Text>
            </LinearGradient>
          )}

          {/* Status Badge */}
          <View style={[styles.gridStatusBadge, { backgroundColor: isOpen ? colors.lightMustard : colors.error }]}>
            <Text style={styles.gridStatusText}>{isOpen ? 'Open' : 'Closed'}</Text>
          </View>

          {/* Cashback Badge */}
          {cashback && (
            <View style={styles.gridCashbackBadge}>
              <Text style={styles.gridCashbackText}>{cashback}</Text>
            </View>
          )}
        </View>

        {/* Store Info */}
        <View style={styles.gridContent}>
          <Text style={styles.gridName} numberOfLines={1}>{store.name}</Text>

          <View style={styles.gridMeta}>
            {rating && (
              <View style={styles.gridRating}>
                <Ionicons name="star" size={12} color={colors.warningScale[400]} />
                <Text style={styles.gridRatingText}>{rating}</Text>
              </View>
            )}
            {store.category && (
              <Text style={styles.gridCategory} numberOfLines={1}>{store.category}</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={24} color={colors.nileBlue} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Explore Stores</Text>
            <View style={styles.headerLocation}>
              <Ionicons name="location" size={12} color={colors.lightMustard} />
              <Text style={styles.headerLocationText}>{regionName}</Text>
            </View>
          </View>
          <Pressable
            style={styles.mapIconButton}
            onPress={() => navigateTo('/explore/map')}
          >
            <Ionicons name="map" size={22} color={colors.nileBlue} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.neutral[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search stores, brands..."
              placeholderTextColor={colors.neutral[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
              </Pressable>
            )}
          </View>
          <Pressable style={styles.filterButton} onPress={() => navigateTo('/explore/map')}>
            <Ionicons name="map-outline" size={20} color={colors.nileBlue} />
          </Pressable>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => handleCategoryChange(cat.id)}
            >
              {selectedCategory === cat.id ? (
                <LinearGradient
                  colors={cat.gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.categoryGradient}
                >
                  <Ionicons name={cat.icon as any} size={14} color={colors.background.primary} />
                  <Text style={styles.categoryLabelActive}>{cat.label}</Text>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons name={cat.icon as any} size={14} color={colors.neutral[500]} />
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                </>
              )}
            </Pressable>
          ))}
        </ScrollView>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            <Text style={styles.statsCount}>{filteredStores.length}</Text> stores in {regionName}
          </Text>
          <View style={styles.statsRight}>
            {/* View Toggle */}
            <View style={styles.viewToggle}>
              <Pressable
                style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('list')}
              >
                <Ionicons name="list" size={16} color={viewMode === 'list' ? colors.lightMustard : colors.neutral[400]} />
              </Pressable>
              <Pressable
                style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('grid')}
              >
                <Ionicons name="grid" size={16} color={viewMode === 'grid' ? colors.lightMustard : colors.neutral[400]} />
              </Pressable>
            </View>
            {/* Sort */}
            <Pressable style={styles.sortButton} onPress={handleSort}>
              <Ionicons name="swap-vertical" size={14} color={colors.neutral[500]} />
              <Text style={styles.sortText}>{sortBy === 'default' ? 'Sort' : sortBy === 'rating' ? 'Top Rated' : 'A-Z'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Stores List/Grid */}
        {loading && !refreshing ? (
          <MapViewSkeleton />
        ) : error && !loading ? (
          <View style={[styles.storesList, styles.errorContainer]}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle" size={48} color={colors.error} />
            </View>
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchStores(false, 1)}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredStores}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => viewMode === 'grid' ? renderGridCard(item) : renderListCard(item)}
            numColumns={viewMode === 'grid' ? 2 : 1}
            key={viewMode} // Re-render FlatList when switching between grid/list
            style={styles.storesList}
            contentContainerStyle={[
              styles.storesContainer,
              viewMode === 'grid' && styles.storesContainerGrid,
            ]}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="storefront-outline" size={48} color={colors.neutral[400]} />
                </View>
                <Text style={styles.emptyTitle}>No stores found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? `No results for "${searchQuery}"` : `Try adjusting your filters`}
                </Text>
                {searchQuery && (
                  <Pressable style={styles.clearSearchBtn} onPress={() => setSearchQuery('')}>
                    <Text style={styles.clearSearchText}>Clear Search</Text>
                  </Pressable>
                )}
              </View>
            }
            ListFooterComponent={
              <>
                {loadingMore && (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.lightMustard} />
                  </View>
                )}
                <View style={{ height: 120 }} />
              </>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.lightMustard]} />
            }
          />
        )}

        {/* Floating Map Button */}
        <Pressable
          style={styles.floatingMapButton}
          onPress={() => navigateTo('/explore/map')}
         
        >
          <LinearGradient
            colors={[colors.lightMustard, colors.nileBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingMapGradient}
          >
            <Ionicons name="map" size={18} color={colors.background.primary} />
            <Text style={styles.floatingMapText}>Map View</Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  headerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: Spacing.xs,
  },
  headerLocationText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  mapIconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 14,
    paddingVertical: Spacing.md,
    borderRadius: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.nileBlue,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryScroll: {
    maxHeight: 56,
    backgroundColor: Colors.background.primary,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm,
    gap: 6,
  },
  categoryChipActive: {
    padding: 0,
    backgroundColor: 'transparent',
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  categoryLabelActive: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  statsText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  statsCount: {
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  statsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.sm,
    padding: 2,
  },
  viewToggleBtn: {
    width: 32,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: Colors.background.primary,
    ...Shadows.subtle,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.sm,
  },
  sortText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  storesList: {
    flex: 1,
  },
  storesContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    minHeight: 200,
    paddingBottom: 120,
  },
  storesContainerGrid: {
    paddingHorizontal: Spacing.base,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.lg,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.errorScale[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  errorTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  clearSearchBtn: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
  },
  clearSearchText: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.nileBlue,
  },

  // List Card Styles
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  listCardLeft: {
    position: 'relative',
  },
  listCardImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  listCardImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listCardInitial: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  listCardContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listCardName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.nileBlue,
    flex: 1,
    marginRight: Spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: colors.brand.amberDeep,
  },
  listCardCategory: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  listCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    gap: Spacing.xs,
  },
  cashbackText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.blue,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    gap: Spacing.xs,
  },
  distanceText: {
    ...Typography.caption,
    fontWeight: '600',
    color: colors.infoScale[400],
  },
  listCardArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },

  // Grid Card Styles
  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  gridImageContainer: {
    position: 'relative',
    height: 100,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  gridStatusBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  gridStatusText: {
    ...Typography.overline,
    fontWeight: '700',
    color: Colors.text.inverse,
    textTransform: 'none',
    letterSpacing: 0,
  },
  gridCashbackBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  gridCashbackText: {
    ...Typography.overline,
    fontWeight: '700',
    color: Colors.gold,
    textTransform: 'none',
    letterSpacing: 0,
  },
  gridContent: {
    padding: Spacing.md,
  },
  gridName: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  gridMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: Spacing.sm,
  },
  gridRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  gridRatingText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.warning,
  },
  gridCategory: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    flex: 1,
  },

  // Floating Button
  floatingMapButton: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.purpleStrong,
    shadowColor: Colors.gold,
  },
  floatingMapGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  floatingMapText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(ExploreStoresPage, 'ExploreStores');
