import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Beauty & Wellness Hub Page - Production Ready
 * Main hub for all beauty services with real API data
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  RefreshControl,
  TextInput,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import storesApi from '@/services/storesApi';
import productsApi from '@/services/productsApi';
import { catchAndReport } from '@/utils/catchAndReport';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  white: colors.background.primary,
  navy: colors.brand.navyDark,
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray600: Colors.text.tertiary,
  green500: Colors.success,
  primaryGreen: Colors.gold,
  pink500: colors.brand.pink,
  purple500: Colors.brand.purpleLight,
  amber500: Colors.warning,
  background: Colors.background.secondary,
};

// Beauty categories
const BEAUTY_CATEGORIES = [
  { id: 'salon', title: 'Salon', icon: '💇‍♀️', color: colors.brand.pink, route: '/beauty/salon' },
  { id: 'spa', title: 'Spa & Massage', icon: '💆‍♀️', color: Colors.brand.purpleLight, route: '/beauty/spa' },
  { id: 'products', title: 'Products', icon: '💄', color: '#F43F5E', route: '/beauty/products' },
  { id: 'wellness', title: 'Wellness', icon: '🧘‍♀️', color: Colors.success, route: '/beauty/wellness' },
  { id: 'skincare', title: 'Skincare', icon: '✨', color: Colors.warning, route: '/beauty/skincare' },
  { id: 'haircare', title: 'Hair Care', icon: '💇', color: Colors.info, route: '/beauty/haircare' },
];

// Top brands with routes
const TOP_BRANDS = [
  { id: '1', name: 'Nykaa', logo: '💅', discount: 'Up to 40% off', route: '/brand/nykaa' },
  { id: '2', name: 'Sephora', logo: '💄', discount: 'Buy 2 Get 1', route: '/brand/sephora' },
  { id: '3', name: 'MAC', logo: '💋', discount: '15% cashback', route: '/brand/mac' },
  { id: '4', name: 'Forest Essentials', logo: '🌿', discount: '20% off', route: '/brand/forest essentials' },
];

interface DisplaySalon {
  id: string;
  name: string;
  rating: number;
  distance: string;
  cashback: string;
  image: string;
  isVerified: boolean;
  category: string;
}

interface DisplayProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  cashback: string;
  image: string;
  brand: string;
}

const BeautyPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featuredSalons, setFeaturedSalons] = useState<DisplaySalon[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<DisplayProduct[]>([]);
  const [stats, setStats] = useState({ salons: 0, maxCashback: 30, products: 0 });

  const transformStoreToSalon = (store: any): DisplaySalon => ({
    id: store._id || store.id,
    name: store.name,
    rating: store.ratings?.average || 4.5,
    distance: store.distance ? `${store.distance.toFixed(1)} km` : '1.0 km',
    cashback: store.offers?.cashback?.percentage
      ? `${store.offers.cashback.percentage}%`
      : store.cashback?.maxPercentage
        ? `${store.cashback.maxPercentage}%`
        : '20%',
    image: store.logo || store.banner || store.images?.[0],
    isVerified: store.isVerified || store.verification?.isVerified || false,
    category: store.category?.name || 'Salon',
  });

  const transformProduct = (product: any): DisplayProduct => {
    const basePrice = product.pricing?.basePrice || product.price || 0;
    const salePrice = product.pricing?.salePrice || basePrice;
    const discount = basePrice > salePrice ? Math.round((1 - salePrice / basePrice) * 100) : 0;

    return {
      id: product._id || product.id,
      name: product.name,
      price: salePrice,
      originalPrice: basePrice,
      discount,
      cashback: product.cashback?.percentage ? `${product.cashback.percentage}%` : '10%',
      image: product.images?.[0]?.url || product.images?.[0] || product.image,
      brand: product.brand?.name || 'Brand',
    };
  };

  const fetchData = useCallback(async () => {
    try {
      // Fetch stores and products in parallel
      const [storesResponse, productsResponse] = await Promise.all([
        storesApi.getStores({
          tags: ['beauty', 'salon', 'spa'],
          limit: 10,
        }),
        productsApi.getProducts({
          tags: ['beauty', 'cosmetics', 'skincare'],
          limit: 10,
        }),
      ]);

      // Process stores
      if (storesResponse.success && storesResponse.data?.stores) {
        if (!isMounted()) return;
        setFeaturedSalons(storesResponse.data.stores.slice(0, 6).map(transformStoreToSalon));
        if (!isMounted()) return;
        setStats(prev => ({
          ...prev,
          salons: storesResponse.data?.pagination?.total || storesResponse.data?.stores?.length || 0,
        }));
      }

      // Process products
      if (productsResponse.success && productsResponse.data?.products) {
        if (!isMounted()) return;
        setTrendingProducts(productsResponse.data.products.slice(0, 8).map(transformProduct));
        if (!isMounted()) return;
        setStats(prev => ({
          ...prev,
          products: productsResponse.data?.pagination?.total || productsResponse.data?.products?.length || 0,
        }));
      }
    } catch (error) {
      catchAndReport(error, setError, 'BeautyPage/fetchData');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleCategoryPress = (route: string) => {
    router.push(route as any);
  };

  const handleSalonPress = (salonId: string) => {
    router.push(`/MainStorePage?storeId=${salonId}` as any);
  };

  const handleProductPress = (productId: string) => {
    router.push(`/product-page?productId=${productId}` as any);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}&category=beauty` as any);
    }
  };

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
        colors={[colors.brand.pink, '#F43F5E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>💄 Beauty & Wellness</Text>
            <Text style={styles.headerSubtitle}>Pamper yourself, earn rewards</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray600} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search salons, spas, products..."
            placeholderTextColor={COLORS.gray600}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray600} />
            </Pressable>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.salons || '500'}+</Text>
            <Text style={styles.statLabel}>Salons & Spas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.maxCashback}%</Text>
            <Text style={styles.statLabel}>Max Cashback</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>2X</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.pink500]} />
        }
      >
        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <View style={styles.categoriesGrid}>
            {BEAUTY_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(cat.route)}
               
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}20` }]}>
                  <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                </View>
                <Text style={styles.categoryTitle}>{cat.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Featured Salons */}
        {featuredSalons.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Salons & Spas</Text>
              <Pressable onPress={() => router.push('/stores?category=beauty-wellness' as any)}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {featuredSalons.map((salon) => (
                <Pressable
                  key={salon.id}
                  style={styles.salonCard}
                  onPress={() => handleSalonPress(salon.id)}
                 
                >
                  <CachedImage source={salon.image} style={styles.salonImage} />
                  {salon.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={10} color={COLORS.white} />
                    </View>
                  )}
                  <View style={styles.cashbackBadge}>
                    <Text style={styles.cashbackText}>{salon.cashback}</Text>
                  </View>
                  <View style={styles.salonInfo}>
                    <Text style={styles.salonName} numberOfLines={1}>{salon.name}</Text>
                    <Text style={styles.salonCategory} numberOfLines={1}>{salon.category}</Text>
                    <View style={styles.salonMeta}>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={12} color={COLORS.amber500} />
                        <Text style={styles.ratingText}>{salon.rating.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.distanceText}>{salon.distance}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Trending Products */}
        {trendingProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending Products</Text>
              <Pressable onPress={() => router.push('/products?category=beauty-wellness' as any)}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {trendingProducts.map((product) => (
                <Pressable
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => handleProductPress(product.id)}
                 
                >
                  <View style={styles.productImageContainer}>
                    <CachedImage source={product.image} style={styles.productImage} />
                    {product.discount > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{product.discount}% OFF</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productBrand}>{product.brand}</Text>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.productPrice}>{currencySymbol}{product.price.toLocaleString()}</Text>
                      {product.discount > 0 && (
                        <Text style={styles.originalPrice}>{currencySymbol}{product.originalPrice.toLocaleString()}</Text>
                      )}
                    </View>
                    <Text style={styles.productCashback}>{product.cashback} cashback</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Top Brands */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Brands</Text>
          <View style={styles.brandsGrid}>
            {TOP_BRANDS.map((brand) => (
              <Pressable
                key={brand.id}
                style={styles.brandCard}
               
                onPress={() => router.push(brand.route as any)}
              >
                <Text style={styles.brandLogo}>{brand.logo}</Text>
                <Text style={styles.brandName}>{brand.name}</Text>
                <Text style={styles.brandDiscount}>{brand.discount}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <LinearGradient
            colors={[Colors.brand.purpleLight, colors.brand.pink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoGradient}
          >
            <Text style={styles.promoEmoji}>💅</Text>
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>Beauty Week Special</Text>
              <Text style={styles.promoSubtitle}>Extra 15% cashback on all bookings</Text>
            </View>
            <Pressable
              style={styles.promoButton}
              onPress={() => router.push('/offers' as any)}
            >
              <Text style={styles.promoButtonText}>View Offers</Text>
            </Pressable>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <Pressable
              style={styles.quickActionCard}
              onPress={() => router.push('/stores?category=beauty-wellness&filter=verified' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="shield-checkmark" size={24} color={colors.brand.sky} />
              </View>
              <Text style={styles.quickActionLabel}>Verified{'\n'}Clinics</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionCard}
              onPress={() => router.push('/stores?category=beauty-wellness&filter=nearby' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.warningScale[200] }]}>
                <Ionicons name="location" size={24} color={Colors.warning} />
              </View>
              <Text style={styles.quickActionLabel}>Near{'\n'}Me</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionCard}
              onPress={() => router.push('/offers?type=cashback' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.tint.green }]}>
                <Ionicons name="wallet" size={24} color={Colors.success} />
              </View>
              <Text style={styles.quickActionLabel}>Best{'\n'}Cashback</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionCard}
              onPress={() => router.push('/stores?category=beauty-wellness&filter=try-buy' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.pinkMist }]}>
                <Ionicons name="flash" size={24} color={colors.deepPink} />
              </View>
              <Text style={styles.quickActionLabel}>60 Min{'\n'}Service</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: COLORS.gray600,
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
    color: COLORS.white,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: COLORS.navy,
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
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.white,
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
  section: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.md,
  },
  viewAllText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.pink500,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 56) / 3,
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryEmoji: {
    ...Typography.h2,
  },
  categoryTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.navy,
    textAlign: 'center',
  },
  horizontalList: {
    paddingRight: Spacing.base,
    gap: Spacing.md,
  },
  salonCard: {
    width: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  salonImage: {
    width: '100%',
    height: 120,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.primaryGreen,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.green500,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cashbackText: {
    ...Typography.caption,
    fontWeight: '700',
    color: COLORS.white,
  },
  salonInfo: {
    padding: Spacing.md,
  },
  salonName: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 2,
  },
  salonCategory: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
    marginBottom: Spacing.sm,
  },
  salonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.navy,
  },
  distanceText: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
  },
  productCard: {
    width: 150,
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 150,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    ...Typography.overline,
    fontWeight: '700',
    color: COLORS.white,
  },
  productInfo: {
    padding: 10,
  },
  productBrand: {
    ...Typography.overline,
    color: COLORS.gray600,
    marginBottom: 2,
  },
  productName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: Spacing.xs,
    minHeight: 32,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  productPrice: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.navy,
  },
  originalPrice: {
    ...Typography.caption,
    color: COLORS.gray600,
    textDecorationLine: 'line-through',
  },
  productCashback: {
    ...Typography.overline,
    color: COLORS.primaryGreen,
    fontWeight: '500',
  },
  brandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  brandCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    padding: Spacing.base,
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  brandLogo: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  brandName: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.xs,
  },
  brandDiscount: {
    ...Typography.bodySmall,
    color: COLORS.green500,
    fontWeight: '600',
  },
  promoBanner: {
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  promoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },
  promoEmoji: {
    fontSize: 36,
    marginRight: Spacing.md,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  promoSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
  },
  promoButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
  },
  promoButtonText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: COLORS.purple500,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionLabel: {
    ...Typography.caption,
    color: COLORS.navy,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default withErrorBoundary(BeautyPage, 'BeautyIndex');
