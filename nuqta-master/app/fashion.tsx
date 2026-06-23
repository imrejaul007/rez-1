// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Fashion Category Page
 * Production-ready: fetches subcategories, products, and stores from real APIs.
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
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthLoading, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import CachedImage from '@/components/ui/CachedImage';
import { catchAndReport } from '@/utils/catchAndReport';

import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FASHION_SLUG = 'fashion';
const PRODUCTS_PER_PAGE = 10;

// ─── Types ───────────────────────────────────────────────────────

interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  productCount?: number;
  storeCount?: number;
}

interface FashionProduct {
  id: string;
  _id: string;
  name: string;
  image: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  reviewCount: number;
  cashbackPercentage: number;
  category: string;
  categorySlug: string;
  store: { name: string; logo?: string };
  brand?: string;
}

interface FashionStore {
  _id: string;
  name: string;
  logo?: string;
  image?: string;
  ratings?: { average: number; count: number };
  offers?: { cashback?: number };
  tags?: string[];
}

// ─── Helper: extract product price ──────────────────────────────
function getProductPrice(p: any): number {
  return p.pricing?.selling || (typeof p.price === 'number' ? p.price : p.price?.current) || 0;
}
function getProductOriginalPrice(p: any): number {
  return p.pricing?.original || (typeof p.price === 'number' ? p.price : p.price?.original) || 0;
}
function getProductImage(p: any): string {
  if (Array.isArray(p.images) && p.images.length > 0) {
    const first = p.images[0];
    return typeof first === 'string' ? first : first?.url || '';
  }
  return p.image || '';
}

// ─── Component ──────────────────────────────────────────────────

const FashionPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Data state
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<FashionProduct[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<FashionProduct[]>([]);
  const [stores, setStores] = useState<FashionStore[]>([]);
  const [categoryStats, setCategoryStats] = useState({ productCount: 0, storeCount: 0, maxCashback: 0 });

  // Loading / pagination state
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);



  // ── Fetch category info + subcategories ──────────────────────
  const fetchCategoryData = useCallback(async () => {
    try {
      const res = await apiClient.get<any>(`/categories/${FASHION_SLUG}`);
      if (res.success && res.data) {
        const cat = res.data;
        const children: Subcategory[] = (cat.childCategories || [])
          .filter((c: any) => c.isActive !== false)
          .map((c: any) => ({
            _id: c._id?.toString() || c.slug,
            name: c.name,
            slug: c.slug,
            icon: c.icon,
            image: c.image,
          }));
        if (!isMounted()) return;
        setSubcategories(children);
        if (!isMounted()) return;
        setCategoryStats({
          productCount: cat.productCount || 0,
          storeCount: cat.storeCount || 0,
          maxCashback: cat.maxCashback || 0,
        });
      }
    } catch (_) {
      // fail silently — empty state UI will show
    }
  }, []);

  // ── Fetch products (paginated) ───────────────────────────────
  const fetchProducts = useCallback(async (page: number, append: boolean = false) => {
    try {
      if (page === 1 && !append) setLoadingInitial(true);
      else setLoadingMore(true);

      const res = await apiClient.get<any>(`/products/category/${FASHION_SLUG}`, {
        page,
        limit: PRODUCTS_PER_PAGE,
        sort: selectedFilter === 'Trending' ? 'popularity'
            : selectedFilter === 'New Arrivals' ? 'newest'
            : selectedFilter === 'Sale' ? 'price_low'
            : selectedFilter === 'Premium' ? 'price_high'
            : 'popularity',
      });

      if (!isMounted()) return;

      if (res.success) {
        // The endpoint returns via sendPaginated — data is the array in first element
        const rawProducts: any[] = Array.isArray(res.data) ? res.data : res.data?.products || [];
        const mapped: FashionProduct[] = rawProducts.map((p: any) => ({
          id: p._id?.toString() || p.id,
          _id: p._id?.toString() || p.id,
          name: p.name || 'Unnamed Product',
          image: getProductImage(p),
          price: getProductPrice(p),
          originalPrice: getProductOriginalPrice(p),
          discount: p.pricing?.discount || p.discount || 0,
          rating: p.ratings?.average || p.rating || 0,
          reviewCount: p.ratings?.count || p.reviewCount || 0,
          cashbackPercentage: p.cashback?.percentage || p.cashbackPercentage || 0,
          category: p.category?.name || '',
          categorySlug: p.category?.slug || '',
          store: { name: p.store?.name || '', logo: p.store?.logo },
          brand: p.brand || p.store?.name || '',
        }));

        if (append) {
          if (!isMounted()) return;
          setProducts(prev => [...prev, ...mapped]);
        } else {
          if (!isMounted()) return;
          setProducts(mapped);
        }

        // Determine hasMore from pagination meta or array length
        const total = res.meta?.pagination?.total ?? null;
        if (total !== null) {
          if (!isMounted()) return;
          setHasMore(page * PRODUCTS_PER_PAGE < total);
        } else {
          if (!isMounted()) return;
          setHasMore(mapped.length === PRODUCTS_PER_PAGE);
        }
        if (!isMounted()) return;
        setCurrentPage(page);
      }
    } catch (_) {
      // fail silently
    } finally {
      if (isMounted()) {
        if (!isMounted()) return;
        setLoadingInitial(false);
        if (!isMounted()) return;
        setLoadingMore(false);
      }
    }
  }, [selectedFilter]);

  // ── Fetch trending products ──────────────────────────────────
  const fetchTrending = useCallback(async () => {
    try {
      const res = await apiClient.get<any>('/products/trending', { category: FASHION_SLUG, limit: 6 });
      if (!isMounted()) return;
      if (res.success) {
        const raw: any[] = Array.isArray(res.data) ? res.data : res.data?.products || [];
        if (!isMounted()) return;
        setTrendingProducts(raw.map((p: any) => ({
          id: p._id?.toString() || p.id,
          _id: p._id?.toString() || p.id,
          name: p.name || '',
          image: getProductImage(p),
          price: getProductPrice(p),
          originalPrice: getProductOriginalPrice(p),
          discount: p.pricing?.discount || 0,
          rating: p.ratings?.average || 0,
          reviewCount: p.ratings?.count || 0,
          cashbackPercentage: p.cashback?.percentage || 0,
          category: p.category?.name || '',
          categorySlug: p.category?.slug || '',
          store: { name: p.store?.name || '', logo: p.store?.logo },
          brand: p.brand || p.store?.name || '',
        })));
      }
    } catch (e) { catchAndReport(e, setError, 'Fashion/fetchTrending'); }
  }, []);

  // ── Fetch fashion stores (brands) ────────────────────────────
  const fetchStores = useCallback(async () => {
    try {
      const res = await apiClient.get<any>('/stores', { category: FASHION_SLUG, limit: 8, sortBy: 'rating' });
      if (!isMounted()) return;
      if (res.success) {
        const raw: any[] = Array.isArray(res.data) ? res.data : res.data?.stores || [];
        if (!isMounted()) return;
        setStores(raw.map((s: any) => ({
          _id: s._id?.toString() || s.id,
          name: s.name,
          logo: s.logo,
          image: s.image || s.coverImage,
          ratings: s.ratings,
          offers: s.offers,
          tags: s.tags,
        })));
      }
    } catch (e) { catchAndReport(e, setError, 'Fashion/fetchStores'); }
  }, []);

  // ── Initial load ─────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    fetchCategoryData();
    fetchTrending();
    fetchStores();
  }, [authLoading, fetchCategoryData, fetchTrending, fetchStores]);

  // ── Reload products when filter changes ──────────────────────
  useEffect(() => {
    if (authLoading) return;
    setProducts([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchProducts(1, false);
  }, [authLoading, selectedFilter, fetchProducts]);

  // ── Load more products ───────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchProducts(currentPage + 1, true);
  }, [loadingMore, hasMore, currentPage, fetchProducts]);

  // ── Format currency ──────────────────────────────────────────
  const formatPrice = (amount: number) => `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  // ── Render helpers ───────────────────────────────────────────
  const renderProductCard = useCallback(({ item: product }: { item: FashionProduct }) => (
    <Pressable
      key={product.id}
      style={styles.productCard}
      onPress={() => router.push(`/product-page?cardId=${product._id}&cardType=product` as any)}
    >
      <CachedImage
        source={product.image}
        style={styles.productImage}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      {product.cashbackPercentage > 0 && (
        <View style={styles.cashbackBadge}>
          <Text style={styles.cashbackText}>{product.cashbackPercentage}%</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productBrand} numberOfLines={1}>{product.brand}</Text>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        {product.rating > 0 && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color={Colors.warning} />
            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
          </View>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
          {product.originalPrice > product.price && (
            <Text style={styles.originalPrice}>{formatPrice(product.originalPrice)}</Text>
          )}
        </View>
      </View>
    </Pressable>
  ), [currencySymbol, router]);

  // ── Empty state component ────────────────────────────────────
  const EmptyState = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="shirt-outline" size={36} color={Colors.neutral[400]} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );

  // ── Loading skeleton ─────────────────────────────────────────
  if (loadingInitial && products.length === 0 && subcategories.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.brand.pink, colors.deepPink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.background.primary} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Fashion</Text>
              <Text style={styles.headerSubtitle}>Trending styles & collections</Text>
            </View>
            <Pressable onPress={() => router.push('/cart' as any)} style={styles.cartButton}>
              <Ionicons name="cart-outline" size={24} color={Colors.background.primary} />
            </Pressable>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="shirt-outline" size={36} color={colors.brand.pink} />
          </View>
          <ActivityIndicator size="large" color={colors.brand.pink} style={{ marginTop: Spacing.md }} />
          <Text style={styles.loadingText}>Loading fashion...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────── */}
      <LinearGradient colors={[colors.brand.pink, colors.deepPink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.background.primary} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Fashion</Text>
            <Text style={styles.headerSubtitle}>Trending styles & collections</Text>
          </View>
          <Pressable onPress={() => router.push('/cart' as any)} style={styles.cartButton}>
            <Ionicons name="cart-outline" size={24} color={Colors.background.primary} />
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{categoryStats.productCount > 0 ? (categoryStats.productCount > 999 ? `${(categoryStats.productCount / 1000).toFixed(0)}k+` : `${categoryStats.productCount}`) : '--'}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{categoryStats.maxCashback > 0 ? `${categoryStats.maxCashback}%` : '--'}</Text>
            <Text style={styles.statLabel}>Max Off</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{categoryStats.storeCount > 0 ? `${categoryStats.storeCount}+` : '--'}</Text>
            <Text style={styles.statLabel}>Brands</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Filter chips ───────────────────────────────── */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
          {['all', 'Trending', 'New Arrivals', 'Sale', 'Premium'].map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, selectedFilter === filter && styles.filterChipTextActive]}>
                {filter === 'all' ? 'All' : filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Main scrollable content ────────────────────── */}
      <FlashList
        data={products}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
          estimatedItemSize={220}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <>
            {/* ── Shop by Category ──────────────────── */}
            {subcategories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Shop by Category</Text>
                <View style={styles.categoriesGrid}>
                  {subcategories.map((cat) => (
                    <Pressable
                      key={cat._id}
                      style={styles.categoryCard}
                      onPress={() => router.push(`/category/${cat.slug}` as any)}
                    >
                      <View style={styles.categoryIcon}>
                        {cat.icon ? (
                          <Ionicons name={(cat.icon as any) || 'pricetag-outline'} size={24} color={colors.brand.pink} />
                        ) : (
                          <Ionicons name="pricetag-outline" size={24} color={colors.brand.pink} />
                        )}
                      </View>
                      <Text style={styles.categoryTitle} numberOfLines={1}>{cat.name}</Text>
                      {cat.productCount != null && cat.productCount > 0 && (
                        <Text style={styles.categoryCount}>{cat.productCount > 999 ? `${(cat.productCount / 1000).toFixed(0)}k+ items` : `${cat.productCount} items`}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* ── Trending Styles (trending products) ── */}
            {trendingProducts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Trending Styles</Text>
                  <Pressable onPress={() => { setSelectedFilter('Trending'); }}>
                    <Text style={styles.viewAllText}>View All</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {trendingProducts.map((tp) => (
                    <Pressable
                      key={tp.id}
                      style={styles.styleCard}
                      onPress={() => router.push(`/product-page?cardId=${tp._id}&cardType=product` as any)}
                    >
                      <CachedImage
                        source={tp.image}
                        style={styles.styleImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.styleGradient}>
                        <Text style={styles.styleName} numberOfLines={1}>{tp.name}</Text>
                        {tp.price > 0 && <Text style={styles.stylePrice}>{formatPrice(tp.price)}</Text>}
                      </LinearGradient>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Top Brands (stores) ──────────────── */}
            {stores.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Top Brands</Text>
                  <Pressable onPress={() => router.push(`/explore/stores?category=${FASHION_SLUG}` as any)}>
                    <Text style={styles.viewAllText}>View All</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {stores.map((store) => (
                    <Pressable
                      key={store._id}
                      style={styles.brandCard}
                      onPress={() => router.push(`/store/${store._id}` as any)}
                    >
                      <View style={styles.brandLogoContainer}>
                        {store.logo ? (
                          <CachedImage
                            source={store.logo}
                            style={styles.brandLogoImage}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            borderRadius={BorderRadius['2xl']}
                          />
                        ) : (
                          <Text style={styles.brandLogo}>{store.name.charAt(0).toUpperCase()}</Text>
                        )}
                      </View>
                      <Text style={styles.brandName} numberOfLines={1}>{store.name}</Text>
                      {(store.offers?.cashback ?? 0) > 0 && (
                        <Text style={styles.brandDiscount}>Up to {store.offers?.cashback}% off</Text>
                      )}
                      {store.ratings && store.ratings.average > 0 && (
                        <View style={styles.brandRatingRow}>
                          <Ionicons name="star" size={10} color={Colors.warning} />
                          <Text style={styles.brandRatingText}>{store.ratings.average.toFixed(1)}</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Best Sellers heading ─────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Best Sellers</Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          !loadingInitial ? (
            <EmptyState title="No products found" subtitle="Try a different filter or check back later." />
          ) : null
        }
        ListFooterComponent={
          <>
            {loadingMore && (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.brand.pink} />
              </View>
            )}

            {/* ── Promo banner (after products) ────── */}
            {!loadingInitial && (
              <View style={styles.promoBanner}>
                <LinearGradient colors={[colors.brand.purpleLight, colors.brand.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoGradient}>
                  <Ionicons name="shirt-outline" size={40} color="rgba(255,255,255,0.3)" style={{ marginBottom: 12 }} />
                  <Text style={styles.promoTitle}>End of Season Sale</Text>
                  <Text style={styles.promoSubtitle}>
                    {categoryStats.maxCashback > 0
                      ? `Up to ${categoryStats.maxCashback}% off on top brands`
                      : 'Great deals on top fashion brands'}
                  </Text>
                  <Pressable
                    style={styles.promoButton}
                    onPress={() => setSelectedFilter('Sale')}
                  >
                    <Text style={styles.promoButtonText}>Shop Now</Text>
                  </Pressable>
                </LinearGradient>
              </View>
            )}

            {/* Pagination info */}
            {!hasMore && products.length > 0 && (
              <Text style={styles.endText}>You've seen all products</Text>
            )}
          </>
        }
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  backButton: { padding: Spacing.sm },
  headerTitleContainer: { flex: 1, marginLeft: Spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.inverse },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  cartButton: { padding: Spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.base },
  statItem: { alignItems: 'center', paddingHorizontal: Spacing.lg },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.text.inverse },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  filtersContainer: { height: 48, paddingHorizontal: Spacing.base, backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.default, justifyContent: 'center' },
  filterChip: { paddingHorizontal: Spacing.base, paddingVertical: 7, borderRadius: BorderRadius.xl, backgroundColor: Colors.neutral[100], marginRight: Spacing.sm },
  filterChipActive: { backgroundColor: colors.brand.pink },
  filterChipText: { fontSize: 14, color: Colors.neutral[500] },
  filterChipTextActive: { color: Colors.text.inverse, fontWeight: '600' },
  section: { paddingHorizontal: Spacing.base, paddingTop: Spacing.base },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.nileBlue, marginBottom: Spacing.md },
  viewAllText: { fontSize: 14, fontWeight: '600', color: colors.brand.pink },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  categoryCard: {
    width: (SCREEN_WIDTH - 56) / 3,
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: '#EC489920',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryTitle: { fontSize: 12, fontWeight: '600', color: Colors.nileBlue, marginBottom: 2, textAlign: 'center' },
  categoryCount: { fontSize: 10, color: Colors.neutral[500] },
  styleCard: { width: 140, height: 180, marginRight: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  styleImage: { width: '100%', height: '100%' },
  styleGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md },
  styleName: { fontSize: 14, fontWeight: '700', color: Colors.text.inverse },
  stylePrice: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  brandCard: {
    width: 100,
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.md,
  },
  brandLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  brandLogoImage: { width: 48, height: 48 },
  brandLogo: { fontSize: 20, fontWeight: '700', color: Colors.nileBlue },
  brandName: { fontSize: 12, fontWeight: '600', color: Colors.nileBlue, marginBottom: 2 },
  brandDiscount: { fontSize: 10, color: Colors.success, fontWeight: '600' },
  brandRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  brandRatingText: { fontSize: 10, color: Colors.nileBlue, fontWeight: '600' },
  productsRow: { paddingHorizontal: Spacing.base, gap: Spacing.md },
  productCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.md,
  },
  productImage: { width: '100%', height: 160 },
  cashbackBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.success, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: 8 },
  cashbackText: { fontSize: 11, fontWeight: '700', color: Colors.text.inverse },
  productInfo: { padding: Spacing.md },
  productBrand: { fontSize: 11, color: Colors.neutral[500], marginBottom: 2 },
  productName: { fontSize: 14, fontWeight: '600', color: Colors.nileBlue, marginBottom: Spacing.xs },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  ratingText: { fontSize: 12, color: Colors.nileBlue, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  productPrice: { fontSize: 15, fontWeight: '700', color: colors.neutral[900] },
  originalPrice: { fontSize: 12, color: Colors.neutral[500], textDecorationLine: 'line-through' },
  promoBanner: { marginHorizontal: Spacing.base, marginTop: Spacing.base },
  promoGradient: { padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center' },
  promoTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.inverse, marginBottom: Spacing.xs },
  promoSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: Spacing.base },
  promoButton: { backgroundColor: Colors.background.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: 24 },
  promoButtonText: { fontSize: 14, fontWeight: '700', color: colors.brand.purpleLight },
  // Loading / empty states
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: Colors.neutral[500], marginTop: Spacing.md },
  emptyContainer: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.neutral[900], marginTop: Spacing.md },
  emptySubtitle: { fontSize: 13, color: Colors.neutral[500], marginTop: Spacing.xs, textAlign: 'center' },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: 'center' },
  endText: { textAlign: 'center', fontSize: 13, color: Colors.neutral[400], paddingVertical: Spacing.base },
});

export default withErrorBoundary(FashionPage, 'Fashion');
