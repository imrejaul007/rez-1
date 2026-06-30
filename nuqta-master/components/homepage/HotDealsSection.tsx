// @ts-nocheck
import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { productApi, HomepageProduct } from '@/services/productApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth } = Dimensions.get('window');
// Parent content has padding: 20 on each side, so available width is screenWidth - 40
const PARENT_PADDING = 20;
const CARD_GAP = 12;
const AVAILABLE_WIDTH = screenWidth - (PARENT_PADDING * 2);
const CARD_WIDTH = Math.floor((AVAILABLE_WIDTH - CARD_GAP) / 2);

interface HotDealProduct extends HomepageProduct {
  cashbackPercentage?: number;
}

interface HotDealsSectionProps {
  title?: string;
  limit?: number;
}

const HOT_DEALS_CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_CACHE_SIZE = 50;
const hotDealsCache = new Map<number, { data: HotDealProduct[]; at: number }>();
const hotDealsInFlight = new Map<number, Promise<HotDealProduct[]>>();

// Evict oldest cache entries when over size limit
function evictOldestCacheEntry(): void {
  if (hotDealsCache.size > MAX_CACHE_SIZE) {
    const entries = [...hotDealsCache.entries()];
    entries.sort((a, b) => a[1].at - b[1].at);
    hotDealsCache.delete(entries[0][0]);
  }
}

function HotDealsSection({
  title = 'Hot deals',
  limit = 10,
}: HotDealsSectionProps) {
  const router = useRouter();
  const now = Date.now();
  const cachedEntry = hotDealsCache.get(limit);
  const hasFreshCache = !!(
    cachedEntry && now - cachedEntry.at < HOT_DEALS_CACHE_TTL_MS
  );
  const isMounted = useIsMounted();
  const [products, setProducts] = useState<HotDealProduct[]>(
    hasFreshCache ? cachedEntry!.data : []
  );
  const [loading, setLoading] = useState(!hasFreshCache);
  const [error, setError] = useState<string | null>(null);

  const fetchHotDeals = useCallback(async (): Promise<HotDealProduct[]> => {
    const existingCache = hotDealsCache.get(limit);
    if (existingCache && Date.now() - existingCache.at < HOT_DEALS_CACHE_TTL_MS) {
      return existingCache.data;
    }

    const inFlight = hotDealsInFlight.get(limit);
    if (inFlight) {
      return inFlight;
    }

    const request = (async () => {
      let data: HotDealProduct[] = [];
      const response = await productApi.getHotDeals({ limit });
      if (response.success && response.data) {
        data = response.data as HotDealProduct[];
      } else {
        throw new Error('Failed to load hot deals');
      }

      hotDealsCache.set(limit, { data, at: Date.now() });
      evictOldestCacheEntry();
      return data;
    })();

    hotDealsInFlight.set(limit, request);

    try {
      return await request;
    } finally {
      hotDealsInFlight.delete(limit);
    }
  }, [limit]);

  useEffect(() => {
    setError(null);

    if (
      products.length === 0 &&
      !hotDealsCache.get(limit) &&
      !hotDealsInFlight.get(limit)
    ) {
      setLoading(true);
    }

    fetchHotDeals()
      .then((data) => {
        if (!isMounted()) return;
        setProducts(data);
      })
      .catch(() => {
        if (!isMounted()) return;
        setError('Failed to load hot deals');
      })
      .finally(() => {
        if (!isMounted()) return;
        setLoading(false);
      });
  }, [fetchHotDeals]);

  const handleViewAll = () => {
    router.push('/search?sortBy=cashback');
  };

  const handleProductPress = (product: HotDealProduct) => {
    const productId = product._id || product.id;
    router.push(`/product-page?cardId=${productId}&cardType=product`);
  };

  const renderProduct = useCallback(({ item, index }: { item: HotDealProduct; index: number }) => {
    const storeName = item.store?.name || 'Store';
    const cashback = item.cashbackPercentage || item.discount || 0;

    // Format deal text like in the screenshot
    const dealText = cashback > 0
      ? `${storeName}: ${cashback}% cashback sale`
      : `${storeName}: Special offer`;

    return (
      <Pressable
        style={styles.card}
        onPress={() => handleProductPress(item)}
        accessibilityLabel={dealText}
        accessibilityRole="button"
        accessibilityHint={`${cashback}% cashback at ${storeName}. Double tap to view deal details`}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <CachedImage
            source={item.image || 'https://via.placeholder.com/200'}
            style={styles.productImage}
            contentFit="cover"
          />
          {/* Cashback Badge */}
          {cashback > 0 && (
            <View style={styles.cashbackBadge}>
              <ThemedText style={styles.cashbackBadgeText}>
                {cashback}% OFF
              </ThemedText>
            </View>
          )}
        </View>

        {/* Card Content */}
        <View style={styles.cardContent}>
          <ThemedText style={styles.dealText} numberOfLines={2}>
            {dealText}
          </ThemedText>
        </View>
      </Pressable>
    );
  }, [handleProductPress]);

  const keyExtractor = useCallback((item: HotDealProduct, index: number) =>
    (item._id || item.id || `hotdeal-${index}`), []);

  // Don't render if no products and not loading
  if (!loading && products.length === 0 && !error) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <Pressable
          style={styles.viewAllButton}
          onPress={handleViewAll}
          accessibilityLabel="View all hot deals"
          accessibilityRole="button"
          accessibilityHint="Double tap to see all hot deals sorted by cashback"
        >
          <ThemedText style={styles.viewAllText}>View all</ThemedText>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.lightMustard} />
          <ThemedText style={styles.loadingText}>Fetching hot deals...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable
            style={styles.retryButton}
            onPress={fetchHotDeals}
            accessibilityLabel="Retry loading hot deals"
            accessibilityRole="button"
          >
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={products}
          renderItem={renderProduct}
          keyExtractor={keyExtractor}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent as any}
          estimatedItemSize={220}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
    marginBottom: 24,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.nileBlue,
    fontFamily: 'Poppins-Bold',
  },
  viewAllButton: {
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.lightMustard,
    fontFamily: 'Inter-SemiBold',
  },
  listContent: {
    // No padding needed - parent content View already has padding: 20
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  rowSeparator: {
    height: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(26, 58, 82, 0.08)',
      },
    }),
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.neutral[50],
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cashbackBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: 0.3,
  },
  cardContent: {
    padding: 14,
    minHeight: 60,
    justifyContent: 'center',
  },
  dealText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
    lineHeight: 20,
    fontFamily: 'Inter-SemiBold',
  },
  loadingContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.gray[400],
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    // Use a darker red (B91C1C) for better WCAG AA contrast on white bg
    color: '#B91C1C',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default memo(HotDealsSection);
