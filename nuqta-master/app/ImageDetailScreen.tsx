// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// ImageDetailScreen.tsx - Modern Image Detail View with Product Tags
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  ActivityIndicator,
  Text,
  ScrollView,
  StatusBar,
  Share,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthUser, useIsAuthenticated, useCartActions, useGetCurrencySymbol } from '@/stores/selectors';
import { DiscoverImage, DiscoverProduct } from '@/types/discover.types';
import { realVideosApi } from '@/services/realVideosApi';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ReZ Brand Colors

function ImageDetailScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // State
  const [image, setImage] = useState<DiscoverImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Engagement state
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // Contexts
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const { addItem } = useCartActions();

  // Parse params
  useEffect(() => {
    if (params.item && typeof params.item === 'string') {
      try {
        const parsedItem = JSON.parse(params.item) as DiscoverImage;
        setImage(parsedItem);

        // Set initial engagement state
        const likes = typeof parsedItem.engagement?.likes === 'number'
          ? parsedItem.engagement.likes
          : (Array.isArray(parsedItem.engagement?.likes) ? parsedItem.engagement.likes.length : 0);
        setLikesCount(likes);
        setIsLiked(parsedItem.engagement?.liked || false);
        setIsBookmarked(parsedItem.engagement?.bookmarked || false);

        setLoading(false);
      } catch (err) {
        setError('Failed to load image');
        setLoading(false);
      }
    } else {
      setError('No image data provided');
      setLoading(false);
    }
  }, [params.item]);

  // Handle like toggle
  const handleLike = useCallback(async () => {
    if (!image) return;

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

    try {
      await realVideosApi.toggleVideoLike(image._id);
    } catch (error) {
      // Revert on error
      if (!isMounted()) return;
      setIsLiked(!newLikedState);
      if (!isMounted()) return;
      setLikesCount(prev => newLikedState ? Math.max(0, prev - 1) : prev + 1);
    }
  }, [image, isLiked]);

  // Handle bookmark toggle
  const handleBookmark = useCallback(async () => {
    if (!image) return;

    const newBookmarkedState = !isBookmarked;
    setIsBookmarked(newBookmarkedState);

    try {
      await realVideosApi.toggleBookmark(image._id);
    } catch (error) {
      if (!isMounted()) return;
      setIsBookmarked(!newBookmarkedState);
    }
  }, [image, isBookmarked]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!image) return;

    try {
      await Share.share({
        message: `Check out this on ${BRAND.APP_NAME}! ${image.caption || ''}`,
        title: 'Share Image',
      });
    } catch (error) {
      // silently handle
    }
  }, [image]);

  // Navigate to product
  const handleProductPress = useCallback((product: DiscoverProduct) => {
    router.push(`/product-page?cardId=${product._id}&cardType=product&source=image`);
  }, [router]);

  // Add to cart
  const handleAddToCart = useCallback(async (product: DiscoverProduct) => {
    try {
      await addItem({
        productId: product._id,
        quantity: 1,
      });
    } catch (error) {
      // silently handle
    }
  }, [addItem]);

  // Format count
  const formatCount = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Get creator display info
  const getCreatorInfo = () => {
    if (!image?.creator) return { name: '', avatar: null };

    const name = image.creator.name || image.creator.username || '';
    const rawAvatar = image.creator.avatar || image.creator.profile?.avatar;
    const avatar = rawAvatar && !rawAvatar.includes('ui-avatars.com') ? rawAvatar : null;

    return { name, avatar };
  };

  // Get image URL
  const getImageUrl = () => {
    if (image?.imageUrl && image.imageUrl.trim()) {
      return image.imageUrl;
    }
    // Check for product images as fallback
    if (image?.products && image.products.length > 0) {
      const productImage = image.products[0].image || image.products[0].images?.[0];
      if (productImage) return productImage;
    }
    return null;
  };

  const creatorInfo = getCreatorInfo();
  const imageUrl = getImageUrl();
  const hasProducts = image?.products && image.products.length > 0;

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (error || !image) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="alert-circle-outline" size={64} color={Colors.text.tertiary} />
        <Text style={styles.errorText}>{error || 'Image not found'}</Text>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
         
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>

        <Text style={styles.headerTitle}>Photo</Text>

        <Pressable
          style={styles.headerButton}
          onPress={handleShare}
         
        >
          <Ionicons name="share-outline" size={24} color={Colors.text.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Creator Info */}
        <View style={styles.creatorSection}>
          {creatorInfo.avatar && (
            <CachedImage source={creatorInfo.avatar} style={styles.creatorAvatar} />
          )}
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorName}>{creatorInfo.name || 'User'}</Text>
          </View>
          <Pressable style={styles.followButton}>
            <Text style={styles.followButtonText}>Follow</Text>
          </Pressable>
        </View>

        {/* Main Image */}
        <View style={styles.imageContainer}>
          {/* Loading placeholder */}
          {!imageLoaded && !imageError && imageUrl && (
            <View style={styles.imagePlaceholder}>
              <ActivityIndicator size="large" color={Colors.warning} />
            </View>
          )}

          {/* Main image */}
          {imageUrl && !imageError && (
            <CachedImage
              source={imageUrl}
              style={[styles.mainImage, !imageLoaded && styles.hiddenImage]}
              contentFit="cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageLoaded(true);
                setImageError(true);
              }}
            />
          )}

          {/* Fallback */}
          {(!imageUrl || imageError) && (
            <View style={styles.noImageFallback}>
              <LinearGradient
                colors={['rgba(245, 158, 11, 0.3)', 'rgba(234, 88, 12, 0.2)', 'rgba(255, 205, 87, 0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="image-outline" size={64} color="rgba(245, 158, 11, 0.5)" />
              <Text style={styles.noImageText}>No image available</Text>
            </View>
          )}

          {/* Product count badge */}
          {hasProducts && (
            <View style={styles.productCountBadge}>
              <Ionicons name="bag-handle" size={16} color={Colors.text.inverse} />
              <Text style={styles.productCountText}>
                {image.products.length} {image.products.length === 1 ? 'Product' : 'Products'}
              </Text>
            </View>
          )}
        </View>

        {/* Engagement Actions */}
        <View style={styles.engagementSection}>
          <View style={styles.actionRow}>
            <Pressable
              style={styles.actionButton}
              onPress={handleLike}
             
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={28}
                color={isLiked ? colors.error : Colors.text.primary}
              />
            </Pressable>
            <Pressable style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={26} color={Colors.text.primary} />
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={handleShare}
             
            >
              <Ionicons name="paper-plane-outline" size={26} color={Colors.text.primary} />
            </Pressable>

            <View style={styles.actionSpacer} />

            <Pressable
              style={styles.actionButton}
              onPress={handleBookmark}
             
            >
              <Ionicons
                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                size={26}
                color={isBookmarked ? Colors.gold : Colors.text.primary}
              />
            </Pressable>
          </View>

          {/* Likes Count */}
          <Text style={styles.likesCount}>{formatCount(likesCount)} likes</Text>
        </View>

        {/* Caption */}
        {image.caption && (
          <View style={styles.captionSection}>
            <Text style={styles.captionText}>
              <Text style={styles.captionUsername}>{creatorInfo.name} </Text>
              {image.caption}
            </Text>
          </View>
        )}

        {/* View Count */}
        <Text style={styles.viewsText}>
          {formatCount(image.engagement?.views || 0)} views
        </Text>

        {/* Products Section */}
        {hasProducts && (
          <View style={styles.productsSection}>
            <View style={styles.productsSectionHeader}>
              <Ionicons name="bag-handle" size={20} color={Colors.success} />
              <Text style={styles.productsSectionTitle}>Shop Products</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsScrollContainer}
            >
              {image.products.map((product, index) => (
                <Pressable
                  key={product._id || index}
                  style={styles.productCard}
                  onPress={() => handleProductPress(product)}
                 
                >
                  <CachedImage
                    source={product.image || product.images?.[0]}
                    style={styles.productImage}
                    contentFit="cover"
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name || product.title}
                    </Text>
                    <View style={styles.productPriceRow}>
                      <Text style={styles.productPrice}>
                        {currencySymbol}{product.salePrice || product.price}
                      </Text>
                      {product.salePrice && product.price > product.salePrice && (
                        <Text style={styles.productOriginalPrice}>
                          {currencySymbol}{product.price}
                        </Text>
                      )}
                    </View>
                    {product.cashbackPercent && product.cashbackPercent > 0 && (
                      <View style={styles.cashbackBadge}>
                        <Text style={styles.cashbackText}>
                          {product.cashbackPercent}% Cashback
                        </Text>
                      </View>
                    )}
                  </View>
                  <Pressable
                    style={styles.addToCartButton}
                    onPress={() => handleAddToCart(product)}
                   
                  >
                    <Ionicons name="add" size={20} color={Colors.text.inverse} />
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  errorText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  backButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius['2xl'],
  },
  backButtonText: {
    color: Colors.background.primary,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
  },
  creatorInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  creatorName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  followButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.sm,
  },
  followButtonText: {
    color: Colors.background.primary,
    ...Typography.body,
    fontWeight: '600',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
    backgroundColor: Colors.background.secondary,
    position: 'relative',
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    zIndex: 10,
  },
  mainImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[200],
  },
  hiddenImage: {
    opacity: 0,
  },
  noImageFallback: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  noImageText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  productCountBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: 6,
  },
  productCountText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  engagementSection: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: Spacing.xs,
    marginRight: Spacing.base,
  },
  actionSpacer: {
    flex: 1,
  },
  likesCount: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  captionSection: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  captionText: {
    ...Typography.body,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  captionUsername: {
    fontWeight: '600',
  },
  viewsText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  productsSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  productsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  productsSectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  productsScrollContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  productCard: {
    width: 160,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginRight: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  productImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.background.secondary,
  },
  productInfo: {
    padding: Spacing.md,
  },
  productName: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 6,
    lineHeight: 18,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  productPrice: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.success,
  },
  productOriginalPrice: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  cashbackBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  cashbackText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.success,
  },
  addToCartButton: {
    position: 'absolute',
    bottom: 68,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});

export default withErrorBoundary(ImageDetailScreen, 'ImageDetailScreen');
