/**
 * Food Category Page
 * Production-ready: real API calls, loading/empty states, pagination, auth guard
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthLoading } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import CachedImage from '@/components/ui/CachedImage';
import apiClient from '@/services/apiClient';
import storesService from '@/services/storesApi';
import categoriesService from '@/services/categoriesApi';
import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { errorReporter } from '@/utils/errorReporter';
import ErrorState from '@/components/common/ErrorState';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FOOD_CATEGORY_SLUG = 'food-dining';
const PAGE_LIMIT = 10;

// ---------- Types ----------
interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  storeCount?: number;
}

interface FoodStore {
  _id: string;
  name: string;
  slug?: string;
  logo?: string;
  banner?: string;
  tags?: string[];
  ratings?: { average: number; count: number };
  deliveryTime?: string;
  offers?: { cashback?: number };
  category?: { name?: string; slug?: string };
  serviceCapabilities?: {
    homeDelivery?: { enabled?: boolean; estimatedTime?: string };
  };
}

interface CuisineCount {
  tag: string;
  count: number;
}

interface FoodOffer {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  cashbackPercentage?: number;
  type?: string;
  code?: string;
  store?: { name?: string };
  validity?: { endDate?: string };
}

// ---------- Component ----------
const FoodPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const authLoading = useAuthLoading();

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Data states
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [featuredStores, setFeaturedStores] = useState<FoodStore[]>([]);
  const [cuisines, setCuisines] = useState<CuisineCount[]>([]);
  const [offers, setOffers] = useState<FoodOffer[]>([]);

  // Stats from API
  const [totalStores, setTotalStores] = useState(0);
  const [maxCashback, setMaxCashback] = useState(0);

  // Loading & error states
  const [error, setError] = useState<string | null>(null);
  const [loadingSubcategories, setLoadingSubcategories] = useState(true);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingCuisines, setLoadingCuisines] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);

  // Pagination for featured stores
  const [storePage, setStorePage] = useState(1);
  const [hasMoreStores, setHasMoreStores] = useState(true);
  const [loadingMoreStores, setLoadingMoreStores] = useState(false);

  const fetchedRef = useRef(false);

  // ---------- Fetch subcategories (via parent category slug) ----------
  const fetchSubcategories = useCallback(async () => {
    setLoadingSubcategories(true);
    setError(null);
    try {
      // Get the food-dining parent category which includes populated childCategories
      const response = await categoriesService.getCategoryBySlug(FOOD_CATEGORY_SLUG);
      if (response.success && response.data) {
        const parentCat = response.data as any;
        const children = parentCat.childCategories || [];
        if (!isMounted()) return;
        setSubcategories(
          children
            .filter((c: any) => c.isActive !== false)
            .map((c: any) => ({
              _id: c._id || c.id,
              name: c.name,
              slug: c.slug,
              icon: c.icon,
              image: c.image,
              storeCount: c.storeCount || c.metadata?.storeCount || 0,
            }))
        );
        // Also use parent stats if available
        if (!isMounted()) return;
        if (parentCat.storeCount) setTotalStores(parentCat.storeCount);
        if (!isMounted()) return;
        if (parentCat.maxCashback) setMaxCashback(parentCat.maxCashback);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load food categories. Please try again.');
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to fetch food subcategories'),
        { context: 'FoodPage.fetchSubcategories' },
        'warning'
      );
    } finally {
      if (!isMounted()) return;
      setLoadingSubcategories(false);
    }
  }, []);

  // ---------- Fetch featured stores ----------
  const fetchStores = useCallback(async (page: number = 1, append: boolean = false) => {
    if (page === 1) setLoadingStores(true);
    else setLoadingMoreStores(true);

    try {
      const response = await storesService.getStores({
        category: FOOD_CATEGORY_SLUG,
        page,
        limit: PAGE_LIMIT,
        isFeatured: true,
        sortBy: 'rating',
      } as any);

      if (response.success && response.data) {
        const data = response.data as any;
        const stores: FoodStore[] = data.stores || (Array.isArray(data) ? data : []);

        if (append) {
          if (!isMounted()) return;
          setFeaturedStores(prev => [...prev, ...stores]);
        } else {
          if (!isMounted()) return;
          setFeaturedStores(stores);
        }

        // Pagination metadata
        const meta = response.meta?.pagination || data.pagination;
        if (meta) {
          if (!isMounted()) return;
          setTotalStores(meta.total || 0);
          if (!isMounted()) return;
          setHasMoreStores(page < (meta.pages || meta.totalPages || 1));
        } else {
          if (!isMounted()) return;
          setHasMoreStores(stores.length === PAGE_LIMIT);
        }

        // Compute max cashback from returned stores
        if (!append && stores.length > 0) {
          const mc = Math.max(...stores.map((s: FoodStore) => s.offers?.cashback || 0), 0);
          if (!isMounted()) return;
          if (mc > maxCashback) setMaxCashback(mc);
        }
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to fetch featured food stores'),
        { context: 'FoodPage.fetchStores' },
        'warning'
      );
    } finally {
      if (!isMounted()) return;
      if (page === 1) setLoadingStores(false);
      if (!isMounted()) return;
      else setLoadingMoreStores(false);
    }
  }, [maxCashback]);

  // ---------- Fetch cuisine counts ----------
  const fetchCuisines = useCallback(async () => {
    setLoadingCuisines(true);
    try {
      const response = await storesService.getCuisineCounts();
      if (response.success && response.data) {
        const data = response.data as any;
        const items: CuisineCount[] = data.cuisines || (Array.isArray(data) ? data : []);
        if (!isMounted()) return;
        setCuisines(items.slice(0, 8)); // Show top 8 cuisines
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to fetch cuisine counts'),
        { context: 'FoodPage.fetchCuisines' },
        'warning'
      );
    } finally {
      if (!isMounted()) return;
      setLoadingCuisines(false);
    }
  }, []);

  // ---------- Fetch offers ----------
  const fetchOffers = useCallback(async () => {
    setLoadingOffers(true);
    try {
      const response = await apiClient.get<any>('/offers/featured', { limit: 6 });
      if (response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : response.data.offers || [];
        if (!isMounted()) return;
        setOffers(items.slice(0, 6));
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to fetch food offers'),
        { context: 'FoodPage.fetchOffers' },
        'warning'
      );
    } finally {
      if (!isMounted()) return;
      setLoadingOffers(false);
    }
  }, []);

  // ---------- Initial data fetch ----------
  useEffect(() => {
    if (authLoading || fetchedRef.current) return;
    fetchedRef.current = true;

    fetchSubcategories();
    fetchStores(1);
    fetchCuisines();
    fetchOffers();
  }, [authLoading, fetchSubcategories, fetchStores, fetchCuisines, fetchOffers]);

  // ---------- Load more stores ----------
  const loadMoreStores = useCallback(() => {
    if (loadingMoreStores || !hasMoreStores) return;
    const nextPage = storePage + 1;
    setStorePage(nextPage);
    fetchStores(nextPage, true);
  }, [loadingMoreStores, hasMoreStores, storePage, fetchStores]);

  // ---------- Helpers ----------
  const getOfferColor = (index: number): string => {
    const palette = [Colors.error, Colors.success, Colors.info, colors.brand.purple, colors.brand.orange];
    return palette[index % palette.length];
  };

  const getCuisineEmoji = (tag: string): string => {
    const map: Record<string, string> = {
      indian: '🍛', chinese: '🥡', italian: '🍝', mexican: '🌮',
      thai: '🍜', japanese: '🍣', korean: '🍱', american: '🍔',
      mediterranean: '🥙', arabic: '🧆', continental: '🥘',
      seafood: '🦐', desserts: '🍰', cafe: '☕', bakery: '🧁',
      pizza: '🍕', biryani: '🍚', south_indian: '🥣', north_indian: '🍛',
    };
    return map[tag.toLowerCase()] || '🍽️';
  };

  const getSubcategoryEmoji = (name: string): string => {
    const map: Record<string, string> = {
      restaurants: '🍽️', delivery: '🍕', cafe: '☕', 'fast food': '🍔',
      desserts: '🍰', bakery: '🧁', 'fine dining': '🥂', 'street food': '🌮',
      'cloud kitchen': '🍳', bar: '🍺', pub: '🍻', lounge: '🎵',
      'ice cream': '🍦', juice: '🧃', healthy: '🥗', vegan: '🌱',
    };
    return map[name.toLowerCase()] || '🍴';
  };

  const getStoreCashback = (store: FoodStore): number => {
    return store.offers?.cashback || 0;
  };

  const getStoreDeliveryTime = (store: FoodStore): string => {
    return store.serviceCapabilities?.homeDelivery?.estimatedTime
      || store.deliveryTime
      || '';
  };

  const getStoreCuisine = (store: FoodStore): string => {
    if (store.tags && store.tags.length > 0) {
      return store.tags.slice(0, 2).join(', ');
    }
    return store.category?.name || 'Restaurant';
  };

  const isLoading = loadingSubcategories && loadingStores && loadingCuisines && loadingOffers;

  const refetchAll = useCallback(() => {
    setError(null);
    fetchedRef.current = false;
    fetchSubcategories();
    fetchStores(1);
    fetchCuisines();
    fetchOffers();
  }, [fetchSubcategories, fetchStores, fetchCuisines, fetchOffers]);

  // ---------- Render ----------
  if (error && !isLoading) {
    return (
      <View style={styles.container}>
        <ErrorState error={error} onRetry={refetchAll} title="Failed to Load Food" />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.brand.orange, colors.brand.orangeDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Food</Text>
              <Text style={styles.headerSubtitle}>Order & earn cashback</Text>
            </View>
            <View style={styles.cartButton} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconWrap}>
            <Ionicons name="restaurant-outline" size={36} color={colors.brand.orange} />
          </View>
          <ActivityIndicator size="large" color={colors.brand.orange} style={{ marginTop: Spacing.base }} />
          <Text style={styles.loadingText}>Loading food options...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[colors.brand.orange, colors.brand.orangeDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Food</Text>
            <Text style={styles.headerSubtitle}>Order & earn cashback</Text>
          </View>
          <Pressable style={styles.cartButton}>
            <Ionicons name="cart-outline" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalStores > 0 ? `${totalStores}+` : '--'}</Text>
            <Text style={styles.statLabel}>Restaurants</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{maxCashback > 0 ? `${maxCashback}%` : '--'}</Text>
            <Text style={styles.statLabel}>Max Cashback</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{cuisines.length > 0 ? `${cuisines.length}+` : '--'}</Text>
            <Text style={styles.statLabel}>Cuisines</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'Fast Delivery', 'Rating 4.0+', 'Offers', 'Nearby'].map((filter) => (
            <Pressable key={filter} onPress={() => setSelectedFilter(filter)} style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, selectedFilter === filter && styles.filterChipTextActive]}>
                {filter === 'all' ? 'All' : filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Offers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Offers For You</Text>
            {offers.length > 3 && (
              <Pressable onPress={() => router.push('/offers' as any)}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            )}
          </View>
          {loadingOffers ? (
            <ActivityIndicator size="small" color={colors.brand.orange} />
          ) : offers.length === 0 ? (
            <View style={styles.emptySmall}>
              <Text style={styles.emptySmallText}>No offers available right now</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {offers.map((offer, index) => (
                <View key={offer._id} style={[styles.offerCard, { backgroundColor: getOfferColor(index) }]}>
                  <Text style={styles.offerTitle}>
                    {offer.cashbackPercentage
                      ? `${offer.cashbackPercentage}% OFF`
                      : offer.title}
                  </Text>
                  <Text style={styles.offerSubtitle} numberOfLines={2}>
                    {offer.subtitle || offer.description || (offer.store?.name ? `At ${offer.store.name}` : '')}
                  </Text>
                  {offer.code ? (
                    <View style={styles.codeContainer}>
                      <Text style={styles.codeText}>Use: {offer.code}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Browse by Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          {loadingSubcategories ? (
            <ActivityIndicator size="small" color={colors.brand.orange} />
          ) : subcategories.length === 0 ? (
            <View style={styles.emptySmall}>
              <Text style={styles.emptySmallText}>No categories found</Text>
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
              {subcategories.map((cat) => (
                <Pressable
                  key={cat._id}
                  style={styles.categoryCard}
                  onPress={() => router.push(`/explore/category/${cat._id}` as any)}
                >
                  {cat.image ? (
                    <CachedImage
                      source={{ uri: cat.image }}
                      style={styles.categoryImageIcon}
                      contentFit="cover"
                      borderRadius={BorderRadius['2xl']}
                    />
                  ) : (
                    <View style={styles.categoryIcon}>
                      <Text style={styles.categoryEmoji}>
                        {cat.icon || getSubcategoryEmoji(cat.name)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.categoryTitle} numberOfLines={1}>{cat.name}</Text>
                  <Text style={styles.categoryCount}>
                    {cat.storeCount ? `${cat.storeCount} places` : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Popular Cuisines */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Cuisines</Text>
          </View>
          {loadingCuisines ? (
            <ActivityIndicator size="small" color={colors.brand.orange} />
          ) : cuisines.length === 0 ? (
            <View style={styles.emptySmall}>
              <Text style={styles.emptySmallText}>No cuisine data available</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {cuisines.map((cuisine) => (
                <Pressable
                  key={cuisine.tag}
                  style={styles.cuisineCard}
                  onPress={() => router.push(`/explore/filter/${cuisine.tag}` as any)}
                >
                  <Text style={styles.cuisineEmoji}>{getCuisineEmoji(cuisine.tag)}</Text>
                  <Text style={styles.cuisineName}>{cuisine.tag}</Text>
                  <Text style={styles.cuisineCount}>{cuisine.count}+</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Featured Restaurants */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Restaurants</Text>
          </View>
          {loadingStores ? (
            <ActivityIndicator size="small" color={colors.brand.orange} />
          ) : featuredStores.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="restaurant-outline" size={36} color={colors.brand.orange} />
              </View>
              <Text style={styles.emptyTitle}>No restaurants found</Text>
              <Text style={styles.emptySubtitle}>Check back later for new restaurants in your area</Text>
            </View>
          ) : (
            <>
              {featuredStores.map((store) => {
                const cashback = getStoreCashback(store);
                const deliveryTime = getStoreDeliveryTime(store);
                const cuisine = getStoreCuisine(store);
                const rating = store.ratings?.average || 0;
                const imageUri = store.banner || store.logo || '';

                return (
                  <Pressable
                    key={store._id}
                    style={styles.restaurantCard}
                    onPress={() => router.push(`/store/${store.slug || store._id}` as any)}
                  >
                    {imageUri ? (
                      <CachedImage
                        source={{ uri: imageUri }}
                        style={styles.restaurantImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={[styles.restaurantImage, styles.restaurantImagePlaceholder]}>
                        <Ionicons name="restaurant-outline" size={40} color={Colors.text.tertiary} />
                      </View>
                    )}
                    {cashback > 0 && (
                      <View style={styles.cashbackBadge}>
                        <Text style={styles.cashbackText}>{cashback}%</Text>
                      </View>
                    )}
                    <View style={styles.restaurantInfo}>
                      <View style={styles.restaurantHeader}>
                        <Text style={styles.restaurantName} numberOfLines={1}>{store.name}</Text>
                        {rating > 0 && (
                          <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={12} color={Colors.text.inverse} />
                            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cuisineText} numberOfLines={1}>{cuisine}</Text>
                      <View style={styles.restaurantMeta}>
                        {deliveryTime ? (
                          <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
                            <Text style={styles.metaText}>{deliveryTime}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })}

              {/* Pagination: Load More */}
              {hasMoreStores && (
                <Pressable style={styles.loadMoreButton} onPress={loadMoreStores} disabled={loadingMoreStores}>
                  {loadingMoreStores ? (
                    <ActivityIndicator size="small" color={colors.brand.orange} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load More Restaurants</Text>
                  )}
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <LinearGradient colors={[Colors.success, Colors.success]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoGradient}>
            <Ionicons name="restaurant" size={40} color={Colors.text.inverse} style={{ marginBottom: Spacing.md }} />
            <Text style={styles.promoTitle}>Explore All Restaurants</Text>
            <Text style={styles.promoSubtitle}>Discover new places near you and earn cashback on every order</Text>
            <Pressable
              style={styles.promoButton}
              onPress={() => router.push(`/explore/category/${FOOD_CATEGORY_SLUG}` as any)}
            >
              <Text style={styles.promoButtonText}>Browse Now</Text>
            </Pressable>
          </LinearGradient>
        </View>

      </ScrollView>
    </View>
  );
};

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: Spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  backButton: { padding: Spacing.sm },
  headerTitleContainer: { flex: 1, marginLeft: Spacing.sm },
  headerTitle: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.text.inverse },
  headerSubtitle: { fontSize: Typography.bodySmall.fontSize, color: 'rgba(255,255,255,0.8)' },
  cartButton: { padding: Spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.base },
  statItem: { alignItems: 'center', paddingHorizontal: Spacing.lg },
  statValue: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.text.inverse },
  statLabel: { fontSize: Typography.caption.fontSize, color: 'rgba(255,255,255,0.8)' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  filtersContainer: { height: 52, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base, backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.default },
  filterChip: { paddingHorizontal: Spacing.base, paddingVertical: 7, borderRadius: BorderRadius.xl, backgroundColor: Colors.background.secondary, marginRight: Spacing.sm },
  filterChipActive: { backgroundColor: colors.brand.orange },
  filterChipText: { fontSize: Typography.body.fontSize, color: Colors.text.tertiary },
  filterChipTextActive: { color: Colors.text.inverse, fontWeight: '600' },
  section: { padding: Spacing.base },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.h4.fontSize, fontWeight: '700', color: Colors.nileBlue, marginBottom: Spacing.md },
  viewAllText: { fontSize: Typography.body.fontSize, fontWeight: '600', color: colors.brand.orange },
  offerCard: { width: 180, padding: Spacing.base, borderRadius: BorderRadius.lg, marginRight: Spacing.md },
  offerTitle: { fontSize: Typography.h2.fontSize, fontWeight: '700', color: Colors.text.inverse, marginBottom: Spacing.xs },
  offerSubtitle: { fontSize: Typography.bodySmall.fontSize, color: 'rgba(255,255,255,0.9)', marginBottom: Spacing.md },
  codeContainer: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.sm, alignSelf: 'flex-start' },
  codeText: { fontSize: Typography.caption.fontSize, fontWeight: '600', color: Colors.text.inverse },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  categoryCard: { width: (SCREEN_WIDTH - 56) / 3, alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg },
  categoryIcon: { width: 48, height: 48, borderRadius: BorderRadius['2xl'], backgroundColor: '#F9731620', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  categoryImageIcon: { width: 48, height: 48, borderRadius: BorderRadius['2xl'], marginBottom: Spacing.sm },
  categoryEmoji: { fontSize: Typography.h2.fontSize },
  categoryTitle: { fontSize: Typography.caption.fontSize, fontWeight: '600', color: Colors.nileBlue, marginBottom: 2, textAlign: 'center' },
  categoryCount: { fontSize: Typography.overline.fontSize, color: Colors.text.tertiary, textAlign: 'center' },
  cuisineCard: { width: 80, alignItems: 'center', marginRight: Spacing.md },
  cuisineEmoji: { fontSize: 36, marginBottom: Spacing.sm },
  cuisineName: { fontSize: Typography.bodySmall.fontSize, fontWeight: '600', color: Colors.nileBlue, marginBottom: 2, textTransform: 'capitalize' },
  cuisineCount: { fontSize: Typography.overline.fontSize, color: Colors.text.tertiary },
  restaurantCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.default, marginBottom: Spacing.md },
  restaurantImage: { width: '100%', height: 150 },
  restaurantImagePlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary },
  cashbackBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: Colors.success, paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  cashbackText: { fontSize: Typography.bodySmall.fontSize, fontWeight: '700', color: Colors.text.inverse },
  restaurantInfo: { padding: Spacing.base },
  restaurantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  restaurantName: { fontSize: Typography.h4.fontSize, fontWeight: '700', color: Colors.nileBlue, flex: 1, marginRight: Spacing.sm },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.success, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  ratingText: { fontSize: Typography.bodySmall.fontSize, fontWeight: '700', color: Colors.text.inverse },
  cuisineText: { fontSize: Typography.body.fontSize, color: Colors.text.tertiary, marginBottom: Spacing.sm },
  restaurantMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  metaText: { fontSize: Typography.bodySmall.fontSize, color: Colors.text.tertiary },
  promoBanner: { marginHorizontal: Spacing.base },
  promoGradient: { padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center' },
  promoTitle: { fontSize: Typography.h4.fontSize, fontWeight: '700', color: Colors.text.inverse, marginBottom: Spacing.xs },
  promoSubtitle: { fontSize: Typography.bodySmall.fontSize, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: Spacing.base },
  promoButton: { backgroundColor: Colors.background.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius['2xl'] },
  promoButtonText: { fontSize: Typography.body.fontSize, fontWeight: '700', color: Colors.success },

  // Loading & empty states
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F9731615', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, fontSize: Typography.body.fontSize, color: Colors.text.tertiary },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F9731615', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.h4.fontSize, fontWeight: '700', color: colors.neutral[900], marginBottom: Spacing.xs },
  emptySubtitle: { fontSize: Typography.bodySmall.fontSize, color: colors.neutral[500], textAlign: 'center', paddingHorizontal: Spacing.xl },
  emptySmall: { paddingVertical: Spacing.md, alignItems: 'center' },
  emptySmallText: { fontSize: Typography.bodySmall.fontSize, color: Colors.text.tertiary },
  loadMoreButton: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: colors.brand.orange, borderRadius: BorderRadius.lg },
  loadMoreText: { fontSize: Typography.body.fontSize, fontWeight: '600', color: colors.brand.orange },
});

export default withErrorBoundary(FoodPage, 'Food & Dining');
