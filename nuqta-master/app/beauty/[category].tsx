// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Beauty Category Page - Dynamic route with API Integration
 * salon, spa, products, wellness, skincare, haircare
 * Production-ready with real data, filters, and booking flow
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import storesApi from '@/services/storesApi';
import productsApi from '@/services/productsApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';


// Category configuration with API tags
const categoryConfig: Record<string, {
  title: string;
  icon: string;
  gradientColors: [string, string];
  tags: string[];
  type: 'store' | 'product';
  subtitle: string;
}> = {
  salon: {
    title: 'Salons',
    icon: '💇‍♀️',
    gradientColors: [colors.brand.pink, '#F43F5E'],
    tags: ['salon', 'beauty', 'hair'],
    type: 'store',
    subtitle: 'Book hair, beauty & grooming services',
  },
  spa: {
    title: 'Spa & Massage',
    icon: '💆‍♀️',
    gradientColors: [colors.brand.purpleLight, colors.brand.purple],
    tags: ['spa', 'massage', 'wellness'],
    type: 'store',
    subtitle: 'Relax and rejuvenate',
  },
  products: {
    title: 'Beauty Products',
    icon: '💄',
    gradientColors: ['#F43F5E', '#E11D48'],
    tags: ['beauty', 'cosmetics', 'makeup'],
    type: 'product',
    subtitle: 'Shop makeup, skincare & more',
  },
  wellness: {
    title: 'Wellness Centers',
    icon: '🧘‍♀️',
    gradientColors: [colors.successScale[400], colors.successScale[700]],
    tags: ['wellness', 'yoga', 'meditation', 'fitness'],
    type: 'store',
    subtitle: 'Yoga, meditation & holistic health',
  },
  skincare: {
    title: 'Skincare',
    icon: '✨',
    gradientColors: [colors.warningScale[400], colors.warningScale[700]],
    tags: ['skincare', 'beauty', 'cosmetics'],
    type: 'product',
    subtitle: 'Serums, moisturizers & treatments',
  },
  haircare: {
    title: 'Hair Care',
    icon: '💇',
    gradientColors: [colors.infoScale[400], colors.brand.blue],
    tags: ['haircare', 'hair', 'beauty'],
    type: 'product',
    subtitle: 'Shampoos, treatments & styling',
  },
};

interface DisplayItem {
  id: string;
  name: string;
  type: string;
  rating: number;
  distance: string;
  cashback: string;
  price: string;
  image: string;
  isVerified?: boolean;
  reviewCount?: number;
}

const BeautyCategoryPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<DisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = categoryConfig[category || 'salon'] || categoryConfig['salon'];
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'nearby', label: 'Nearby', icon: 'location-outline' },
    { id: 'top-rated', label: 'Top Rated', icon: 'star' },
    { id: 'best-cashback', label: 'Best Cashback', icon: 'wallet-outline' },
  ];

  // Transform store data to display item
  const transformStoreToItem = (store: any): DisplayItem => ({
    id: store._id || store.id,
    name: store.name,
    type: store.category?.name || store.tags?.[0] || 'Service',
    rating: store.ratings?.average || 4.5,
    distance: store.distance ? `${store.distance.toFixed(1)} km` : '1.0 km',
    cashback: store.offers?.cashback?.percentage
      ? `${store.offers.cashback.percentage}%`
      : store.cashback?.maxPercentage
        ? `${store.cashback.maxPercentage}%`
        : '15%',
    price: store.priceRange || `${currencySymbol}500+`,
    image: store.logo || store.banner || store.images?.[0],
    isVerified: store.isVerified || store.verification?.isVerified || false,
    reviewCount: store.ratings?.count || 0,
  });

  // Transform product data to display item
  const transformProductToItem = (product: any): DisplayItem => ({
    id: product._id || product.id,
    name: product.name,
    type: product.brand?.name || product.category?.name || 'Product',
    rating: product.ratings?.average || 4.5,
    distance: 'Online',
    cashback: product.cashback?.percentage
      ? `${product.cashback.percentage}%`
      : '10%',
    price: product.pricing?.salePrice
      ? `${currencySymbol}${product.pricing.salePrice.toLocaleString()}`
      : product.pricing?.basePrice
        ? `${currencySymbol}${product.pricing.basePrice.toLocaleString()}`
        : product.price
          ? `${currencySymbol}${product.price.toLocaleString()}`
          : `${currencySymbol}499+`,
    image: product.images?.[0]?.url || product.images?.[0] || product.image,
    isVerified: product.isVerified || false,
    reviewCount: product.ratings?.count || 0,
  });

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setError(null);

      if (config.type === 'store') {
        // Fetch stores (isActive is automatically applied by backend)
        const response = await storesApi.getStores({
          tags: config.tags,
          limit: 20,
        });

        if (response.success && response.data?.stores && response.data.stores.length > 0) {
          const transformedItems = response.data.stores.map(transformStoreToItem);
          if (!isMounted()) return;
          setItems(transformedItems);
          if (!isMounted()) return;
          setFilteredItems(transformedItems);
        } else {
          // No data found
          if (!isMounted()) return;
          setItems([]);
          if (!isMounted()) return;
          setFilteredItems([]);
        }
      } else {
        // Fetch products
        const response = await productsApi.getProducts({
          tags: config.tags,
          limit: 20,
        });

        if (response.success && response.data?.products && response.data.products.length > 0) {
          const transformedItems = response.data.products.map(transformProductToItem);
          if (!isMounted()) return;
          setItems(transformedItems);
          if (!isMounted()) return;
          setFilteredItems(transformedItems);
        } else {
          if (!isMounted()) return;
          setItems([]);
          if (!isMounted()) return;
          setFilteredItems([]);
        }
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load data');
      if (!isMounted()) return;
      setItems([]);
      if (!isMounted()) return;
      setFilteredItems([]);
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [category, config]);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Apply filters
  useEffect(() => {
    if (selectedFilter === 'all') {
      setFilteredItems(items);
    } else if (selectedFilter === 'nearby') {
      // Sort by distance (parse km value)
      const sorted = [...items].sort((a, b) => {
        const distA = parseFloat(a.distance) || 999;
        const distB = parseFloat(b.distance) || 999;
        return distA - distB;
      });
      setFilteredItems(sorted);
    } else if (selectedFilter === 'top-rated') {
      // Sort by rating
      const sorted = [...items].sort((a, b) => b.rating - a.rating);
      setFilteredItems(sorted);
    } else if (selectedFilter === 'best-cashback') {
      // Sort by cashback percentage
      const sorted = [...items].sort((a, b) => {
        const cashA = parseFloat(a.cashback) || 0;
        const cashB = parseFloat(b.cashback) || 0;
        return cashB - cashA;
      });
      setFilteredItems(sorted);
    }
  }, [selectedFilter, items]);

  // Handle item press - navigate to store or product page
  const handleItemPress = (item: DisplayItem) => {
    if (config.type === 'store') {
      router.push(`/MainStorePage?storeId=${item.id}` as any);
    } else {
      router.push(`/product-page?productId=${item.id}` as any);
    }
  };

  // Handle book/buy button press
  const handleBookPress = (item: DisplayItem) => {
    if (config.type === 'store') {
      // Navigate to store page with booking intent
      router.push(`/MainStorePage?storeId=${item.id}&action=book` as any);
    } else {
      // Navigate to product page with add to cart intent
      router.push(`/product-page?productId=${item.id}&action=buy` as any);
    }
  };

  // Handle search
  const handleSearch = () => {
    router.push(`/search?category=beauty&subcategory=${category}` as any);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={config.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{config.icon} {config.title}</Text>
            <Text style={styles.headerSubtitle}>{config.subtitle}</Text>
          </View>
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filteredItems.length}</Text>
            <Text style={styles.statLabel}>{config.type === 'store' ? 'Places' : 'Products'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>30%</Text>
            <Text style={styles.statLabel}>Max Cashback</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>2X</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => setSelectedFilter(filter.id)}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && { backgroundColor: config.gradientColors[0] }
              ]}
            >
              {filter.icon && (
                <Ionicons
                  name={filter.icon as any}
                  size={14}
                  color={selectedFilter === filter.id ? Colors.background.primary : Colors.text.tertiary}
                />
              )}
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter.id && styles.filterChipTextActive
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[config.gradientColors[0]]}
          />
        }
      >
        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.text.tertiary} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Empty State */}
        {!error && filteredItems.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{config.icon}</Text>
            <Text style={styles.emptyTitle}>No {config.title} Found</Text>
            <Text style={styles.emptySubtitle}>
              We're working on adding more {config.title.toLowerCase()} in your area.
            </Text>
            <Pressable
              style={[styles.exploreButton, { backgroundColor: config.gradientColors[0] }]}
              onPress={() => router.push('/beauty' as any)}
            >
              <Text style={styles.exploreButtonText}>Explore Other Categories</Text>
            </Pressable>
          </View>
        )}

        {/* Items List */}
        {filteredItems.length > 0 && (
          <View style={styles.itemsList}>
            {filteredItems.map((item) => (
              <Pressable
                key={item.id}
                style={styles.itemCard}
                onPress={() => handleItemPress(item)}
               
              >
                <CachedImage source={item.image} style={styles.itemImage} />

                {/* Cashback Badge */}
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>{item.cashback}</Text>
                </View>

                {/* Verified Badge */}
                {item.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={Colors.text.inverse} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}

                <View style={styles.itemInfo}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeText}>{item.type}</Text>
                    </View>
                  </View>

                  <View style={styles.itemMeta}>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color={Colors.warning} />
                      <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                      {item.reviewCount > 0 && (
                        <Text style={styles.reviewCount}>({item.reviewCount})</Text>
                      )}
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={14} color={Colors.text.tertiary} />
                      <Text style={styles.metaText}>{item.distance}</Text>
                    </View>
                  </View>

                  <View style={styles.itemFooter}>
                    <View>
                      <Text style={styles.priceLabel}>
                        {config.type === 'store' ? 'Starting from' : 'Price'}
                      </Text>
                      <Text style={styles.priceText}>{item.price}</Text>
                    </View>
                    <Pressable
                      style={[styles.bookButton, { backgroundColor: config.gradientColors[0] }]}
                      onPress={() => handleBookPress(item)}
                    >
                      <Text style={styles.bookButtonText}>
                        {config.type === 'store' ? 'Book' : 'Buy'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  searchButton: {
    padding: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  statValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  statLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
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
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm,
    gap: 6,
  },
  filterChipText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  filterChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    marginTop: 60,
  },
  errorText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.base,
  },
  retryButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  retryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  exploreButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  exploreButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  itemsList: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  itemCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemImage: {
    width: '100%',
    height: 180,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cashbackText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 192, 106, 0.9)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  verifiedText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  itemInfo: {
    padding: Spacing.base,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  itemName: {
    flex: 1,
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginRight: Spacing.sm,
  },
  typeBadge: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  typeText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  reviewCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
  },
  priceLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  priceText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  bookButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  bookButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(BeautyCategoryPage, 'BeautyCategory');
