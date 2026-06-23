// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { FashionProduct } from '@/hooks/useFashionData';
import { useGetCurrencySymbol } from '@/stores/selectors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

interface ProductCardProps {
  product: FashionProduct;
  index: number;
  scrollX: Animated.SharedValue<number>;
  onPress: (product: FashionProduct) => void;
  currencySymbol: string;
}

const ProductCard = ({ product, index, scrollX, onPress, currencySymbol }: ProductCardProps) => {
  const inputRange = [
    (index - 1) * CARD_WIDTH,
    index * CARD_WIDTH,
    (index + 1) * CARD_WIDTH,
  ];

  // 3D Carousel Animation Styles
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.85, 1.0, 0.85],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolate.CLAMP
    );

    const rotateY = interpolate(
      scrollX.value,
      inputRange,
      [15, 0, -15],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [20, 0, 20],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { perspective: 1000 },
        { scale },
        { rotateY: `${rotateY}deg` },
        { translateY },
      ],
      opacity,
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      scrollX.value,
      inputRange,
      [0.1, 0.3, 0.1],
      Extrapolate.CLAMP
    );

    const shadowRadius = interpolate(
      scrollX.value,
      inputRange,
      [8, 20, 8],
      Extrapolate.CLAMP
    );

    const elevation = interpolate(
      scrollX.value,
      inputRange,
      [5, 15, 5],
      Extrapolate.CLAMP
    );

    return {
      shadowOpacity,
      shadowRadius,
      elevation,
    };
  });

  const CardWrapper = Platform.OS === 'web' ? Pressable : Pressable;

  // Extract data from API response with proper fallbacks
  const cashback = product.cashback?.percentage || 0;
  const brandName = product.brand || product.store?.name || 'Fashion';
  
  // API returns 'image' (singular), not 'images' array
  const mainImage = product.image || product.images?.[0] || 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300&h=400&fit=crop';
  
  // API returns 'price.discount', not 'pricing.discount'
  const discount = product.price?.discount || product.pricing?.discount || 0;
  
  // Price handling - API returns price.current and price.original
  const currentPrice = product.price?.current || product.pricing?.salePrice || product.pricing?.basePrice || 0;
  const originalPrice = product.price?.original || product.pricing?.basePrice || product.pricing?.original || currentPrice;
  
  // Rating - API returns rating.value (string) and rating.count
  const ratingValue = product.rating?.value || product.ratings?.average || 0;
  const ratingCount = product.rating?.count || product.ratings?.count || 0;
  
  // Check if product ID exists (API might return 'id' or '_id')
  const productId = product._id || product.id;

  return (
    <CardWrapper
      key={productId}
      style={{ width: CARD_WIDTH }}
     
      onPress={() => onPress(product)}
    >
      <Animated.View style={[styles.productCard, animatedStyle, shadowStyle]}>
        <ImageBackground
          source={{ uri: mainImage }}
          style={styles.productImage}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
            style={styles.overlay}
          >
            {/* Brand Name */}
            <View style={styles.topSection}>
              <Text style={styles.brandText}>{brandName}</Text>
              
              {/* Rating Badge */}
              {ratingValue > 0 && (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>⭐ {ratingValue}</Text>
                </View>
              )}
            </View>

            {/* Discount Ribbon */}
            {(cashback > 0 || discount > 0) && (
              <View style={styles.ribbon}>
                <Text style={styles.ribbonText}>
                  {cashback > 0 ? `${cashback}% CASHBACK` : `${discount}% OFF`}
                </Text>
              </View>
            )}

            {/* Product Info */}
            <View style={styles.textContainer}>
              <Text style={styles.title} numberOfLines={2}>{product.name}</Text>
              {product.description && (
                <Text style={styles.subtitle} numberOfLines={2}>
                  {product.description}
                </Text>
              )}
              
              {/* Additional Info Badges */}
              <View style={styles.badgesContainer}>
                {product.isRecommended && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>✨ Recommended</Text>
                  </View>
                )}
                {product.availabilityStatus === 'in_stock' && (
                  <View style={[styles.badge, styles.stockBadge]}>
                    <Text style={styles.badgeText}>In Stock</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Price Button */}
            <Pressable style={styles.bottomButton}>
              <View style={styles.priceContainer}>
                <Text style={styles.currentPrice}>{currencySymbol}{currentPrice}</Text>
                {discount > 0 && originalPrice > currentPrice && (
                  <Text style={styles.originalPrice}>{currencySymbol}{originalPrice}</Text>
                )}
              </View>
              <View style={styles.arrowContainer}>
                <Text style={styles.arrow}>›</Text>
              </View>
            </Pressable>
          </LinearGradient>
        </ImageBackground>
      </Animated.View>
    </CardWrapper>
  );
};

interface ProductionProductCarouselProps {
  products: FashionProduct[];
  isLoading: boolean;
  error?: Error | null;
}

const ProductionProductCarousel = ({ products, isLoading, error }: ProductionProductCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    scrollX.value = scrollPosition;
    const index = Math.round(scrollPosition / CARD_WIDTH);
    setActiveIndex(index);
  };

  const handleProductPress = (product: FashionProduct) => {
    // Navigate to product detail page with query parameters
    const productId = product._id || product.id;
    const categoryId = typeof product.category === 'string' 
      ? product.category 
      : product.category?._id || product.category?.id || '';
    
    // ProductPage expects: cardId, cardType, category as query params
    router.push(`/product-page?cardId=${productId}&cardType=product&category=${categoryId}`);
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {products.map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: activeIndex === index ? '#ffcd57' : '#E5E7EB',
              width: activeIndex === index ? 24 : 8,
              transform: [{ scale: activeIndex === index ? 1 : 0.8 }],
            },
          ]}
        />
      ))}
    </View>
  );

  // Loading skeleton
  if (isLoading && products.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffcd57" />
          <Text style={styles.loadingText}>Loading featured products...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && products.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>😕 Couldn't load products</Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🛍️ No featured products</Text>
          <Text style={styles.emptySubtext}>Check back soon!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={CARD_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {products.slice(0, 10).map((product, index) => (
          <ProductCard
            key={product._id || product.id || index}
            product={product}
            index={index}
            scrollX={scrollX}
            onPress={handleProductPress}
            currencySymbol={currencySymbol}
          />
        ))}
      </ScrollView>
      {products.length > 1 && renderDots()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 30,
  },
  scrollContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
    paddingVertical: 20,
  },
  productCard: {
    height: 320,
    marginHorizontal: 8,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  productImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderRadius: 16,
  },
  overlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  topSection: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    maxWidth: '60%',
  },
  ratingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  ribbon: {
    position: 'absolute',
    top: 16,
    right: -40,
    backgroundColor: '#ffcd57',
    paddingVertical: 4,
    paddingHorizontal: 40,
    transform: [{ rotate: '45deg' }],
  },
  ribbonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  textContainer: {
    marginBottom: 60,
  },
  badgesContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: 'rgba(255, 205, 87, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stockBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  originalPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    opacity: 0.7,
    textDecorationLine: 'line-through',
  },
  arrowContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  // Loading states
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Error states
  errorContainer: {
    paddingVertical: 100,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Empty states
  emptyContainer: {
    paddingVertical: 100,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
  },
});

export default ProductionProductCarousel;

