import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import exploreApi, { ExploreStore, Category } from '@/services/exploreApi';
import { useIsMounted } from '@/hooks/useIsMounted';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

// Map Ionicon names to emojis for category display
const iconToEmojiMap: { [key: string]: string } = {
  'restaurant-outline': '🍔', 'restaurant': '🍔', 'fast-food-outline': '🍔', 'fast-food': '🍔',
  'shirt-outline': '👔', 'shirt': '👔', 'bag-outline': '👜', 'bag': '👜',
  'phone-portrait-outline': '📱', 'phone-portrait': '📱', 'laptop-outline': '💻',
  'color-palette-outline': '💄', 'sparkles-outline': '💄',
  'cart-outline': '🛒', 'cart': '🛒', 'basket-outline': '🧺',
  'barbell-outline': '🏋️', 'barbell': '🏋️', 'fitness-outline': '🏋️',
  'home-outline': '🏠', 'home': '🏠',
  'construct-outline': '🔧', 'construct': '🔧',
  'snow-outline': '❄️', 'snow': '❄️',
  'receipt-outline': '🧾', 'receipt': '🧾',
  'book-outline': '📚', 'book': '📚',
  'medical-outline': '🏥', 'medkit-outline': '💊',
  'airplane-outline': '✈️', 'car-outline': '🚗',
  'paw-outline': '🐾',
};

// Get emoji from icon name or category name
const getEmojiForCategory = (icon?: string, name?: string): string => {
  if (icon && iconToEmojiMap[icon]) return iconToEmojiMap[icon];
  const lowerName = (name || '').toLowerCase();
  if (lowerName.includes('food') || lowerName.includes('dining') || lowerName.includes('restaurant')) return '🍔';
  if (lowerName.includes('fashion') || lowerName.includes('cloth')) return '👜';
  if (lowerName.includes('electronic') || lowerName.includes('mobile')) return '📱';
  if (lowerName.includes('beauty') || lowerName.includes('salon')) return '💄';
  if (lowerName.includes('grocery') || lowerName.includes('supermarket')) return '🛒';
  if (lowerName.includes('fitness') || lowerName.includes('gym')) return '🏋️';
  if (lowerName.includes('home') || lowerName.includes('delivery')) return '🏠';
  if (lowerName.includes('service') || lowerName.includes('repair')) return '🔧';
  if (lowerName.includes('ac') || lowerName.includes('cooling')) return '❄️';
  if (lowerName.includes('bill') || lowerName.includes('payment')) return '🧾';
  if (lowerName.includes('coach') || lowerName.includes('education')) return '📚';
  return '🏷️';
};

const filterChips = [
  { id: 'all', label: 'All' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'highCashback', label: 'High Cashback' },
  { id: 'topRated', label: 'Top Rated' },
  { id: 'delivery', label: '60 Min Delivery' },
];

const CategoryDetailPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [selectedFilter, setSelectedFilter] = useState('all');

  // API state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<ExploreStore[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<Category | null>(null);
  const [maxCashback, setMaxCashback] = useState<string | null>(null);
  const [offersCount, setOffersCount] = useState<number | null>(null);

  // Fetch category data and stores
  const fetchCategoryData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const categorySlug = id as string;

      // Fetch category details and stores in parallel
      const [categoryResponse, storesResponse] = await Promise.all([
        exploreApi.getCategoryBySlug(categorySlug),
        exploreApi.getStoresByCategory(categorySlug, { limit: 20 }),
      ]);

      if (!isMounted()) return;
      if (categoryResponse.success && categoryResponse.data) {
        if (!isMounted()) return;
        setCategoryInfo(categoryResponse.data);
      }

      if (storesResponse.success && storesResponse.data) {
        let fetchedStores = storesResponse.data.stores || [];

        // Calculate max cashback from stores
        let maxCb = 0;
        let offersLive = 0;
        fetchedStores.forEach((store: any) => {
          const cbValue = parseInt(store.cashback?.replace('%', '') || '0');
          if (cbValue > maxCb) maxCb = cbValue;
          if (store.offer) offersLive++;
        });
        if (!isMounted()) return;
        if (maxCb > 0) setMaxCashback(`${maxCb}%`);
        if (!isMounted()) return;
        if (offersLive > 0) setOffersCount(offersLive);

        // Apply local filtering based on selected filter
        if (selectedFilter === 'topRated') {
          fetchedStores = [...fetchedStores].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (selectedFilter === 'highCashback') {
          fetchedStores = [...fetchedStores].sort((a, b) => {
            const aRate = parseInt(a.cashback?.replace('%', '') || '0');
            const bRate = parseInt(b.cashback?.replace('%', '') || '0');
            return bRate - aRate;
          });
        }

        if (!isMounted()) return;
        setStores(fetchedStores);
      } else {
        if (!isMounted()) return;
        setError(storesResponse.error || 'Failed to fetch stores');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [id, selectedFilter]);

  // Initial fetch
  useEffect(() => {
    fetchCategoryData();
  }, [fetchCategoryData]);

  const onRefresh = useCallback(() => {
    fetchCategoryData(true);
  }, [fetchCategoryData]);

  // Get display category info from API
  const categoryName = categoryInfo?.name || (id as string)?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Category';
  const categoryEmoji = getEmojiForCategory(categoryInfo?.icon, categoryInfo?.name);

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

      {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
            <Text style={styles.headerTitle}>{categoryName}</Text>
          </View>
          <Pressable
            style={styles.searchButton}
            onPress={() => navigateTo('/explore/search')}
          >
            <Ionicons name="search" size={22} color={Colors.nileBlue} />
          </Pressable>
        </View>

        {/* Gradient Hero Banner */}
        <LinearGradient
          colors={[Colors.nileBlue, '#2d5a7b']}
          style={styles.heroBanner}
        >
          <Text style={styles.heroEmoji}>{categoryEmoji}</Text>
          <Text style={styles.heroTitle}>{categoryName}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{categoryInfo?.storeCount || stores.length || 0}</Text>
              <Text style={styles.heroStatLabel}>Stores</Text>
            </View>
            {maxCashback && (
              <>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>Up to {maxCashback}</Text>
                  <Text style={styles.heroStatLabel}>Cashback</Text>
                </View>
              </>
            )}
            {offersCount && offersCount > 0 && (
              <>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{offersCount}</Text>
                  <Text style={styles.heroStatLabel}>Offers Live</Text>
                </View>
              </>
            )}
          </View>
        </LinearGradient>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {filterChips.map((filter) => (
          <Pressable
            key={filter.id}
            style={[
              styles.filterChip,
              selectedFilter === filter.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(filter.id)}
          >
            <Text
              style={[
                styles.filterLabel,
                selectedFilter === filter.id && styles.filterLabelActive,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Results Count */}
      {!loading && !error && stores.length > 0 && (
        <Text style={styles.resultsCount}>
          {stores.length} store{stores.length !== 1 ? 's' : ''} found
        </Text>
      )}

      {/* Stores List */}
      <ScrollView
        style={styles.storesList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.storesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.gold]} />
        }
      >
        {/* Loading State */}
        {loading && !refreshing && (
          <CardGridSkeleton />
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchCategoryData()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && stores.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{categoryEmoji}</Text>
            <Text style={styles.emptyText}>No {categoryName.toLowerCase()} stores found</Text>
            <Text style={styles.emptySubtext}>
              No stores are available in this category yet. Check back soon!
            </Text>
            <Pressable style={styles.emptyButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Text style={styles.emptyButtonText}>Explore Other Categories</Text>
            </Pressable>
          </View>
        )}

        {/* Stores */}
        {!loading && !error && stores.map((store) => (
          <Pressable
            key={store.id}
            style={styles.storeCard}
            onPress={() => navigateTo(`/MainStorePage?storeId=${store.id}`)}
          >
            {store.image ? (
              <CachedImage source={store.image} style={styles.storeImage} />
            ) : (store as any).logo ? (
              <CachedImage source={(store as any).logo} style={styles.storeImage} />
            ) : (
              <View style={[styles.storeImage, styles.storeImagePlaceholder]}>
                <Text style={styles.storeInitial}>{store.name?.charAt(0) || 'S'}</Text>
              </View>
            )}

            <View style={styles.storeContent}>
              <View style={styles.storeHeader}>
                <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                {store.rating != null && store.rating > 0 && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color={Colors.warning} />
                    <Text style={styles.ratingText}>{store.rating}</Text>
                  </View>
                )}
              </View>

              {(store.offer || store.cashback) && (
                <View style={styles.offerRow}>
                  <View style={styles.offerBadge}>
                    <Ionicons name="pricetag" size={11} color={colors.brand.amberDark} />
                    <Text style={styles.offerText}>{store.offer || `${store.cashback} Cashback`}</Text>
                  </View>
                </View>
              )}

              <View style={styles.storeFooter}>
                {store.distance && (
                  <View style={styles.infoItem}>
                    <Ionicons name="location" size={14} color={Colors.text.tertiary} />
                    <Text style={styles.infoText}>{store.distance}</Text>
                  </View>
                )}
                {store.isOpen !== null && store.isOpen !== undefined && (
                  <View style={styles.infoItem}>
                    <View style={[styles.statusDot, { backgroundColor: store.isOpen ? Colors.success : Colors.error }]} />
                    <Text style={[styles.infoText, { color: store.isOpen ? Colors.success : Colors.error }]}>
                      {store.isOpen ? 'Open' : 'Closed'}
                    </Text>
                  </View>
                )}
                {store.reviews != null && store.reviews > 0 && (
                  <View style={styles.infoItem}>
                    <Ionicons name="chatbubble" size={13} color={Colors.text.tertiary} />
                    <Text style={styles.infoText}>{store.reviews}</Text>
                  </View>
                )}
              </View>
            </View>

            <Pressable
              style={styles.visitButton}
              onPress={() => navigateTo(`/MainStorePage?storeId=${store.id}`)}
            >
              <Text style={styles.visitText}>Visit</Text>
            </Pressable>
          </Pressable>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Map Button */}
      <Pressable
        style={styles.mapButton}
        onPress={() => navigateTo('/explore/map')}
      >
        <LinearGradient
          colors={[Colors.gold, Colors.nileBlue]}
          style={styles.mapButtonGradient}
        >
          <Ionicons name="map" size={20} color={colors.background.primary} />
          <Text style={styles.mapButtonText}>Map View</Text>
        </LinearGradient>
      </Pressable>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryEmoji: {
    ...Typography.h2,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBanner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  heroTitle: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: Spacing.base,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.base,
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterScroll: {
    maxHeight: 52,
  },
  filterContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.xs,
  },
  filterChipActive: {
    backgroundColor: Colors.nileBlue,
  },
  filterLabel: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  filterLabelActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  resultsCount: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xs,
  },
  storesList: {
    flex: 1,
  },
  storesContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    minHeight: 200,
    paddingBottom: 120,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  retryButton: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    backgroundColor: Colors.nileBlue,
    borderRadius: BorderRadius.xl,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: Spacing.sm,
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.nileBlue,
    borderRadius: BorderRadius.xl,
  },
  emptyButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  storeImage: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
  },
  storeImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.nileBlue,
  },
  storeInitial: {
    ...Typography.h1,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  storeContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeName: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.nileBlue,
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.warning,
  },
  offerRow: {
    marginTop: 6,
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    gap: Spacing.xs,
  },
  offerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.amberDark,
  },
  storeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  visitButton: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
  },
  visitText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  mapButton: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.strong,
  },
  mapButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  mapButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(CategoryDetailPage, 'ExploreCategoryId');
