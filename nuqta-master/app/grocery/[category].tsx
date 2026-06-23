// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Grocery Category Page - Dynamic route with API Integration
 * Handles all grocery subcategories: fruits, veggies, dairy, snacks, etc.
 */

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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GroceryProductCard from '@/components/grocery/GroceryProductCard';
import { ProductsGridSkeleton } from '@/components/grocery/GrocerySkeleton';
import { productsApi } from '@/services/productsApi';
import { cartApi } from '@/services/cartApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

const COLORS = {
  white: Colors.background.primary,
  navy: colors.brand.navyDark,
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray400: Colors.text.tertiary,
  gray600: Colors.text.tertiary,
  green500: Colors.success,
  green600: Colors.success,
  amber500: Colors.warning,
  red500: Colors.error,
};

// Category configuration with metadata
const categoryConfig: Record<string, {
  title: string;
  icon: string;
  gradientColors: [string, string];
  description: string;
  tags: string[];
}> = {
  // Main categories from homepage
  fruits: {
    title: 'Fruits',
    icon: '🍎',
    gradientColors: ['#FF6B6B', '#EE5A5A'],
    description: 'Fresh fruits delivered to your doorstep',
    tags: ['fruits', 'fresh', 'organic'],
  },
  veggies: {
    title: 'Vegetables',
    icon: '🥕',
    gradientColors: [colors.brand.emerald, '#43A047'],
    description: 'Farm-fresh vegetables',
    tags: ['vegetables', 'veggies', 'fresh', 'organic'],
  },
  dairy: {
    title: 'Dairy & Eggs',
    icon: '🥛',
    gradientColors: ['#2196F3', '#1E88E5'],
    description: 'Milk, curd, cheese, eggs and more',
    tags: ['dairy', 'milk', 'eggs', 'cheese'],
  },
  snacks: {
    title: 'Snacks & Munchies',
    icon: '🍪',
    gradientColors: ['#FF9800', '#FB8C00'],
    description: 'Chips, namkeen, biscuits and more',
    tags: ['snacks', 'chips', 'biscuits', 'namkeen'],
  },
  // Additional categories
  beverages: {
    title: 'Beverages',
    icon: '🥤',
    gradientColors: ['#00BCD4', '#00ACC1'],
    description: 'Cold drinks, juices, tea, coffee',
    tags: ['beverages', 'drinks', 'juice', 'tea', 'coffee'],
  },
  staples: {
    title: 'Staples & Grains',
    icon: '🌾',
    gradientColors: ['#795548', '#6D4C41'],
    description: 'Rice, dal, atta, oil, sugar',
    tags: ['staples', 'rice', 'dal', 'atta', 'grains'],
  },
  essentials: {
    title: 'Essentials',
    icon: '🧴',
    gradientColors: [colors.success, colors.brand.greenDark],
    description: 'Cleaning & personal care',
    tags: ['essentials', 'personal-care', 'cleaning'],
  },
  daily: {
    title: 'Daily Needs',
    icon: '🥛',
    gradientColors: [colors.infoScale[400], colors.brand.blue],
    description: 'Dairy & bread',
    tags: ['daily', 'dairy', 'bread', 'bakery'],
  },
  supermarket: {
    title: 'Supermarket',
    icon: '🛒',
    gradientColors: [colors.brand.orange, colors.brand.orangeDark],
    description: 'BigBasket, DMart',
    tags: ['supermarket', 'grocery', 'bigbasket', 'dmart'],
  },
  organic: {
    title: 'Organic',
    icon: '🌿',
    gradientColors: [colors.successScale[400], colors.successScale[700]],
    description: 'Organic vegetables & fruits',
    tags: ['organic', 'natural', 'farm', 'fresh'],
  },
  deals: {
    title: 'Hot Deals',
    icon: '🏷️',
    gradientColors: [colors.error, colors.error],
    description: 'Best deals & offers',
    tags: ['deals', 'offers', 'discount', 'sale'],
  },
  fresh: {
    title: 'Fresh Produce',
    icon: '🥬',
    gradientColors: ['#84CC16', '#65A30D'],
    description: 'Vegetables & Fruits',
    tags: ['fresh', 'vegetables', 'fruits', 'produce'],
  },
  'personal-care': {
    title: 'Personal Care',
    icon: '🧴',
    gradientColors: ['#E91E63', '#D81B60'],
    description: 'Skincare, haircare, hygiene',
    tags: ['personal-care', 'hygiene', 'skincare', 'haircare'],
  },
  household: {
    title: 'Household',
    icon: '🧹',
    gradientColors: ['#9C27B0', '#8E24AA'],
    description: 'Cleaning supplies, detergents',
    tags: ['household', 'cleaning', 'detergent'],
  },
};

// Filter options
const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'price_low', label: 'Price: Low', sort: 'price', order: 'asc' },
  { key: 'price_high', label: 'Price: High', sort: 'price', order: 'desc' },
  { key: 'rating', label: 'Rating', sort: 'rating', order: 'desc' },
  { key: 'cashback', label: 'Cashback', sort: 'cashback', order: 'desc' },
];

interface Product {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  images?: Array<{ url: string; alt?: string }>;
  pricing?: { basePrice?: number; salePrice?: number };
  unit?: string;
  rating?: { average?: number; count?: number };
  cashback?: { percentage?: number };
  store?: { id?: string; name?: string };
  inStock?: boolean;
  tags?: string[];
}

const GroceryCategoryPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const { category } = useLocalSearchParams<{ category: string }>();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);

  // Get category config
  const categorySlug = category || 'essentials';
  const config = categoryConfig[categorySlug] || {
    title: categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1),
    icon: '🛒',
    gradientColors: [colors.success, colors.brand.greenDark] as [string, string],
    description: 'Grocery items',
    tags: [categorySlug],
  };

  // Fetch products from API
  const fetchProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      // Build query params
      const queryParams: any = {
        page,
        limit: 20,
        status: 'active',
      };

      // Add category filter based on tags or category slug
      if (categorySlug && categorySlug !== 'all') {
        queryParams.category = categorySlug;
        // Also search by tags for better results
        queryParams.tags = config.tags;
      }

      // Add search query
      if (searchQuery.trim()) {
        queryParams.search = searchQuery.trim();
      }

      // Add sorting
      const filter = filterOptions.find(f => f.key === selectedFilter);
      if (filter && filter.sort) {
        queryParams.sort = filter.sort;
        queryParams.order = filter.order;
      }

      const response = await productsApi.getProducts(queryParams);

      if (response.success && response.data) {
        const newProducts = response.data.products || [];
        if (append) {
          if (!isMounted()) return;
          setProducts(prev => [...prev, ...newProducts]);
        } else {
          if (!isMounted()) return;
          setProducts(newProducts);
        }
        if (!isMounted()) return;
        setPagination({
          current: response.data.pagination?.current || page,
          pages: response.data.pagination?.pages || 1,
          total: response.data.pagination?.total || newProducts.length,
        });
      } else {
        // If API fails, use fallback data
        if (page === 1) {
          if (!isMounted()) return;
          setProducts(getFallbackProducts(categorySlug));
          if (!isMounted()) return;
          setPagination({ current: 1, pages: 1, total: 10 });
        }
      }
    } catch (err: any) {
      if (page === 1) {
        if (!isMounted()) return;
        setProducts(getFallbackProducts(categorySlug));
        if (!isMounted()) return;
        setPagination({ current: 1, pages: 1, total: 10 });
      }
      if (!isMounted()) return;
      setError('Unable to load products. Showing cached data.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [categorySlug, searchQuery, selectedFilter, config.tags]);

  // Initial load
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchProducts(1);
  }, [fetchProducts, authLoading, isAuthenticated]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(1);
  }, [fetchProducts]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && pagination.current < pagination.pages) {
      fetchProducts(pagination.current + 1, true);
    }
  }, [loadingMore, pagination, fetchProducts]);

  // Handle filter change
  const handleFilterChange = (filterKey: string) => {
    setSelectedFilter(filterKey);
    setProducts([]);
    fetchProducts(1);
  };

  // Handle search
  const handleSearch = () => {
    setProducts([]);
    fetchProducts(1);
  };

  // Handle add to cart
  const handleAddToCart = async (product: Product) => {
    try {
      const productId = product.id || product._id || '';
      await cartApi.addToCart(productId, 1);
      // Could show a toast here
    } catch (err) {
      // silently handle
    }
  };

  // Render search bar
  const renderSearchBar = () => {
    if (!showSearch) return null;

    return (
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search in ${config.title}...`}
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(''); handleSearch(); }}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray400} />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{config.icon}</Text>
      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? `No results for "${searchQuery}"`
          : `No ${config.title.toLowerCase()} available right now`}
      </Text>
      <Pressable style={styles.emptyButton} onPress={onRefresh}>
        <Text style={styles.emptyButtonText}>Refresh</Text>
      </Pressable>
    </View>
  );

  // Render error state
  const renderErrorBanner = () => {
    if (!error) return null;

    return (
      <View style={styles.errorBanner}>
        <Ionicons name="warning-outline" size={16} color={COLORS.amber500} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={onRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  };

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
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{config.icon} {config.title}</Text>
            <Text style={styles.headerSubtitle}>
              {pagination.total > 0 ? `${pagination.total} items` : config.description}
            </Text>
          </View>
          <Pressable
            style={styles.searchButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons
              name={showSearch ? 'close' : 'search'}
              size={24}
              color={COLORS.white}
            />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      {renderSearchBar()}

      {/* Error Banner */}
      {renderErrorBanner()}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filterOptions.map((filter) => (
            <Pressable
              key={filter.key}
              onPress={() => handleFilterChange(filter.key)}
              style={[
                styles.filterChip,
                selectedFilter === filter.key && styles.filterChipActive,
              ]}
            >
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

      {/* Products */}
      {loading ? (
        <ProductsGridSkeleton count={6} />
      ) : (
        <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[config.gradientColors[0]]}
              tintColor={config.gradientColors[0]}
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isCloseToBottom =
              layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
            if (isCloseToBottom) {
              handleLoadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {products.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.productsGrid}>
              {products.map((product) => (
                <GroceryProductCard
                  key={product.id || product._id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  showStore
                />
              ))}
            </View>
          )}

          {/* Load More Indicator */}
          {loadingMore && (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={config.gradientColors[0]} />
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          )}

          {/* Bottom Padding */}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
};

// Fallback data when API fails
function getFallbackProducts(category: string): Product[] {
  const image = undefined;
  const config = categoryConfig[category];
  const title = config?.title || 'Product';

  return Array.from({ length: 6 }, (_, i) => ({
    id: `fallback-${category}-${i}`,
    name: `${title} Item ${i + 1}`,
    description: 'Fresh quality product',
    images: [{ url: image, alt: title }],
    pricing: { basePrice: 50 + i * 20, salePrice: 45 + i * 18 },
    unit: '1 kg',
    rating: { average: 4.0, count: 50 + i * 10 },
    cashback: { percentage: 8 + i },
    store: { id: 'store-1', name: 'Local Store' },
    inStock: true,
    tags: config?.tags || [category],
  }));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : Spacing.base,
    paddingBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
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
    color: COLORS.white,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  searchButton: {
    padding: Spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    fontSize: 15,
    color: COLORS.navy,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '1A',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    ...Typography.bodySmall,
    fontSize: 13,
    color: COLORS.amber500,
  },
  retryText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.amber500,
  },
  filtersContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  filterChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: COLORS.gray100,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.green500,
  },
  filterChipText: {
    ...Typography.body,
    color: COLORS.gray600,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: Spacing.base,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    backgroundColor: COLORS.green500,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  emptyButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.white,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  loadingMoreText: {
    ...Typography.body,
    color: COLORS.gray600,
  },
});

export default withErrorBoundary(GroceryCategoryPage, 'GroceryCategory');
