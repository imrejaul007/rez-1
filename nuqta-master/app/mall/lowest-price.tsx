// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Lowest Price / Best Price Page
// Real price comparison using products-grouped API

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Shadows } from '@/constants/DesignSystem';
import { useGetCurrencySymbol } from '@/stores/selectors';
import searchService from '@/services/searchApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface SellerOption {
  storeId: string;
  storeName: string;
  storeLogo: string;
  price: { current: number; original?: number; currency: string };
  savings: number;
  cashback: { percentage: number; amount: number; coins: number };
  rating: number;
  reviewCount: number;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  isVerified: boolean;
  productId: string;
}

interface GroupedProduct {
  productId: string;
  productName: string;
  productImage: string;
  category: string;
  sellers: SellerOption[];
  sellerCount: number;
}

const POPULAR_QUERIES = [
  'iPhone', 'Samsung', 'Laptop', 'Headphones', 'Watch',
  'Shoes', 'T-shirt', 'Perfume', 'Skincare', 'Rice',
];

function LowestPricePage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<GroupedProduct[]>([]);
  const [summary, setSummary] = useState<{ sellerCount: number; minPrice: number; maxCashback: number; priceRange: { min: number; max: number } } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchPriceComparison = useCallback(async (query: string, showRefresh = false) => {
    if (!query || query.length < 2) return;

    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      setHasSearched(true);

      const response = await searchService.searchProductsGrouped({ q: query, limit: 20 });
      const data = response?.data;

      // Filter to only products with 2+ sellers (actual price comparison)
      const multiSellerProducts = (data?.groupedProducts || []).filter(
        (p: GroupedProduct) => p.sellers && p.sellers.length >= 2
      );

      if (!isMounted()) return;
      setProducts(multiSellerProducts);
      if (!isMounted()) return;
      setSummary(data?.summary || null);
    } catch (err) {
      if (!isMounted()) return;
      setError('Unable to load price comparisons');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, []);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchPriceComparison(text);
      }, 500);
    }
  }, [fetchPriceComparison]);

  const handleQuickSearch = useCallback((query: string) => {
    setSearchQuery(query);
    fetchPriceComparison(query);
  }, [fetchPriceComparison]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const formatPrice = (price: number) => {
    return `${currencySymbol}${price.toLocaleString('en-IN')}`;
  };

  const totalSavings = products.reduce((sum, p) => {
    if (p.sellers.length < 2) return sum;
    const prices = p.sellers.map(s => s.price.current);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    return sum + (maxPrice - minPrice);
  }, 0);

  const renderProduct = useCallback(({ item }: { item: GroupedProduct }) => {
    const bestSeller = item.sellers[0]; // Already sorted by best value
    const otherSellers = item.sellers.slice(1);
    const maxSaving = item.sellers.length >= 2
      ? Math.max(...item.sellers.map(s => s.price.current)) - bestSeller.price.current
      : 0;

    return (
      <Pressable
        style={styles.productCard}
        onPress={() => router.push(`/product-page?cardId=${bestSeller.productId}&cardType=product` as any)}
       
      >
        {maxSaving > 0 && (
          <View style={styles.guaranteeBadge}>
            <Ionicons name="shield-checkmark" size={12} color={colors.background.primary} />
            <ThemedText style={styles.guaranteeText}>Best Price</ThemedText>
          </View>
        )}

        <View style={styles.productHeader}>
          <View style={styles.productImageContainer}>
            {item.productImage ? (
              <CachedImage
                source={item.productImage}
                style={styles.productImageReal}
                contentFit="cover"
              />
            ) : (
              <View style={styles.productImageFallback}>
                <Ionicons name="cube-outline" size={28} color={colors.neutral[400]} />
              </View>
            )}
          </View>
          <View style={styles.productInfo}>
            <ThemedText style={styles.productName} numberOfLines={2}>{item.productName}</ThemedText>
            {item.category ? (
              <ThemedText style={styles.categoryLabel}>{item.category}</ThemedText>
            ) : null}
            <View style={styles.storeBadge}>
              <Ionicons name="storefront" size={10} color={colors.successScale[700]} />
              <ThemedText style={styles.lowestStore}>{bestSeller.storeName}</ThemedText>
              {bestSeller.isVerified && (
                <Ionicons name="checkmark-circle" size={12} color={colors.brand.sky} />
              )}
            </View>
          </View>
        </View>

        <View style={styles.priceComparison}>
          <View style={styles.lowestPriceContainer}>
            <ThemedText style={styles.lowestPriceLabel}>Best Price</ThemedText>
            <ThemedText style={styles.lowestPrice}>{formatPrice(bestSeller.price.current)}</ThemedText>
            {bestSeller.cashback.amount > 0 && (
              <ThemedText style={styles.cashbackText}>
                +{formatPrice(bestSeller.cashback.amount)} cashback
              </ThemedText>
            )}
          </View>

          <View style={styles.otherPricesContainer}>
            {otherSellers.slice(0, 3).map((seller, index) => (
              <View key={index} style={styles.otherPriceRow}>
                <ThemedText style={styles.otherStore} numberOfLines={1}>{seller.storeName}</ThemedText>
                <ThemedText style={styles.otherPrice}>{formatPrice(seller.price.current)}</ThemedText>
              </View>
            ))}
            {item.sellerCount > 4 && (
              <ThemedText style={styles.moreStoresText}>+{item.sellerCount - 4} more stores</ThemedText>
            )}
          </View>
        </View>

        <View style={styles.savingsContainer}>
          {maxSaving > 0 && (
            <View style={styles.savingsBadge}>
              <LinearGradient
                colors={[colors.successScale[700], '#047857']}
                style={styles.savingsBadgeGradient}
              >
                <Ionicons name="trending-down" size={14} color={colors.background.primary} />
                <ThemedText style={styles.savingsText}>Save {formatPrice(maxSaving)}</ThemedText>
              </LinearGradient>
            </View>
          )}
          <Pressable
            style={styles.shopButton}
            onPress={() => router.push(`/MainStorePage?storeId=${bestSeller.storeId}` as any)}
           
          >
            <LinearGradient
              colors={[colors.brand.sky, colors.brand.skyDark]}
              style={styles.shopButtonGradient}
            >
              <ThemedText style={styles.shopButtonText}>Shop Now</ThemedText>
              <Ionicons name="arrow-forward" size={14} color={colors.background.primary} />
            </LinearGradient>
          </Pressable>
        </View>
      </Pressable>
    );
  }, [router, currencySymbol]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.sky} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header */}
        <LinearGradient
          colors={[colors.brand.sky, colors.brand.skyDark, '#075985']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
             
            >
              <View style={styles.backButtonInner}>
                <Ionicons name="chevron-back" size={22} color={colors.brand.sky} />
              </View>
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Best Prices</ThemedText>
            </View>

            <View style={styles.placeholder} />
          </View>

          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="pricetag" size={32} color={colors.background.primary} />
            </View>
            <ThemedText style={styles.heroTitle}>Compare & Save</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              Search any product to compare prices across stores
            </ThemedText>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color={colors.neutral[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products to compare prices..."
                placeholderTextColor={colors.neutral[400]}
                value={searchQuery}
                onChangeText={handleSearch}
                returnKeyType="search"
                onSubmitEditing={() => fetchPriceComparison(searchQuery)}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => { setSearchQuery(''); setProducts([]); setHasSearched(false); }}>
                  <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Stats */}
          {totalSavings > 0 && (
            <View style={styles.savingsCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.savingsCardGradient}
              >
                <ThemedText style={styles.savingsCardLabel}>Total Savings Found</ThemedText>
                <ThemedText style={styles.savingsCardValue}>{formatPrice(totalSavings)}</ThemedText>
                <ThemedText style={styles.savingsCardCount}>{products.length} products compared</ThemedText>
              </LinearGradient>
            </View>
          )}
        </LinearGradient>

        {/* Content */}
        {!hasSearched ? (
          /* Initial state — show popular searches */
          <ScrollView
            style={styles.initialContainer}
            contentContainerStyle={styles.initialContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.popularSection}>
              <ThemedText style={styles.popularTitle}>Popular Searches</ThemedText>
              <ThemedText style={styles.popularSubtitle}>
                Tap to compare prices across stores
              </ThemedText>
              <View style={styles.chipContainer}>
                {POPULAR_QUERIES.map((query) => (
                  <Pressable
                    key={query}
                    style={styles.chip}
                    onPress={() => handleQuickSearch(query)}
                   
                  >
                    <Ionicons name="search-outline" size={14} color={colors.brand.sky} />
                    <ThemedText style={styles.chipText}>{query}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.howItWorks}>
              <ThemedText style={styles.howTitle}>How It Works</ThemedText>
              {[
                { icon: 'search' as const, text: 'Search for any product' },
                { icon: 'git-compare' as const, text: 'We compare prices across all stores' },
                { icon: 'trophy' as const, text: 'Find the best deal instantly' },
              ].map((step, i) => (
                <View key={i} style={styles.howStep}>
                  <View style={styles.howStepIcon}>
                    <Ionicons name={step.icon} size={18} color={colors.brand.sky} />
                  </View>
                  <ThemedText style={styles.howStepText}>{step.text}</ThemedText>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : isLoading ? (
          <CardGridSkeleton />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.neutral[400]} />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable
              style={styles.retryButton}
              onPress={() => fetchPriceComparison(searchQuery)}
            >
              <ThemedText style={styles.retryText}>Try Again</ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlashList
            data={products}
            renderItem={renderProduct}
            keyExtractor={item => item.productId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            estimatedItemSize={120}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => fetchPriceComparison(searchQuery, true)}
                tintColor={colors.brand.sky}
                colors={[colors.brand.sky]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color={colors.neutral[400]} />
                <ThemedText style={styles.emptyText}>No price comparisons found</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Try a different search term or check back later
                </ThemedText>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Shadows.medium,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.subtle,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: -0.5,
  },
  placeholder: {
    width: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    marginBottom: 16,
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.background.primary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  savingsCard: {
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  savingsCardGradient: {
    padding: 14,
    alignItems: 'center',
  },
  savingsCardLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
    fontWeight: '500',
  },
  savingsCardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: -1,
  },
  savingsCardCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    ...Shadows.subtle,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  guaranteeBadge: {
    position: 'absolute',
    top: 0,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successScale[700],
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 1,
  },
  guaranteeText: {
    fontSize: 10,
    color: colors.background.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingTop: 4,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImageReal: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
  },
  productImageFallback: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
    lineHeight: 20,
  },
  categoryLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    marginBottom: 6,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.tint.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lowestStore: {
    fontSize: 11,
    color: colors.successScale[700],
    fontWeight: '600',
  },
  priceComparison: {
    flexDirection: 'row',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
    gap: 12,
  },
  lowestPriceContainer: {
    flex: 1,
    backgroundColor: colors.tint.blue,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.infoScale[200],
  },
  lowestPriceLabel: {
    fontSize: 11,
    color: colors.brand.skyDark,
    marginBottom: 4,
    fontWeight: '600',
  },
  lowestPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0C4A6E',
    letterSpacing: -0.5,
  },
  cashbackText: {
    fontSize: 10,
    color: colors.successScale[700],
    fontWeight: '600',
    marginTop: 4,
  },
  otherPricesContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  otherPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  otherStore: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  otherPrice: {
    fontSize: 13,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  moreStoresText: {
    fontSize: 11,
    color: colors.brand.sky,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  savingsBadge: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  savingsBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  savingsText: {
    fontSize: 13,
    color: colors.background.primary,
    fontWeight: '700',
  },
  shopButton: {
    borderRadius: 10,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  shopButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  shopButtonText: {
    fontSize: 14,
    color: colors.background.primary,
    fontWeight: '700',
  },
  // Initial state
  initialContainer: {
    flex: 1,
  },
  initialContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  popularSection: {
    marginBottom: 32,
  },
  popularTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  popularSubtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tint.blue,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.infoScale[200],
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.skyDark,
  },
  howItWorks: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 20,
    ...Shadows.subtle,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  howTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 16,
  },
  howStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  howStepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tint.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  howStepText: {
    fontSize: 14,
    color: colors.neutral[700],
    fontWeight: '500',
    flex: 1,
  },
  // Loading, error, empty states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.brand.sky,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default withErrorBoundary(LowestPricePage, 'MallLowestPrice');
