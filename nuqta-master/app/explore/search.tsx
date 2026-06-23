import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import exploreApi, { ExploreStore, HotProduct } from '@/services/exploreApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

type TabType = 'stores' | 'products';

const ExploreSearchPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const { q: initialQuery } = useLocalSearchParams();

  const [searchQuery, setSearchQuery] = useState(initialQuery as string || '');
  const [activeTab, setActiveTab] = useState<TabType>('stores');
  const [stores, setStores] = useState<ExploreStore[]>([]);
  const [products, setProducts] = useState<HotProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Search function
  const performSearch = useCallback(async (query: string, isRefresh = false) => {
    if (!query.trim()) {
      setStores([]);
      setProducts([]);
      setHasSearched(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setHasSearched(true);

      // Search stores and products in parallel
      const [storesResponse, productsResponse] = await Promise.all([
        exploreApi.searchStores(query, { limit: 20 }),
        exploreApi.getHotDeals({ limit: 20 }),
      ]);

      if (storesResponse.success && storesResponse.data) {
        if (!isMounted()) return;
        setStores(storesResponse.data.stores || []);
      }

      if (productsResponse.success && productsResponse.data) {
        // Filter products by search query (basic client-side filtering)
        const filteredProducts = productsResponse.data.products.filter((p: HotProduct) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.store && p.store.toLowerCase().includes(query.toLowerCase()))
        );
        if (!isMounted()) return;
        setProducts(filteredProducts);
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
  }, []);

  const isInitialMount = useRef(true);

  // Initial search if query provided
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery as string);
    }
  }, [initialQuery, performSearch]);

  // Debounced search - skip on initial mount to avoid double-fire
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setStores([]);
        setProducts([]);
        setHasSearched(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const onRefresh = useCallback(() => {
    performSearch(searchQuery, true);
  }, [searchQuery, performSearch]);

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setStores([]);
    setProducts([]);
    setHasSearched(false);
  };

  const currentResults = activeTab === 'stores' ? stores : products;
  const resultsCount = activeTab === 'stores' ? stores.length : products.length;

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
            <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
          </Pressable>

          {/* Search Input */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search stores, products..."
              placeholderTextColor={colors.neutral[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => performSearch(searchQuery)}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={clearSearch}>
                <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'stores' && styles.tabActive]}
            onPress={() => setActiveTab('stores')}
          >
            <Ionicons
              name="storefront"
              size={16}
              color={activeTab === 'stores' ? colors.background.primary : colors.neutral[500]}
            />
            <Text style={[styles.tabText, activeTab === 'stores' && styles.tabTextActive]}>
              Stores ({stores.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'products' && styles.tabActive]}
            onPress={() => setActiveTab('products')}
          >
            <Ionicons
              name="pricetag"
              size={16}
              color={activeTab === 'products' ? colors.background.primary : colors.neutral[500]}
            />
            <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
              Products ({products.length})
            </Text>
          </Pressable>
        </View>

        {/* Results */}
        <ScrollView
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.lightMustard]} />
          }
        >
          {/* Loading State */}
          {loading && !refreshing && (
            <CardGridSkeleton />
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle" size={48} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={() => performSearch(searchQuery)}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Initial State - No Search Yet */}
          {!hasSearched && !loading && (
            <View style={styles.centerContainer}>
              <Ionicons name="search" size={48} color={Colors.text.tertiary} />
              <Text style={styles.centerTitle}>{`Search ${BRAND.APP_NAME}`}</Text>
              <Text style={styles.centerSubtext}>Find stores, products, and deals near you</Text>
            </View>
          )}

          {/* Empty State */}
          {hasSearched && !loading && !error && currentResults.length === 0 && (
            <View style={styles.centerContainer}>
              <Ionicons name="search-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.centerTitle}>No {activeTab} found</Text>
              <Text style={styles.centerSubtext}>Try a different search term</Text>
            </View>
          )}

          {/* Store Results */}
          {!loading && !error && activeTab === 'stores' && stores.map((store) => (
            <Pressable
              key={store.id}
              style={styles.storeCard}
              onPress={() => navigateTo(`/MainStorePage?storeId=${store.id}`)}
            >
              {store.image ? (
                <CachedImage source={store.image} style={styles.storeImage} />
              ) : (
                <View style={[styles.storeImage, styles.storePlaceholder]}>
                  <Ionicons name="storefront" size={28} color={Colors.text.tertiary} />
                </View>
              )}

              <View style={styles.storeContent}>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeCategory}>{store.category}</Text>

                <View style={styles.storeFooter}>
                  {store.rating && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color={Colors.warning} />
                      <Text style={styles.ratingText}>{store.rating}</Text>
                    </View>
                  )}
                  {store.distance && (
                    <View style={styles.infoBadge}>
                      <Ionicons name="location" size={12} color={Colors.text.tertiary} />
                      <Text style={styles.infoText}>{store.distance}</Text>
                    </View>
                  )}
                </View>

                {store.cashback && (
                  <View style={styles.cashbackBadge}>
                    <Text style={styles.cashbackText}>{store.cashback} Cashback</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}

          {/* Product Results */}
          {!loading && !error && activeTab === 'products' && products.map((product) => (
            <Pressable
              key={product.id}
              style={styles.productCard}
              onPress={() => navigateTo(`/product-page?cardId=${product.id}&cardType=product`)}
            >
              {product.image ? (
                <CachedImage source={product.image} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, styles.productPlaceholder]}>
                  <Ionicons name="cube" size={28} color={Colors.text.tertiary} />
                </View>
              )}

              <View style={styles.productContent}>
                <Text style={styles.productName}>{product.name}</Text>
                {product.store && <Text style={styles.productStore}>{product.store}</Text>}

                <View style={styles.priceRow}>
                  <Text style={styles.productPrice}>{currencySymbol}{product.price}</Text>
                  {product.originalPrice > product.price && (
                    <Text style={styles.originalPrice}>{currencySymbol}{product.originalPrice}</Text>
                  )}
                </View>

                {product.offer && (
                  <View style={styles.offerBadge}>
                    <Text style={styles.offerText}>{product.offer}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
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
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.nileBlue,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.nileBlue,
  },
  tabText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  resultsList: {
    flex: 1,
  },
  resultsContainer: {
    paddingHorizontal: Spacing.base,
    minHeight: 300,
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  centerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: Spacing.base,
  },
  centerText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  centerSubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.xl,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  storeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  storeImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
  },
  storePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeContent: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  storeName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  storeCategory: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  storeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  cashbackBadge: {
    backgroundColor: colors.successScale[50],
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  cashbackText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: colors.successScale[700],
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
  },
  productPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productContent: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  productName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  productStore: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: Spacing.sm,
  },
  productPrice: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  originalPrice: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  offerBadge: {
    backgroundColor: colors.successScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  offerText: {
    ...Typography.caption,
    fontWeight: '600',
    color: colors.successScale[700],
  },
});

export default withErrorBoundary(ExploreSearchPage, 'ExploreSearch');
