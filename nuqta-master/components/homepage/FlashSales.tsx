import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat, interpolate } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import flashSaleApi, { FlashSaleItem } from '@/services/flashSaleApi';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface FlashSaleProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice: number;
  stock: number;
  discount: number;
  endTime: Date;
}

interface FlashSalesProps {
  onViewAllPress?: () => void;
  onProductPress?: (productId: string) => void;
}

// Transform backend data to frontend format
// Handles both FlashSale model and Offer model with metadata.flashSale
const transformFlashSaleData = (item: any): FlashSaleProduct => {
  // Handle Offer format (from /api/offers/flash-sales)
  const flashSaleData = item.metadata?.flashSale || {};

  // Get prices - try multiple sources
  let originalPrice = item.originalPrice ||
    flashSaleData.originalPrice ||
    item.metadata?.flashSale?.originalPrice ||
    0;

  let salePrice = item.flashSalePrice ||
    flashSaleData.salePrice ||
    item.discountedPrice ||
    item.metadata?.flashSale?.salePrice ||
    0;

  // If still no prices, try product pricing
  const product = item.products?.[0];
  if (!originalPrice && product?.pricing) {
    originalPrice = product.pricing.original || product.pricing.selling || 0;
  }
  if (!salePrice && originalPrice && item.discountPercentage) {
    salePrice = originalPrice - (originalPrice * item.discountPercentage / 100);
  }

  // Get image - try multiple sources
  let image = item.image || flashSaleData.image || '';
  if (product?.images && product.images.length > 0) {
    image = product.images[0].url || image;
  }

  // Calculate stock
  const stock = item.stock ||
    flashSaleData.stock ||
    (item.maxQuantity ? Math.max(0, item.maxQuantity - (item.soldQuantity || 0)) : 10);

  // Get discount percentage
  const discount = item.discountPercentage ||
    item.cashbackPercentage ||
    (originalPrice && salePrice ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0);

  // Get end time
  const endTime = item.endTime ||
    flashSaleData.endTime ||
    item.metadata?.flashSale?.endTime ||
    item.validity?.endDate ||
    new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24h from now

  return {
    id: item._id || item.id,
    name: item.title || product?.name || 'Flash Sale Item',
    image,
    price: Math.round(salePrice),
    originalPrice: Math.round(originalPrice),
    stock,
    discount: Math.round(discount),
    endTime: new Date(endTime),
  };
};

// Calculate time remaining
const calculateTimeLeft = (endTime: Date): { hours: number; minutes: number; seconds: number } => {
  const now = new Date().getTime();
  const end = endTime.getTime();
  const diff = Math.max(0, end - now);

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
};

// Skeleton card component
const SkeletonCard: React.FC = () => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1);
  }, [shimmerAnim]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <View style={styles.productCard}>
      <Animated.View style={[styles.skeletonImage, shimmerStyle]} />
      <View style={styles.productInfo}>
        <Animated.View style={[styles.skeletonName, shimmerStyle]} />
        <View style={styles.priceRow}>
          <Animated.View style={[styles.skeletonPrice, shimmerStyle]} />
          <Animated.View style={[styles.skeletonOriginalPrice, shimmerStyle]} />
        </View>
        <View style={styles.footerRow}>
          <Animated.View style={[styles.skeletonSavings, shimmerStyle]} />
          <Animated.View style={[styles.skeletonCoins, shimmerStyle]} />
        </View>
      </View>
    </View>
  );
};

const FlashSales: React.FC<FlashSalesProps> = ({
  onViewAllPress,
  onProductPress,
}) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();
  const [products, setProducts] = useState<FlashSaleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const earliestEndTime = useRef<Date | null>(null);
  const isMounted = useIsMounted();

  // Fetch flash sales from API
  const fetchFlashSales = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await flashSaleApi.getActiveFlashSales();

      if (response.success && response.data && response.data.length > 0) {
        const transformedProducts = response.data
          .filter((item: any) => item && (item._id || item.id)) // Filter out undefined/null items
          .map(transformFlashSaleData)
          .filter(product => product && product.stock > 0 && product.price > 0); // Only show items with stock and valid price

        if (!isMounted()) return;
        setProducts(transformedProducts);

        // Find earliest end time for countdown
        if (transformedProducts.length > 0) {
          const earliest = transformedProducts.reduce((min, product) =>
            product.endTime < min ? product.endTime : min,
            transformedProducts[0].endTime
          );
          earliestEndTime.current = earliest;
          if (!isMounted()) return;
          setTimeLeft(calculateTimeLeft(earliest));
        }
      } else {
        // No active flash sales
        setProducts([]);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err?.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFlashSales();
  }, [fetchFlashSales]);

  // Countdown timer - updates every second
  useEffect(() => {
    if (!earliestEndTime.current) return;

    timerRef.current = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(earliestEndTime.current!);
      setTimeLeft(newTimeLeft);

      // If timer expired, refetch to get new flash sales
      if (newTimeLeft.hours === 0 && newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        // Refetch after a short delay
        setTimeout(() => fetchFlashSales(), 2000);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [products, fetchFlashSales]);

  const handleProductPress = (offerId: string) => {
    // Track click
    flashSaleApi.trackClick(offerId);

    if (onProductPress) {
      onProductPress(offerId);
    } else {
      // Navigate to offer detail page
      router.push(`/offers/${offerId}`);
    }
  };

  const handleViewAll = () => {
    if (onViewAllPress) {
      onViewAllPress();
    } else {
      // Navigate to offers page with flash sale filter or dedicated flash sales page
      router.push('/offers');
    }
  };

  const handleRetry = () => {
    fetchFlashSales();
  };

  const calculateSavings = (original: number, current: number): number => {
    return original - current;
  };

  const calculateCoins = (price: number): number => {
    return Math.round(price * 0.1);
  };

  // Format time display
  const formatTime = () => {
    if (timeLeft.hours > 0) {
      return `${timeLeft.hours}h ${timeLeft.minutes}m left`;
    }
    if (timeLeft.minutes > 0) {
      return `${timeLeft.minutes}m ${timeLeft.seconds}s left`;
    }
    return `${timeLeft.seconds}s left`;
  };

  // Render loading skeleton
  const renderLoading = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled={true}
      contentContainerStyle={styles.productsContainer}
    >
      {[1, 2, 3].map((key) => (
        <SkeletonCard key={key} />
      ))}
    </ScrollView>
  );

  // Render error state
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
      <Text style={styles.errorText}>{error}</Text>
      <Pressable
        onPress={handleRetry}
       
        style={styles.retryButton}
      >
        <Ionicons name="refresh" size={16} color={colors.background.primary} />
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );

  // Render empty state - don't show the section if no flash sales
  if (!loading && !error && products.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="flash" size={20} color={colors.lightMustard} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Flash Sales</Text>
            <Text style={styles.subtitle}>Ending soon - Limited stock</Text>
          </View>
        </View>
        {/* Countdown Timer */}
        {!loading && !error && products.length > 0 && (
          <View style={styles.countdownContainer}>
            <View style={styles.countdownDot} />
            <Text style={styles.countdownText}>{formatTime()}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      {loading && renderLoading()}
      {!loading && error && renderError()}
      {!loading && !error && products.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.productsContainer}
        >
          {products.map((product) => {
            const savings = calculateSavings(product.originalPrice, product.price);
            const coins = calculateCoins(product.price);

            return (
              <Pressable
                key={product.id}
                onPress={() => handleProductPress(product.id)}
               
                style={styles.productCard}
              >
                {/* Image Container */}
                <View style={styles.imageContainer}>
                  <CachedImage
                    source={product.image || 'https://via.placeholder.com/150?text=Flash+Sale'}
                    style={styles.productImage}
                    contentFit="cover"
                  />
                  {/* Discount Badge */}
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {product.discount}% OFF
                    </Text>
                  </View>
                  {/* Stock Badge */}
                  <View style={[
                    styles.stockBadge,
                    product.stock <= 3 && styles.stockBadgeLow
                  ]}>
                    <Text style={styles.stockText}>{product.stock} left</Text>
                  </View>
                </View>

                {/* Product Info */}
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.currentPrice}>
                      {currencySymbol}{product.price.toLocaleString(locale)}
                    </Text>
                    {product.originalPrice > product.price && (
                      <Text style={styles.originalPrice}>
                        {currencySymbol}{product.originalPrice.toLocaleString(locale)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.footerRow}>
                    {savings > 0 && (
                      <Text style={styles.savingsText}>
                        Save {currencySymbol}{savings.toLocaleString(locale)}
                      </Text>
                    )}
                    <View style={styles.coinsContainer}>
                      <Ionicons name="star" size={12} color={colors.warningScale[400]} />
                      <Text style={styles.coinsText}>{coins} coins</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '400',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 181, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 181, 0.5)',
  },
  countdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lightMustard,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  productsContainer: {
    gap: 12,
    paddingRight: 8,
  },
  productCard: {
    width: 176,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: 128,
    position: 'relative',
    backgroundColor: colors.neutral[100],
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.lightPeach,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  stockBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockBadgeLow: {
    backgroundColor: 'rgba(255, 205, 87, 0.9)',
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background.primary,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.lightMustard,
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  // Skeleton styles
  skeletonImage: {
    width: '100%',
    height: 128,
    backgroundColor: colors.neutral[200],
  },
  skeletonName: {
    width: '80%',
    height: 14,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonPrice: {
    width: 70,
    height: 16,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
  },
  skeletonOriginalPrice: {
    width: 50,
    height: 12,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
  },
  skeletonSavings: {
    width: 60,
    height: 12,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
  },
  skeletonCoins: {
    width: 50,
    height: 12,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
  },
  // Error styles
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default React.memo(FlashSales);
