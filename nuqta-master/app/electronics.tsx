// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Electronics Category Page
 * Production-ready: fetches subcategories, products, and stores from real APIs.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthLoading, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import CachedImage from '@/components/ui/CachedImage';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_SLUG = 'electronics';
const PRODUCTS_PER_PAGE = 10;

// --- Types ---

interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  productCount?: number;
}

interface Product {
  _id: string;
  name: string;
  brand?: string;
  pricing?: { selling?: number; original?: number; discount?: number; currency?: string };
  price?: { current?: number; original?: number; currency?: string } | number;
  images?: string[];
  image?: string;
  rating?: { average?: number; count?: number };
  averageRating?: number;
  cashbackPercentage?: number;
  store?: { name?: string };
}

interface Store {
  _id: string;
  name: string;
  logo?: string;
  image?: string;
  rating?: number;
  averageRating?: number;
  maxCashback?: number;
  tags?: string[];
}

interface Stats {
  totalProducts: number;
  maxCashback: number;
  totalBrands: number;
}

// --- Helpers ---

function getProductPrice(p: Product): number {
  if (p.pricing?.selling) return p.pricing.selling;
  if (p.pricing?.original) return p.pricing.original;
  if (typeof p.price === 'number') return p.price;
  if (p.price && typeof p.price === 'object') return p.price.current || p.price.original || 0;
  return 0;
}

function getOriginalPrice(p: Product): number {
  if (p.pricing?.original) return p.pricing.original;
  if (typeof p.price === 'object' && p.price) return p.price.original || 0;
  return 0;
}

function getProductImage(p: Product): string | undefined {
  if (p.images && p.images.length > 0) return p.images[0];
  return p.image;
}

function getRating(p: Product): number {
  return p.rating?.average || p.averageRating || 0;
}

function formatPrice(value: number, currencySymbol: string): string {
  return `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// --- Filters ---

const FILTER_OPTIONS = ['all', 'Best Sellers', 'New Arrivals', 'Top Rated', 'Deals'] as const;
type FilterType = (typeof FILTER_OPTIONS)[number];

function getFilterParams(filter: FilterType): Record<string, any> {
  switch (filter) {
    case 'Best Sellers':
      return { sortBy: 'popular' };
    case 'New Arrivals':
      return { sortBy: 'newest' };
    case 'Top Rated':
      return { sortBy: 'rating' };
    case 'Deals':
      return { sortBy: 'price_low' };
    default:
      return {};
  }
}

// --- Component ---

const ElectronicsPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  // Data states
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, maxCashback: 0, totalBrands: 0 });

  // Loading / pagination states
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);



  // --- Fetch subcategories + stores (once) ---
  useEffect(() => {
    if (authLoading) return;

    const fetchInitial = async () => {
      setLoadingInitial(true);
      try {
        const [catRes, storeRes] = await Promise.all([
          apiClient.get<any>('/categories', { parent: CATEGORY_SLUG }),
          apiClient.get<any>('/stores', { category: CATEGORY_SLUG, limit: 5, page: 1, sortBy: 'rating' }),
        ]);

        if (!isMounted()) return;

        // Subcategories
        const cats: Subcategory[] = [];
        if (catRes.success && catRes.data) {
          const raw = Array.isArray(catRes.data) ? catRes.data : catRes.data.categories || [];
          raw.forEach((c: any) => cats.push({
            _id: c._id,
            name: c.name,
            slug: c.slug,
            icon: c.icon,
            image: c.image,
            productCount: c.productCount || c.count || 0,
          }));
        }
        if (!isMounted()) return;
        setSubcategories(cats);

        // Stores (top brands)
        const storeList: Store[] = [];
        if (storeRes.success && storeRes.data) {
          const raw = Array.isArray(storeRes.data) ? storeRes.data : storeRes.data.stores || [];
          raw.forEach((s: any) => storeList.push({
            _id: s._id,
            name: s.name,
            logo: s.logo,
            image: s.image,
            rating: s.rating || s.averageRating,
            maxCashback: s.maxCashback || s.cashbackPercentage || 0,
            tags: s.tags,
          }));
        }
        if (!isMounted()) return;
        setStores(storeList);

        // Stats from pagination meta or fallback
        const totalProducts = storeRes.meta?.pagination?.total || 0;
        if (!isMounted()) return;
        setStats({
          totalProducts,
          maxCashback: storeList.reduce((max, s) => Math.max(max, s.maxCashback || 0), 0),
          totalBrands: storeList.length,
        });
      } catch {
        // Silent fail — empty states will show
      } finally {
        if (isMounted()) setLoadingInitial(false);
      }
    };

    fetchInitial();
  }, [authLoading]);

  // --- Fetch products (on filter / page change) ---
  const fetchProducts = useCallback(async (pageNum: number, append: boolean) => {
    if (!append) setLoadingProducts(true);

    try {
      const params: Record<string, any> = {
        category: CATEGORY_SLUG,
        page: pageNum,
        limit: PRODUCTS_PER_PAGE,
        ...getFilterParams(selectedFilter),
      };
      const res = await apiClient.get<any>('/products', params);

      if (!isMounted()) return;

      if (res.success && res.data) {
        const raw = Array.isArray(res.data) ? res.data : res.data.products || [];
        const mapped: Product[] = raw.map((p: any) => ({
          _id: p._id,
          name: p.name,
          brand: p.brand,
          pricing: p.pricing,
          price: p.price,
          images: p.images,
          image: p.image,
          rating: p.rating,
          averageRating: p.averageRating,
          cashbackPercentage: p.cashbackPercentage || p.cashback || 0,
          store: p.store,
        }));

        if (append) {
          if (!isMounted()) return;
          setProducts((prev) => [...prev, ...mapped]);
        } else {
          if (!isMounted()) return;
          setProducts(mapped);
        }

        // Determine hasMore from pagination meta or item count
        const totalPages = res.meta?.pagination?.pages || res.meta?.pagination?.totalPages;
        if (totalPages) {
          setHasMore(pageNum < totalPages);
        } else {
          if (!isMounted()) return;
          setHasMore(mapped.length >= PRODUCTS_PER_PAGE);
        }

        // Update total products stat if available
        if (res.meta?.pagination?.total && !append) {
          if (!isMounted()) return;
          setStats((prev) => ({ ...prev, totalProducts: res.meta!.pagination!.total }));
        }
      } else {
        if (!append) setProducts([]);
        if (!isMounted()) return;
        setHasMore(false);
      }
    } catch {
      if (!append) setProducts([]);
      if (!isMounted()) return;
      setHasMore(false);
    } finally {
      if (isMounted()) setLoadingProducts(false);
    }
  }, [selectedFilter]);

  // Initial product fetch + filter change
  useEffect(() => {
    if (authLoading) return;
    setPage(1);
    setHasMore(true);
    fetchProducts(1, false);
  }, [authLoading, selectedFilter, fetchProducts]);

  // Load more products
  const handleLoadMore = useCallback(() => {
    if (loadingProducts || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, true);
  }, [page, loadingProducts, hasMore, fetchProducts]);

  // --- Render helpers ---

  const renderFilterItem = useCallback(({ item: filter }: { item: FilterType }) => (
    <Pressable
      onPress={() => setSelectedFilter(filter)}
      style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, selectedFilter === filter && styles.filterChipTextActive]}>
        {filter === 'all' ? 'All' : filter}
      </Text>
    </Pressable>
  ), [selectedFilter]);

  const renderSubcategoryItem = useCallback(({ item }: { item: Subcategory }) => (
    <Pressable
      style={styles.categoryCard}
      onPress={() => router.push(`/products/category/${item.slug}` as any)}
    >
      <View style={styles.categoryIcon}>
        {item.image ? (
          <CachedImage source={{ uri: item.image }} style={{ width: 28, height: 28 }} />
        ) : (
          <Ionicons name="grid-outline" size={24} color={colors.infoScale[400]} />
        )}
      </View>
      <Text style={styles.categoryTitle} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.categoryCount}>
        {item.productCount ? `${item.productCount}+ products` : ''}
      </Text>
    </Pressable>
  ), [router]);

  const renderStoreItem = useCallback(({ item }: { item: Store }) => (
    <Pressable
      style={styles.brandCard}
      onPress={() => router.push(`/store/${item._id}` as any)}
    >
      {item.logo ? (
        <CachedImage source={{ uri: item.logo }} style={styles.brandLogoImage} />
      ) : (
        <View style={[styles.brandLogoImage, { backgroundColor: Colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderRadius: 20 }]}>
          <Ionicons name="storefront-outline" size={24} color={Colors.neutral[400]} />
        </View>
      )}
      <Text style={styles.brandName} numberOfLines={1}>{item.name}</Text>
      {(item.maxCashback ?? 0) > 0 && (
        <Text style={styles.brandDiscount}>Up to {item.maxCashback}% off</Text>
      )}
    </Pressable>
  ), [router]);

  const renderProductItem = useCallback(({ item }: { item: Product }) => {
    const selling = getProductPrice(item);
    const original = getOriginalPrice(item);
    const imageUri = getProductImage(item);
    const rating = getRating(item);
    const cashback = item.cashbackPercentage || 0;

    return (
      <Pressable
        style={styles.productCard}
        onPress={() => router.push(`/product-page?cardId=${item._id}&cardType=product` as any)}
      >
        {imageUri ? (
          <CachedImage source={{ uri: imageUri }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, { backgroundColor: Colors.neutral[100], justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="cube-outline" size={36} color={Colors.neutral[300]} />
          </View>
        )}
        {cashback > 0 && (
          <View style={styles.cashbackBadge}>
            <Text style={styles.cashbackText}>{cashback}%</Text>
          </View>
        )}
        <View style={styles.productInfo}>
          {item.brand ? <Text style={styles.productBrand}>{item.brand}</Text> : null}
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          {rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color={Colors.warning} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>{formatPrice(selling, currencySymbol)}</Text>
            {original > selling && (
              <Text style={styles.originalPrice}>{formatPrice(original, currencySymbol)}</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  }, [currencySymbol, router]);

  // Header component for FlatList
  const ListHeader = useCallback(() => (
    <>
      {/* Subcategories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        {loadingInitial ? (
          <ActivityIndicator size="small" color={Colors.brand.purple} style={{ marginVertical: 20 }} />
        ) : subcategories.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="grid-outline" size={32} color={Colors.neutral[300]} />
            </View>
            <Text style={styles.emptyTitle}>No subcategories found</Text>
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {subcategories.map((cat) => (
              <React.Fragment key={cat._id}>
                {renderSubcategoryItem({ item: cat })}
              </React.Fragment>
            ))}
          </View>
        )}
      </View>

      {/* Top Brands / Stores */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Brands</Text>
          <Pressable onPress={() => router.push(`/stores?category=${CATEGORY_SLUG}` as any)}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>
        {loadingInitial ? (
          <ActivityIndicator size="small" color={Colors.brand.purple} style={{ marginVertical: 20 }} />
        ) : stores.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="storefront-outline" size={32} color={Colors.neutral[300]} />
            </View>
            <Text style={styles.emptyTitle}>No brands found</Text>
          </View>
        ) : (
          <FlashList
        contentContainerStyle={{ paddingBottom: 120 }}
            data={stores}
            renderItem={renderStoreItem}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 8 }}
            estimatedItemSize={110}
          />
        )}
      </View>

      {/* Featured Products header */}
      <View style={[styles.section, { paddingBottom: 0 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <Pressable onPress={() => router.push(`/products?category=${CATEGORY_SLUG}` as any)}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>
      </View>
    </>
  ), [loadingInitial, subcategories, stores, renderSubcategoryItem, renderStoreItem, router]);

  // Footer component
  const ListFooter = useCallback(() => (
    <>
      {loadingProducts && page > 1 && (
        <ActivityIndicator size="small" color={Colors.brand.purple} style={{ marginVertical: 16 }} />
      )}

      {/* Promo Banner */}
      <View style={styles.promoBanner}>
        <LinearGradient colors={[colors.warningScale[400], colors.warningScale[700]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoGradient}>
          <Ionicons name="flash" size={40} color={Colors.text.inverse} style={{ marginBottom: 12 }} />
          <Text style={styles.promoTitle}>Flash Sale</Text>
          <Text style={styles.promoSubtitle}>Up to 50% off on select electronics</Text>
          <Pressable
            style={styles.promoButton}
            onPress={() => router.push(`/products?category=${CATEGORY_SLUG}&sortBy=price_low` as any)}
          >
            <Text style={styles.promoButtonText}>Shop Now</Text>
          </Pressable>
        </LinearGradient>
      </View>
      <View style={{ height: 120 }} />
    </>
  ), [loadingProducts, page, router]);

  // Empty product state
  const ListEmpty = useCallback(() => {
    if (loadingProducts && page === 1) {
      return (
        <ActivityIndicator size="large" color={Colors.brand.purple} style={{ marginVertical: 40 }} />
      );
    }
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrapper}>
          <Ionicons name="cube-outline" size={36} color={Colors.neutral[300]} />
        </View>
        <Text style={styles.emptyTitle}>No products found</Text>
        <Text style={styles.emptySubtitle}>Try changing your filter or check back later</Text>
      </View>
    );
  }, [loadingProducts, page]);

  // Product grid: render two items per row
  const renderProductRow = useCallback(({ item }: { item: Product[] }) => (
    <View style={styles.productsRow}>
      {item.map((product) => (
        <React.Fragment key={product._id}>
          {renderProductItem({ item: product })}
        </React.Fragment>
      ))}
      {/* Spacer if odd number */}
      {item.length === 1 && <View style={styles.productCardSpacer} />}
    </View>
  ), [renderProductItem]);

  // Group products into pairs for 2-column layout
  const productRows: Product[][] = [];
  for (let i = 0; i < products.length; i += 2) {
    productRows.push(products.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[colors.infoScale[400], '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.background.primary} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Electronics</Text>
            <Text style={styles.headerSubtitle}>Latest gadgets & accessories</Text>
          </View>
          <Pressable style={styles.cartButton} onPress={() => router.push('/cart' as any)}>
            <Ionicons name="cart-outline" size={24} color={Colors.background.primary} />
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.totalProducts > 0 ? `${stats.totalProducts}+` : '--'}
            </Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.maxCashback > 0 ? `${stats.maxCashback}%` : '--'}
            </Text>
            <Text style={styles.statLabel}>Max Cashback</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.totalBrands > 0 ? `${stats.totalBrands}+` : '--'}
            </Text>
            <Text style={styles.statLabel}>Brands</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlashList
          data={FILTER_OPTIONS as unknown as FilterType[]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={renderFilterItem}
          estimatedItemSize={44}
        />
      </View>

      {/* Main Content */}
      <FlashList
        data={productRows}
        renderItem={renderProductRow}
        keyExtractor={(_, index) => `row-${index}`}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0 }}
        estimatedItemSize={120}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: 16 },
  backButton: { padding: 8 },
  headerTitleContainer: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.inverse },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  cartButton: { padding: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  statItem: { alignItems: 'center', paddingHorizontal: 20 },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.text.inverse },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  filtersContainer: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  filterChip: { paddingHorizontal: Spacing.base, paddingVertical: 7, borderRadius: BorderRadius.xl, backgroundColor: Colors.neutral[100], marginRight: 8 },
  filterChipActive: { backgroundColor: Colors.brand.purple },
  filterChipText: { fontSize: 14, color: Colors.neutral[500] },
  filterChipTextActive: { color: Colors.text.inverse, fontWeight: '600' },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.nileBlue, marginBottom: 12 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: Colors.brand.purple },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: { width: (SCREEN_WIDTH - 56) / 3, alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.background.secondary, borderRadius: 16 },
  categoryIcon: { width: 48, height: 48, borderRadius: BorderRadius['2xl'], backgroundColor: '#3B82F620', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  categoryTitle: { fontSize: 12, fontWeight: '600', color: Colors.nileBlue, marginBottom: 2, textAlign: 'center' },
  categoryCount: { fontSize: 10, color: Colors.neutral[500] },
  brandCard: { width: 100, alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, marginRight: 12 },
  brandLogoImage: { width: 40, height: 40, borderRadius: 20, marginBottom: 8 },
  brandName: { fontSize: 12, fontWeight: '600', color: Colors.nileBlue, marginBottom: 2, textAlign: 'center' },
  brandDiscount: { fontSize: 10, color: Colors.success, fontWeight: '600' },
  productsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 12 },
  productCard: { width: (SCREEN_WIDTH - 44) / 2, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.default },
  productCardSpacer: { width: (SCREEN_WIDTH - 44) / 2 },
  productImage: { width: '100%', height: 140 },
  cashbackBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.success, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: 8 },
  cashbackText: { fontSize: 11, fontWeight: '700', color: Colors.text.inverse },
  productInfo: { padding: 12 },
  productBrand: { fontSize: 11, color: Colors.neutral[500], marginBottom: 2 },
  productName: { fontSize: 14, fontWeight: '600', color: Colors.nileBlue, marginBottom: 4 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 8 },
  ratingText: { fontSize: 12, color: Colors.nileBlue, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productPrice: { fontSize: 15, fontWeight: '700', color: colors.neutral[900] },
  originalPrice: { fontSize: 12, color: Colors.neutral[500], textDecorationLine: 'line-through' },
  promoBanner: { marginHorizontal: 16, marginTop: 8 },
  promoGradient: { padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center' },
  promoTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.inverse, marginBottom: 4 },
  promoSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: 16 },
  promoButton: { backgroundColor: Colors.background.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: 24 },
  promoButtonText: { fontSize: 14, fontWeight: '700', color: colors.warningScale[400] },
  // Empty states
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyIconWrapper: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.neutral[100], justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.nileBlue, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: Colors.neutral[500] },
});

export default withErrorBoundary(ElectronicsPage, 'Electronics');
