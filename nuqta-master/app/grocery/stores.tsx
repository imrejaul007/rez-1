// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Grocery Stores Directory Page
 * Browse all grocery stores with filtering
 */

import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GroceryStoreCard from '@/components/grocery/GroceryStoreCard';
import { StoresListSkeleton } from '@/components/grocery/GrocerySkeleton';
import { storesApi } from '@/services/storesApi';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
interface Store {
  id: string;
  _id?: string;
  name: string;
  slug?: string;
  description?: string;
  logo?: string;
  banner?: string;
  rating?: { average?: number; count?: number };
  maxCashback?: number;
  operationalInfo?: {
    deliveryTime?: { min?: number; max?: number };
    minimumOrder?: number;
    freeDeliveryAbove?: number;
  };
  tags?: string[];
  deliveryCategories?: {
    fastDelivery?: boolean;
    budgetFriendly?: boolean;
    organic?: boolean;
    premium?: boolean;
  };
  isOpen?: boolean;
  distance?: string;
}

const GroceryStoresPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  // State
  const [stores, setStores] = useState<Store[]>([]);
  const [featuredStores, setFeaturedStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Filter options
  const filterOptions = [
    { key: 'all', label: 'All Stores', icon: 'grid-outline' },
    { key: 'fast', label: 'Fast Delivery', icon: 'flash-outline' },
    { key: 'cashback', label: 'High Cashback', icon: 'cash-outline' },
    { key: 'rating', label: 'Top Rated', icon: 'star-outline' },
    { key: 'organic', label: 'Organic', icon: 'leaf-outline' },
  ];

  // Fetch stores
  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);

      const [storesRes, featuredRes] = await Promise.all([
        storesApi.getStores({ category: 'grocery', limit: 20 }),
        storesApi.getFeaturedStores(5),
      ]);

      if (storesRes.success && storesRes.data?.stores) {
        let allStores = storesRes.data.stores;

        // Apply filters
        if (selectedFilter === 'fast') {
          allStores = allStores.filter((s: any) => s.deliveryCategories?.fastDelivery);
        } else if (selectedFilter === 'cashback') {
          allStores = allStores.sort((a: any, b: any) => (b.maxCashback || 0) - (a.maxCashback || 0));
        } else if (selectedFilter === 'rating') {
          allStores = allStores.sort((a: any, b: any) => (b.rating?.average || 0) - (a.rating?.average || 0));
        } else if (selectedFilter === 'organic') {
          allStores = allStores.filter((s: any) => s.deliveryCategories?.organic || s.tags?.includes('organic'));
        }

        if (!isMounted()) return;
        setStores(allStores);
      } else {
        if (!isMounted()) return;
        setStores(getFallbackStores());
      }

      if (featuredRes.success && featuredRes.data) {
        if (!isMounted()) return;
        setFeaturedStores(Array.isArray(featuredRes.data) ? featuredRes.data.slice(0, 3) : []);
      } else {
        if (!isMounted()) return;
        setFeaturedStores(getFallbackStores().slice(0, 3));
      }
    } catch (err) {
      if (!isMounted()) return;
      setStores(getFallbackStores());
      if (!isMounted()) return;
      setFeaturedStores(getFallbackStores().slice(0, 3));
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchStores();
  }, [fetchStores, authLoading, isAuthenticated]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStores();
  }, [fetchStores]);

  // Filter stores by search
  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render featured store card
  const renderFeaturedStore = (store: Store) => {
    const storeId = store.id || store._id || '';
    const deliveryTime = store.operationalInfo?.deliveryTime
      ? store.operationalInfo?.deliveryTime || "15-30 min"
      : '30-45 min';

    return (
      <Pressable
        key={storeId}
        style={styles.featuredCard}
        onPress={() => router.push(`/MainStorePage?storeId=${storeId}` as any)}
       
      >
        <CachedImage
          source={store.banner || store.logo || undefined}
          style={styles.featuredImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.featuredOverlay}
        >
          {(store.offers?.cashback || store.maxCashback) && (store.offers?.cashback || store.maxCashback) > 0 && (
            <View style={styles.cashbackBadge}>
              <Text style={styles.cashbackText}>{store.offers?.cashback || store.maxCashback}% Cashback</Text>
            </View>
          )}
          <View style={styles.featuredContent}>
            {store.logo && (
              <CachedImage source={store.logo} style={styles.storeLogo} />
            )}
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredName}>{store.name}</Text>
              <View style={styles.featuredMeta}>
                {store.rating?.average && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color={Colors.warning} />
                    <Text style={styles.ratingText}>{(store.ratings?.average || store.rating?.average || 4.5).toFixed(1)}</Text>
                  </View>
                )}
                <View style={styles.deliveryBadge}>
                  <Ionicons name="time-outline" size={12} color={Colors.success} />
                  <Text style={styles.deliveryText}>{deliveryTime}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  };

  // Render store list item
  const renderStoreItem = (store: Store) => {
    const storeId = store.id || store._id || '';
    const deliveryTime = store.operationalInfo?.deliveryTime
      ? store.operationalInfo?.deliveryTime || "15-30 min"
      : '30-45 min';

    // Build tags
    const tags: string[] = [];
    if (store.deliveryCategories?.fastDelivery) tags.push('Fast');
    if (store.deliveryCategories?.organic) tags.push('Organic');
    if (store.deliveryCategories?.premium) tags.push('Premium');

    return (
      <Pressable
        key={storeId}
        style={styles.storeCard}
        onPress={() => router.push(`/MainStorePage?storeId=${storeId}` as any)}
       
      >
        <CachedImage
          source={store.logo || store.banner || undefined}
          style={styles.storeImage}
        />
        {(store.offers?.cashback || store.maxCashback) && (store.offers?.cashback || store.maxCashback) > 0 && (
          <View style={styles.storeCashbackBadge}>
            <Text style={styles.storeCashbackText}>{store.offers?.cashback || store.maxCashback}%</Text>
          </View>
        )}
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{store.name}</Text>
          <View style={styles.storeMeta}>
            {store.rating?.average && (
              <>
                <Ionicons name="star" size={12} color={Colors.warning} />
                <Text style={styles.storeRating}>{(store.ratings?.average || store.rating?.average || 4.5).toFixed(1)}</Text>
              </>
            )}
            <View style={styles.dot} />
            <Text style={styles.storeDelivery}>{deliveryTime}</Text>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag, idx) => (
                <View key={idx} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.brand.orange, colors.brand.orangeDark]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.background.primary} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Grocery Stores</Text>
              <Text style={styles.headerSubtitle}>Loading stores...</Text>
            </View>
          </View>
        </LinearGradient>
        <StoresListSkeleton count={5} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.brand.orange, colors.brand.orangeDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.background.primary} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Grocery Stores</Text>
            <Text style={styles.headerSubtitle}>{stores.length} stores near you</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stores..."
            placeholderTextColor={Colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filterOptions.map((filter) => (
            <Pressable
              key={filter.key}
              style={[
                styles.filterChip,
                selectedFilter === filter.key && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Ionicons
                name={filter.icon as any}
                size={16}
                color={selectedFilter === filter.key ? Colors.background.primary : Colors.neutral[500]}
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === filter.key && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.brand.orange]}
            tintColor={colors.brand.orange}
          />
        }
      >
        {/* Featured Stores */}
        {featuredStores.length > 0 && !searchQuery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured Stores</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featuredStores.map(renderFeaturedStore)}
            </ScrollView>
          </View>
        )}

        {/* All Stores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? `Results for "${searchQuery}"` : 'All Stores'}
          </Text>
          {filteredStores.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={48} color={Colors.neutral[400]} />
              <Text style={styles.emptyText}>No stores found</Text>
            </View>
          ) : (
            <View style={styles.storesList}>
              {filteredStores.map(renderStoreItem)}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// Fallback stores
function getFallbackStores(): Store[] {
  return [
    {
      id: 'bigbasket',
      name: 'BigBasket',
      rating: { average: 4.5, count: 12500 },
      maxCashback: 15,
      operationalInfo: { deliveryTime: '30-45 min' },
      deliveryCategories: { fastDelivery: true, organic: true },
      tags: ['grocery', 'supermarket'],
    },
    {
      id: 'blinkit',
      name: 'Blinkit',
      rating: { average: 4.6, count: 8500 },
      maxCashback: 20,
      operationalInfo: { deliveryTime: '8-15 min' },
      deliveryCategories: { fastDelivery: true, premium: true },
      tags: ['grocery', 'quick-delivery'],
    },
    {
      id: 'zepto',
      name: 'Zepto',
      rating: { average: 4.4, count: 6200 },
      maxCashback: 25,
      operationalInfo: { deliveryTime: '10-20 min' },
      deliveryCategories: { fastDelivery: true },
      tags: ['grocery', 'quick-delivery'],
    },
    {
      id: 'dmart',
      name: 'DMart Ready',
      rating: { average: 4.3, count: 9800 },
      maxCashback: 10,
      operationalInfo: { deliveryTime: '45-90 min' },
      deliveryCategories: { budgetFriendly: true },
      tags: ['grocery', 'supermarket', 'budget'],
    },
    {
      id: 'organic-garden',
      name: 'Organic Garden',
      rating: { average: 4.7, count: 1800 },
      maxCashback: 20,
      operationalInfo: { deliveryTime: '60-120 min' },
      deliveryCategories: { organic: true, premium: true },
      tags: ['grocery', 'organic'],
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 16,
    paddingHorizontal: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.nileBlue,
  },
  filtersContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.neutral[100],
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: colors.brand.orange,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  filterChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  section: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.nileBlue,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  featuredScroll: {
    paddingHorizontal: Spacing.base,
  },
  featuredCard: {
    width: 280,
    height: 160,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginRight: 12,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  cashbackBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  cashbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeLogo: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    marginRight: 10,
  },
  featuredInfo: {
    flex: 1,
  },
  featuredName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.xs,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  deliveryText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.inverse,
  },
  storesList: {
    paddingHorizontal: Spacing.base,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  storeImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[100],
  },
  storeCashbackBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  storeCashbackText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  storeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  storeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  storeRating: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginLeft: 2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.neutral[400],
    marginHorizontal: 6,
  },
  storeDelivery: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  tagBadge: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: Colors.neutral[500],
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: Spacing.md,
  },
});

export default withErrorBoundary(GroceryStoresPage, 'GroceryStores');
