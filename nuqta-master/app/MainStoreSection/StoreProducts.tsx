// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// StoreProducts.tsx - Premium Glassmorphism Design
// Green & Gold color theme following TASK.md

import { colors } from '@/constants/theme';
import React, { useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring } from 'react-native-reanimated';
import { ProductGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import productsApi, { Product } from '@/services/productsApi';
import { RetryButton } from '@/components/common/RetryButton';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

// Premium Glass Design Tokens - Mustard & Gold Theme
const GLASS = {
  // Light Glass
  lightBg: 'rgba(255, 255, 255, 0.75)',
  lightBorder: 'rgba(255, 255, 255, 0.5)',
  lightHighlight: 'rgba(255, 255, 255, 0.8)',

  // Frosted Glass
  frostedBg: 'rgba(255, 255, 255, 0.9)',
  frostedBorder: 'rgba(255, 255, 255, 0.6)',

  // Mustard Tinted Glass
  tintedGreenBg: 'rgba(255, 205, 87, 0.08)',
  tintedGreenBorder: 'rgba(255, 205, 87, 0.2)',

  // Gold Tinted Glass
  tintedGoldBg: 'rgba(255, 200, 87, 0.1)',
  tintedGoldBorder: 'rgba(255, 200, 87, 0.3)' };

const COLORS = {
  primary: Colors.gold,
  primaryDark: colors.brand.goldRich,   // Mustard Dark — brand-specific
  gold: colors.brand.goldWarm,          // Sun Gold — brand-specific
  goldDark: '#E5A500',      // Darker Gold — brand-specific
  navy: Colors.nileBlue,
  textPrimary: Colors.text.primary,
  textSecondary: Colors.text.tertiary,
  white: Colors.background.primary,
  surface: colors.linen,       // Brand linen — keep unique
  discount: colors.lightPeach,      // Light Peach for discount badges — brand-specific
};

interface StoreProductsProps {
  storeId: string;
  storeName?: string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 84) / 2;

function StoreProducts({ storeId, storeName }: StoreProductsProps) {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation refs
  const cardScale1 = useSharedValue(1);
  const cardScale2 = useSharedValue(1);
  const cardScale1Style = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale1.value }],
  }));
  const cardScale2Style = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale2.value }],
  }));

  useEffect(() => {
    fetchProducts();
  }, [storeId]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await productsApi.getProductsByStore(storeId, {});

      if (
        response.success &&
        response.data &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        const storeData = response.data[0];
        if (
          storeData &&
          typeof storeData === 'object' &&
          'products' in storeData &&
          Array.isArray(storeData.products)
        ) {
          setProducts(storeData.products);
        } else {
          setError('Invalid product data structure');
        }
      } else {
        if (!isMounted()) return;
        setError('No products found');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError('Failed to load products');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleProductPress = (product: any) => {
    const productId = product._id || product.id;
    router.push({
      pathname: '/product-page',
      params: { cardId: productId, cardType: 'product' }
    } as any);
  };

  const handleViewAll = () => {
    router.push({
      pathname: '/StoreProductsPage',
      params: { storeId, storeName: storeName || 'Store' }
    } as any);
  };

  const formatPrice = (price: number) => price.toLocaleString('en-IN');

  const animateCard = (scale: { value: number }, toValue: number) => {
    scale.value = withSpring(toValue, { damping: 8, stiffness: 100 });
  };

  const renderProduct = ({ item, index }: { item: any; index: number }) => {
    const imageUrl = Array.isArray(item.images) && item.images.length > 0
      ? (typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url)
      : null;

    const price = item.pricing?.selling || item.pricing?.salePrice || item.pricing?.basePrice || 0;
    const comparePrice = item.pricing?.original || item.pricing?.mrp;
    const discount = comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : 0;

    const displayName = item.name?.length > 30
      ? item.name.substring(0, 30) + '...'
      : item.name;

    const cardScaleStyle = index === 0 ? cardScale1Style : cardScale2Style;

    return (
      <Animated.View style={cardScaleStyle}>
        <Pressable
          style={styles.productCard}
          onPress={() => handleProductPress(item)}
          onPressIn={() => animateCard(index === 0 ? cardScale1 : cardScale2, 0.96)}
          onPressOut={() => animateCard(index === 0 ? cardScale1 : cardScale2, 1)}
         
        >
          {/* Glass Card Effect */}
          {Platform.OS === 'ios' ? (
            <BlurView intensity={40} tint="light" style={styles.cardBlur}>
              {renderCardContent()}
            </BlurView>
          ) : (
            <View style={[styles.cardBlur, styles.cardBlurAndroid]}>
              {renderCardContent()}
            </View>
          )}
        </Pressable>
      </Animated.View>
    );

    function renderCardContent() {
      return (
        <>
          {/* Inner Glass Highlight */}
          <View style={styles.glassHighlight} />

          {/* Product Image */}
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <CachedImage
                source={imageUrl}
                style={styles.productImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={32} color={COLORS.textSecondary} />
              </View>
            )}

            {/* Premium Discount Badge */}
            {discount > 0 && (
              <LinearGradient
                colors={[COLORS.gold, COLORS.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.discountBadge}
              >
                <Text style={styles.discountText}>{discount}% OFF</Text>
              </LinearGradient>
            )}
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">
              {displayName}
            </Text>

            {/* Price Section */}
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{currencySymbol}{formatPrice(price)}</Text>
              {comparePrice && comparePrice > price && (
                <Text style={styles.comparePrice}>{currencySymbol}{formatPrice(comparePrice)}</Text>
              )}
            </View>

            {/* Rating Badge - Glass Style */}
            {item.ratings?.average > 0 && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={11} color={COLORS.goldDark} />
                <Text style={styles.ratingText}>
                  {item.ratings.average.toFixed(1)}
                </Text>
              </View>
            )}

            {/* ReZ Coin Earnings */}
            <View style={styles.coinEarningsRow}>
              <Text style={styles.coinEmoji}>🪙</Text>
              <Text style={styles.coinEarningsText}>
                Earn {Math.round(price * 0.05)} coins
              </Text>
            </View>
          </View>
        </>
      );
    }
  };

  // Loading State
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconBg}>
              <Ionicons name="cube" size={16} color={COLORS.white} />
            </View>
            <Text style={styles.title}>Store Products</Text>
          </View>
        </View>
        <ProductGridSkeleton />
      </View>
    );
  }

  // Actual fetch error — show retry
  const isFetchError = error && error !== 'No products found' && error !== 'Invalid product data structure';
  if (isFetchError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconBg}>
              <Ionicons name="cube" size={16} color={COLORS.white} />
            </View>
            <Text style={styles.title}>Store Products</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="alert-circle-outline" size={36} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.emptyText}>{error}</Text>
          <RetryButton
            onRetry={fetchProducts}
            label="Try Again"
            variant="secondary"
            size="small"
            style={{ marginTop: 16 }}
          />
        </View>
      </View>
    );
  }

  // No products — friendly empty state (no retry, not an error)
  if (error || products.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconBg}>
              <Ionicons name="cube" size={16} color={COLORS.white} />
            </View>
            <Text style={styles.title}>Store Products</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="storefront-outline" size={36} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.emptyText}>No products listed yet</Text>
          <Text style={[styles.emptyText, { fontSize: 13, marginTop: 4, opacity: 0.7 }]}>
            Visit the store or check back later for new listings
          </Text>
        </View>
      </View>
    );
  }

  const displayProducts = products.slice(0, 2);

  return (
    <View style={styles.container}>
      {/* Premium Glass Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.headerIconBg}
          >
            <Ionicons name="cube" size={16} color={COLORS.white} />
          </LinearGradient>
          <Text style={styles.title}>Store Products</Text>
        </View>

        {products.length >= 2 && (
          <Pressable
            onPress={handleViewAll}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>View All ({products.length})</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </Pressable>
        )}
      </View>

      {/* Products Grid */}
      <View style={styles.productsRow}>
        {displayProducts.map((product, index) => (
          <View key={product._id || product.id}>
            {renderProduct({ item: product, index })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16 },

  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16 },

  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10 },

  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center' },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3 },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: GLASS.tintedGreenBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GLASS.tintedGreenBorder },

  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary },

  // Products Grid
  productsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12 },

  // Product Card - Glass Effect
  productCard: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16 },
      android: {
        elevation: 6 } }) },

  cardBlur: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GLASS.lightBorder,
    overflow: 'hidden' },

  cardBlurAndroid: {
    backgroundColor: GLASS.lightBg },

  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: GLASS.lightHighlight,
    zIndex: 1 },

  // Image Container
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.85,
    backgroundColor: COLORS.surface,
    position: 'relative' },

  productImage: {
    width: '100%',
    height: '100%' },

  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface },

  // Premium Gold Discount Badge
  discountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6 },
      android: {
        elevation: 4 } }) },

  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.navy,
    letterSpacing: 0.3 },

  // Product Info
  productInfo: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)' },

  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    lineHeight: 17,
    height: 34 },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6 },

  price: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary },

  comparePrice: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through' },

  // Glass Rating Badge
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: GLASS.tintedGoldBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: GLASS.tintedGoldBorder },

  ratingText: {
    fontSize: 11,
    color: COLORS.goldDark,
    marginLeft: 4,
    fontWeight: '700' },

  // Loading State
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GLASS.frostedBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GLASS.frostedBorder },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500' },

  // Empty State
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GLASS.frostedBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GLASS.frostedBorder },

  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12 },

  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center' },

  // Coin Earnings Row
  coinEarningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: GLASS.tintedGreenBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: GLASS.tintedGreenBorder },

  coinEmoji: {
    fontSize: 12,
    marginRight: 4 },

  coinEarningsText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700' } });

export default withErrorBoundary(StoreProducts, 'MainStoreSectionStoreProducts');
