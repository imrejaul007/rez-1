// @ts-nocheck
import React, { useEffect, useState, useCallback, memo } from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { productApi, HomepageProduct } from '@/services/productApi';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol, useCurrentRegionId } from '@/stores/selectors';
import { useSelector } from 'zustand';
import { formatPrice } from '@/utils/priceFormatter';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface PopularProductsSectionProps {
  title?: string;
  limit?: number;
}

function PopularProductsSection({
  title = 'Popular Near You',
  limit = 3,
}: PopularProductsSectionProps) {
  const router = useRouter();
  const currentRegion = useCurrentRegionId(); // Refetch when region changes
  const [products, setProducts] = useState<HomepageProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const fetchPopularProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productApi.getPopularProducts({ limit });

      if (response.success && response.data) {
        // Limit to 3 products maximum
        const maxProducts = Math.min(limit, 3);
        if (!isMounted()) return;
        setProducts(response.data.slice(0, maxProducts));
      } else {
        setError('Failed to load popular products');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load popular products');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPopularProducts();
  }, [fetchPopularProducts, currentRegion]); // Refetch when region changes

  const handleProductPress = (product: HomepageProduct) => {
    router.push(`/product-page?cardId=${product._id || product.id}&cardType=product`);
  };

  // Calculate cashback amount
  const calculateCashback = (product: HomepageProduct) => {
    const cashbackPercentage = product.cashbackPercentage || 5;
    const price = product.price || 0;
    const amount = Math.round((price * cashbackPercentage) / 100);
    return { percentage: cashbackPercentage, amount };
  };

  // Calculate nuqta coins (5% of price, minimum 1)
  const calculateNuqtaCoins = (product: HomepageProduct) => {
    const price = product.price || 0;
    return price > 0 ? Math.max(1, Math.round((price * 5) / 100)) : 0;
  };

  // Get currency symbol from region using proper Zustand selector pattern
  const currencySymbol = useSelector(useGetCurrencySymbol());

  // Format delivery fee
  const formatDeliveryFee = (fee: number | undefined) => {
    if (fee === undefined || fee === null) return 'Free delivery';
    if (fee === 0) return 'Free delivery';
    return `${currencySymbol}${fee.toFixed(2)} delivery fee`;
  };

  const renderProduct = useCallback(({ item }: { item: HomepageProduct }) => {
    const cashback = calculateCashback(item);
    const nuqtaCoins = calculateNuqtaCoins(item);
    const deliveryFee = item.store?.deliveryFee || 0;
    const category = item.category || item.store?.name || '';

    return (
      <Pressable
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
       
      >
        <ThemedView style={styles.cardContent}>
          {/* Product Image - Left Side (Smaller) */}
          <View style={styles.imageContainer}>
            <CachedImage
              source={item.image || 'https://via.placeholder.com/70x70?text=No+Image'}
              style={styles.productImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          </View>

          {/* Product Details - Middle */}
          <View style={styles.detailsContainer}>
            {/* Product Name */}
            <ThemedText style={styles.productName} numberOfLines={1}>
              {item.name}
            </ThemedText>

            {/* Category and Delivery Fee - One Line */}
            <View style={styles.metaRow}>
              {category && (
                <>
                  <ThemedText style={styles.categoryText} numberOfLines={1}>
                    {category}
                  </ThemedText>
                  <ThemedText style={styles.metaSeparator}> • </ThemedText>
                </>
              )}
              <ThemedText style={styles.deliveryFee} numberOfLines={1}>
                {formatDeliveryFee(deliveryFee)}
              </ThemedText>
            </View>

            {/* Nuqta Coins Info - Below */}
            <View style={styles.rewardRow}>
              <View style={styles.coinsBadge}>
                <Ionicons name="star-outline" size={10} color={colors.lightMustard} />
                <ThemedText style={styles.coinsText}>
                  {`Earn ${nuqtaCoins} ${BRAND.COIN_NAME}`}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Cashback Percentage - Right Side */}
          <View style={styles.cashbackContainer}>
            <ThemedText style={styles.cashbackPercentage}>
              {cashback.percentage}%
            </ThemedText>
          </View>
        </ThemedView>
      </Pressable>
    );
  }, []);

  const keyExtractor = useCallback((item: HomepageProduct) => item._id || item.id, []);

  // Don't render if no products and not loading
  if (!loading && products.length === 0 && !error) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="heart-outline" size={20} color={colors.lightMustard} style={styles.heartIcon} />
        <ThemedText style={styles.title}>{title}</ThemedText>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.lightMustard} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={fetchPopularProducts}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={products}
          renderItem={renderProduct}
          keyExtractor={keyExtractor}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={100}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  heartIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  productCard: {
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  imageContainer: {
    width: 50,
    height: 50,
    backgroundColor: colors.neutral[50],
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 10,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 3,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  categoryText: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  metaSeparator: {
    fontSize: 11,
    color: colors.neutral[400],
    marginHorizontal: 2,
  },
  deliveryFee: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  rewardRow: {
    marginTop: 1,
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amber,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  coinsText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warningScale[400],
    marginLeft: 3,
  },
  cashbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingLeft: 6,
    minWidth: 40,
  },
  cashbackPercentage: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.lightMustard,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default memo(PopularProductsSection);
