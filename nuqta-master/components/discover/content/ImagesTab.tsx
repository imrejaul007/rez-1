// @ts-nocheck
// ImagesTab.tsx - Shoppable images grid for Discover & Shop
// Nuqta Brand Colors: Nile Blue (#1a3a52) and Mustard (#ffcd57)
import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DiscoverImage } from '@/types/discover.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

// Nuqta Brand Colors
const NUQTA_COLORS = {
  nileBlue: colors.nileBlue,
  nileBlueLight: '#2a4a62',
  mustard: colors.lightMustard,
  mustardLight: '#ffdd77',
  primaryGold: colors.brand.goldWarm,
  navy: colors.brand.navyDark,
  gray: colors.neutral[500],
  lightGray: colors.neutral[100],
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface ImagesTabProps {
  data: DiscoverImage[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function ImagesTab({
  data,
  loading = false,
  hasMore = true,
  onLoadMore,
  onRefresh,
  refreshing = false,
}: ImagesTabProps) {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Navigate to product page
  const handleImagePress = useCallback((item: DiscoverImage) => {
    if (item.products && item.products.length > 0) {
      router.push(`/product-page?cardId=${item.products[0]._id}&cardType=product&source=discover`);
    }
  }, [router]);

  // Navigate to specific product
  const handleProductTagPress = useCallback((productId: string) => {
    router.push(`/product-page?cardId=${productId}&cardType=product&source=discover`);
  }, [router]);

  // Format count
  const formatCount = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Render image card
  const renderItem = useCallback(({ item, index }: { item: DiscoverImage; index: number }) => {
    const productCount = item.products?.length || 0;
    const likeCount = typeof item.engagement?.likes === 'number'
      ? item.engagement.likes
      : 0;

    return (
      <Pressable
        style={[styles.card, index % 2 === 0 ? styles.leftCard : styles.rightCard]}
       
        onPress={() => handleImagePress(item)}
        accessibilityLabel={`Shoppable image with ${productCount} products`}
        accessibilityRole="button"
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          <CachedImage
            source={item.imageUrl}
            style={styles.image}
            contentFit="cover"
          />

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            style={styles.gradient}
          />

          {/* Shop badge */}
          {productCount > 0 && (
            <View style={styles.shopBadge}>
              <Ionicons name="bag-handle" size={14} color={colors.background.primary} />
              <Text style={styles.shopBadgeText}>Shop {productCount}</Text>
            </View>
          )}

          {/* Product tags overlay */}
          {item.productTags && item.productTags.length > 0 && (
            <View style={styles.productTagsOverlay}>
              {item.productTags.slice(0, 2).map((tag, tagIndex) => (
                <Pressable
                  key={tagIndex}
                  style={[
                    styles.productTag,
                    {
                      left: `${tag.position.x}%`,
                      top: `${tag.position.y}%`,
                    },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleProductTagPress(tag.productId);
                  }}
                >
                  <View style={styles.productTagDot} />
                </Pressable>
              ))}
            </View>
          )}

          {/* Creator info */}
          <View style={styles.creatorInfo}>
            <CachedImage
              source={item.creator?.avatar || 'https://via.placeholder.com/20'}
              style={styles.creatorAvatar}
            />
            <Text style={styles.creatorName} numberOfLines={1}>
              {item.creator?.name || 'Creator'}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <Ionicons name="heart" size={12} color={colors.background.primary} />
            <Text style={styles.statText}>{formatCount(likeCount)}</Text>
          </View>
        </View>

        {/* Caption */}
        {item.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption} numberOfLines={2}>
              {item.caption}
            </Text>
          </View>
        )}

        {/* Product preview */}
        {productCount > 0 && item.products[0] && (
          <View style={styles.productPreview}>
            <CachedImage
              source={item.products[0].image || 'https://via.placeholder.com/32?text=Product'}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.products[0].name}
              </Text>
              <Text style={styles.productPrice}>
                {currencySymbol}{item.products[0].price}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.neutral[400]} />
          </View>
        )}
      </Pressable>
    );
  }, [handleImagePress, handleProductTagPress]);

  // Key extractor
  const keyExtractor = useCallback((item: DiscoverImage) => item._id, []);

  // Footer loader
  const renderFooter = useCallback(() => {
    if (!loading || data.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.nileBlue} />
      </View>
    );
  }, [loading, data.length]);

  // Empty state
  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={NUQTA_COLORS.nileBlue} />
          </View>
          <Text style={styles.loadingText}>Loading images...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={[NUQTA_COLORS.mustard, NUQTA_COLORS.mustardLight]}
          style={styles.emptyIconContainer}
        >
          <Ionicons name="images" size={40} color={colors.background.primary} />
        </LinearGradient>
        <Text style={styles.emptyTitle}>No Images Yet</Text>
        <Text style={styles.emptyText}>
          Shoppable images with tagged products will appear here
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={2}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshing={refreshing}
      onRefresh={onRefresh}
      estimatedItemSize={250}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  leftCard: {
    marginRight: 6,
  },
  rightCard: {
    marginLeft: 6,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.neutral[100],
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  shopBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 205, 87, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  shopBadgeText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  productTagsOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  productTag: {
    position: 'absolute',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productTagDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.lightMustard,
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  creatorInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.background.primary,
  },
  creatorName: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 60,
  },
  stats: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  captionContainer: {
    padding: 8,
    paddingBottom: 4,
  },
  caption: {
    fontSize: 11,
    color: colors.neutral[600],
    lineHeight: 15,
  },
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  productImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.neutral[100],
  },
  productInfo: {
    flex: 1,
    marginLeft: 8,
  },
  productName: {
    fontSize: 11,
    color: colors.neutral[800],
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 11,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  loaderContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(26, 58, 82, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: NUQTA_COLORS.gray,
    fontWeight: '500',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: NUQTA_COLORS.mustard,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NUQTA_COLORS.navy,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: NUQTA_COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default React.memo(ImagesTab);
