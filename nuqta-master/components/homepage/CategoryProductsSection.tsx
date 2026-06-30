// @ts-nocheck
import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { productApi, HomepageProduct } from '@/services/productApi';
import CategoryProductCard from './cards/CategoryProductCard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface CategoryProductsSectionProps {
  categorySlug: string;
  categoryName: string;
  limit?: number;
}

const CATEGORY_PRODUCTS_CACHE_TTL_MS = 2 * 60 * 1000;
const categoryProductsCache = new Map<string, { data: HomepageProduct[]; at: number }>();
const categoryProductsInFlight = new Map<string, Promise<HomepageProduct[]>>();

function CategoryProductsSection({
  categorySlug,
  categoryName,
  limit = 10,
}: CategoryProductsSectionProps) {
  const router = useRouter();
  const MAX_CACHE_SIZE = 50;
  const cacheKey = `${categorySlug}:${limit}`;
  const now = Date.now();
  const cachedEntry = categoryProductsCache.get(cacheKey);
  const hasFreshCache = !!(
    cachedEntry && now - cachedEntry.at < CATEGORY_PRODUCTS_CACHE_TTL_MS
  );
  const isMounted = useIsMounted();
  const [products, setProducts] = useState<HomepageProduct[]>(
    hasFreshCache ? cachedEntry!.data : []
  );
  const [loading, setLoading] = useState(!hasFreshCache);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (): Promise<HomepageProduct[]> => {
    const existingCache = categoryProductsCache.get(cacheKey);
    if (existingCache && Date.now() - existingCache.at < CATEGORY_PRODUCTS_CACHE_TTL_MS) {
      return existingCache.data;
    }

    const inFlight = categoryProductsInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const request = (async () => {
      const response = await productApi.getProductsByCategory({
        categorySlug,
        limit,
      });
      if (response.success && response.data) {
        categoryProductsCache.set(cacheKey, { data: response.data, at: Date.now() });
        if (categoryProductsCache.size > MAX_CACHE_SIZE) {
          const oldest = [...categoryProductsCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
          categoryProductsCache.delete(oldest[0]);
        }
        return response.data;
      }
      throw new Error('Failed to load products');
    })();

    categoryProductsInFlight.set(cacheKey, request);

    try {
      return await request;
    } finally {
      categoryProductsInFlight.delete(cacheKey);
    }
  }, [cacheKey, categorySlug, limit]);

  useEffect(() => {
    setError(null);

    if (
      products.length === 0 &&
      !categoryProductsCache.get(cacheKey) &&
      !categoryProductsInFlight.get(cacheKey)
    ) {
      setLoading(true);
    }

    fetchProducts()
      .then((data) => {
        if (!isMounted()) return;
        setProducts(data);
      })
      .catch(() => {
        if (!isMounted()) return;
        setError('Failed to load products');
      })
      .finally(() => {
        if (!isMounted()) return;
        setLoading(false);
      });
  }, [fetchProducts]);

  const handleViewAll = () => {
    router.push(`/category/${categorySlug}`);
  };

  const renderProduct = useCallback(({ item }: { item: HomepageProduct }) => (
    <CategoryProductCard product={item} />
  ), []);

  const keyExtractor = useCallback((item: HomepageProduct) => item._id || item.id, []);

  // Don't render if no products and not loading
  if (!loading && products.length === 0 && !error) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.titleAccent} />
          <ThemedText style={styles.title}>{categoryName}</ThemedText>
        </View>
        <Pressable
          style={styles.viewAllButton}
          onPress={handleViewAll}
         
        >
          <ThemedText style={styles.viewAllText}>View all</ThemedText>
          <Ionicons name="chevron-forward" size={14} color={colors.nileBlue} style={styles.viewAllIcon} />
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="small" color={colors.lightMustard} />
          </View>
          <ThemedText style={styles.loadingText}>Fetching deals...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.gray[400]} />
          </View>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={fetchProducts}>
            <LinearGradient
              colors={[colors.lightMustard, colors.nileBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryGradient}
            >
              <Ionicons name="refresh" size={14} color={colors.background.primary} />
              <ThemedText style={styles.retryText}>Try again</ThemedText>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={products}
          renderItem={renderProduct}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent as any}
          estimatedItemSize={220}
          initialNumToRender={4}
          maxToRenderPerBatch={6}
          windowSize={5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleAccent: {
    width: 4,
    height: 22,
    backgroundColor: colors.lightMustard,
    borderRadius: 2,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
    fontFamily: 'Poppins',
    letterSpacing: -0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 58, 82, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.15)',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
    fontFamily: 'Inter',
  },
  viewAllIcon: {
    marginLeft: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 250, 252, 0.5)',
    marginHorizontal: 16,
    borderRadius: 16,
  },
  loadingSpinner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.gray[400],
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  errorContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginHorizontal: 16,
    backgroundColor: 'rgba(247, 250, 252, 0.5)',
    borderRadius: 16,
  },
  errorIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(154, 167, 178, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  retryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 12px rgba(255, 205, 87, 0.25)',
      },
    }),
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
    fontFamily: 'Inter',
  },
});

export default memo(CategoryProductsSection);
