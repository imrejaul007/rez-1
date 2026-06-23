// ProductCarousel.tsx
// Horizontal scrollable product carousel for UGC videos

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import ShoppableProductCard from './ShoppableProductCard';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SPACING = 16;

interface ProductCarouselProps {
  products: any[];
  title?: string;
  onProductPress: (product: any) => void;
  onAddToCart?: (product: any) => Promise<void>;
  loading?: boolean;
  showAddButton?: boolean;
  emptyMessage?: string;
  cardWidth?: number;
}

/**
 * Product carousel component for shoppable UGC videos
 * Displays horizontal scrollable list of products
 */
function ProductCarousel({
  products = [],
  title = '🛍️ Shop from this video',
  onProductPress,
  onAddToCart,
  loading = false,
  showAddButton = true,
  emptyMessage = 'No products tagged in this video',
  cardWidth = 180,
}: ProductCarouselProps) {
  const flatListRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const CARD_WIDTH = cardWidth;

  const hasProducts = products && products.length > 0;
  const productCount = products?.length || 0;

  /**
   * Handle scroll to track current position
   */
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
        setCurrentIndex(index);
      },
    }
  );

  /**
   * Scroll to specific index
   */
  const scrollToIndex = useCallback((index: number) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
      });
    }
  }, []);

  /**
   * Handle view all products
   */
  const handleViewAll = useCallback(() => {
    // Could navigate to full product list page
  }, []);

  /**
   * Render product item
   */
  const renderProduct = useCallback(({ item, index }: { item: any; index: number }) => {
    return (
      <View style={{ marginRight: index < products.length - 1 ? CARD_SPACING : 0 }}>
        <ShoppableProductCard
          product={item}
          onPress={() => onProductPress(item)}
          onAddToCart={onAddToCart ? () => onAddToCart(item) : undefined}
          showAddButton={showAddButton}
          width={CARD_WIDTH}
        />
      </View>
    );
  }, [onProductPress, onAddToCart, showAddButton, products.length]);

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bag-outline" size={48} color={colors.neutral[400]} />
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    </View>
  );

  /**
   * Render loading state
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6F45FF" />
      <Text style={styles.loadingText}>Loading products...</Text>
    </View>
  );

  /**
   * Render skeleton loader
   */
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={[styles.skeletonCard, { width: CARD_WIDTH }]}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonInfo}>
            <View style={[styles.skeletonLine, styles.skeletonLineWrapper]} />
            <View style={[styles.skeletonLine, { width: '60%' }]} />
          </View>
        </View>
      ))}
    </View>
  );

  /**
   * Render pagination dots
   */
  const renderPaginationDots = () => {
    if (productCount <= 3) return null;

    return (
      <View style={styles.paginationContainer}>
        {products.map((_, index) => {
          const opacity = scrollX.interpolate({
            inputRange: [
              (index - 1) * (CARD_WIDTH + CARD_SPACING),
              index * (CARD_WIDTH + CARD_SPACING),
              (index + 1) * (CARD_WIDTH + CARD_SPACING),
            ],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          const scale = scrollX.interpolate({
            inputRange: [
              (index - 1) * (CARD_WIDTH + CARD_SPACING),
              index * (CARD_WIDTH + CARD_SPACING),
              (index + 1) * (CARD_WIDTH + CARD_SPACING),
            ],
            outputRange: [0.8, 1.2, 0.8],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity,
                  transform: [{ scale }],
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  /**
   * Get item layout for better performance
   */
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: CARD_WIDTH,
      offset: (CARD_WIDTH + CARD_SPACING) * index,
      index,
    }),
    []
  );

  /**
   * Key extractor
   */
  const keyExtractor = useCallback(
    (item: any, index: number) => item._id || item.id || `product-${index}`,
    []
  );

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        {renderSkeleton()}
      </View>
    );
  }

  // Show empty state
  if (!hasProducts) {
    return (
      <View style={styles.container}>
        {renderEmptyState()}
      </View>
    );
  }

  // Show product carousel
  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' || Platform.OS === 'android' ? (
        <BlurView intensity={30} tint="light" style={styles.blurContainer}>
          {/* Header - only show if title is not empty */}
          {title && (
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{title}</Text>
                <View style={[styles.countBadge, styles.countBadgeWrapper]}>
                  <Text style={styles.countText}>{productCount}</Text>
                </View>
              </View>

              {productCount > 3 && (
                <Pressable onPress={handleViewAll} style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#6F45FF" style={styles.viewAllIcon} />
                </Pressable>
              )}
            </View>
          )}

          {/* Product List */}
          <Animated.FlatList
            ref={flatListRef}
            data={products}
            renderItem={renderProduct}
            keyExtractor={keyExtractor}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            contentContainerStyle={styles.listContent}
            getItemLayout={getItemLayout}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            initialNumToRender={3}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
          />

          {/* Pagination Dots */}
          {renderPaginationDots()}
        </BlurView>
      ) : (
        <View style={styles.blurContainer}>
          {/* Header - only show if title is not empty */}
          {title && (
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{title}</Text>
                <View style={[styles.countBadge, styles.countBadgeWrapper]}>
                  <Text style={styles.countText}>{productCount}</Text>
                </View>
              </View>

              {productCount > 3 && (
                <Pressable onPress={handleViewAll} style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#6F45FF" style={styles.viewAllIcon} />
                </Pressable>
              )}
            </View>
          )}

          {/* Product List */}
          <Animated.FlatList
            ref={flatListRef}
            data={products}
            renderItem={renderProduct}
            keyExtractor={keyExtractor}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            contentContainerStyle={styles.listContent}
            getItemLayout={getItemLayout}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            initialNumToRender={3}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
          />

          {/* Pagination Dots */}
          {renderPaginationDots()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  blurContainer: {
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.25)', // Enhanced transparency
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.5)', // More prominent border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadgeWrapper: {
    marginLeft: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewAllIcon: {
    marginLeft: 4,
  },
  viewAllText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.background.primary,
    marginHorizontal: 3,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 12,
    textAlign: 'center',
  },

  // Loading State
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 12,
  },

  // Skeleton Loader
  skeletonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: CARD_SPACING,
  },
  skeletonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  skeletonImage: {
    aspectRatio: 3 / 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  skeletonInfo: {
    padding: 10,
  },
  skeletonLineWrapper: {
    marginBottom: 6,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
  },
});

export default React.memo(ProductCarousel);
