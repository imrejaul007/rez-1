// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Share, Platform, ScrollView, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { triggerImpact, triggerNotification } from "@/utils/haptics";
import { ThemedText } from '@/components/ThemedText';
import { useWishlist } from '@/contexts/WishlistContext';
import { useIsAuthenticated, useRezBalance, useWalletLoading } from '@/stores/selectors';
import wishlistApi from '@/services/wishlistApi';
import EnhancedCoinBadge from '@/components/product/EnhancedCoinBadge';
import AvailabilityBadge from '@/components/product/AvailabilityBadge';
import { ImageZoomModal } from '@/components/product/ImageZoomModal';
import {
  Colors,
  Spacing,
  BorderRadius,
  IconSize,
  Timing,
} from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';


interface StoreHeaderProps {
  dynamicData?: {
    id?: string;
    _id?: string;
    title?: string;
    name?: string;
    description?: string;
    image?: string;
    images?: (string | { url?: string })[];
    merchant?: string;
    category?: string;
    rating?: number;
    section?: string;
    inventory?: {
      stock?: number;
      isAvailable?: boolean;
    };
    store?: {
      logo?: string;
      [key: string]: any;
    };
    [key: string]: any;
  } | null;
  cardType?: string;
  /** Whether the product is available in-store */
  isInStore?: boolean;
  /** Show/hide the product image section */
  showImage?: boolean;
  /** Show/hide the header bar (back, coins, actions) */
  showHeaderBar?: boolean;
}

function StoreHeader({
  dynamicData,
  cardType,
  isInStore = true,
  showImage = true,
  showHeaderBar = true,
}: StoreHeaderProps) {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { refreshWishlist } = useWishlist();
  const isAuthenticated = useIsAuthenticated();
  const coinCount = useRezBalance();
  const isLoadingCoins = useWalletLoading();

  // Wishlist state
  const [isSaved, setIsSaved] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);

  // Animation refs
  const backScaleAnim = useSharedValue(1);
  const shareScaleAnim = useSharedValue(1);
  const cartScaleAnim = useSharedValue(1);
  const heartScaleAnim = useSharedValue(1);
  const backScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: backScaleAnim.value }] }));
  const shareScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: shareScaleAnim.value }] }));
  const cartScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: cartScaleAnim.value }] }));
  const heartScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScaleAnim.value }] }));

  // Get product ID
  const productId = dynamicData?.id || dynamicData?._id;

  // Check wishlist status function
  const checkWishlistStatus = useCallback(async () => {
    if (!isAuthenticated || !productId) return;

    try {
      const response = await wishlistApi.checkWishlistStatus('product', productId);
      if (response.success && response.data?.inWishlist) {
        setIsSaved(true);
        return;
      }
      if (!isMounted()) return;
      setIsSaved(false);
    } catch (error) {
      if (!isMounted()) return;
      setIsSaved(false);
    }
  }, [productId, isAuthenticated]);

  useEffect(() => {
    checkWishlistStatus();
  }, [checkWishlistStatus]);

  useFocusEffect(
    useCallback(() => {
      checkWishlistStatus();
    }, [checkWishlistStatus])
  );

  // Handlers
  const handleBackPress = () => {
    triggerImpact('Medium');
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleSharePress = async () => {
    triggerImpact('Light');
    try {
      const productName = dynamicData?.title || dynamicData?.name || 'Check this out!';
      await Share.share({
        message: `Check out ${productName} on our app!`,
        title: productName,
      });
    } catch (error) {
      // silently handle
    }
  };

  const handleCartPress = () => {
    triggerImpact('Light');
    router.push('/cart');
  };

  const handleCoinPress = () => {
    triggerImpact('Light');
    router.push('/coins');
  };

  const handleFavoritePress = useCallback(async () => {
    triggerImpact('Medium');

    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }

    if (!productId) {
      return;
    }

    setIsWishlistLoading(true);

    try {
      if (isSaved) {
        const response = await wishlistApi.removeFromWishlist('product', productId);
        if (response.success) {
          setIsSaved(false);
          triggerNotification('Success');
          await refreshWishlist();
        }
      } else {
        const response = await wishlistApi.addToWishlist({
          itemId: productId,
          itemType: 'product',
        });
        if (response.success) {
          if (!isMounted()) return;
          setIsSaved(true);
          triggerNotification('Success');
          await refreshWishlist();
        }
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsWishlistLoading(false);
    }
  }, [isAuthenticated, productId, isSaved, refreshWishlist, router]);

  // Animation helper
  const animateScale = (animValue: { value: number }, toValue: number) => {
    animValue.value = withSpring(toValue);
  };

  // Image slider state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const imageScrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = Dimensions.get('window');
  const imageWidth = screenWidth - 32; // Account for margins

  // Validate image URL
  const isValidImageUrl = (url: string | undefined): boolean => {
    if (!url || url.trim() === '') return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Get ALL image URLs from various possible sources
  const getAllImageUrls = (): string[] => {
    const urls: string[] = [];

    // Check direct image field
    if (isValidImageUrl(dynamicData?.image)) {
      urls.push(dynamicData.image!);
    }

    // Check images array
    if (dynamicData?.images && dynamicData.images.length > 0) {
      dynamicData.images.forEach((img: any) => {
        const imgUrl = typeof img === 'string' ? img : img?.url;
        if (isValidImageUrl(imgUrl) && !urls.includes(imgUrl)) {
          urls.push(imgUrl);
        }
      });
    }

    // Check store logo as fallback if no images
    if (urls.length === 0 && isValidImageUrl(dynamicData?.store?.logo)) {
      urls.push(dynamicData.store.logo!);
    }

    return urls;
  };

  const allImages = getAllImageUrls();
  const hasMultipleImages = allImages.length > 1;

  // Handle image scroll
  const handleImageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / imageWidth);
    if (index !== currentImageIndex && index >= 0 && index < allImages.length) {
      setCurrentImageIndex(index);
    }
  };

  // Handle pagination dot press
  const handleDotPress = (index: number) => {
    triggerImpact('Light');
    setCurrentImageIndex(index);
    imageScrollRef.current?.scrollTo({ x: index * imageWidth, animated: true });
  };

  return (
    <View style={styles.container}>
      {/* Header Bar - Above the image */}
      {showHeaderBar && (
      <View style={styles.headerBar}>
        {/* Left - Back button */}
        <Animated.View style={backScaleStyle}>
          <Pressable
            style={styles.iconBtn}
            onPress={handleBackPress}
            onPressIn={() => animateScale(backScaleAnim, 0.9)}
            onPressOut={() => animateScale(backScaleAnim, 1)}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color={colors.neutral[700]} />
          </Pressable>
        </Animated.View>

        {/* Center - Enhanced Coin Badge */}
        {!isLoadingCoins ? (
          <EnhancedCoinBadge
            coinCount={coinCount}
            onPress={handleCoinPress}
            size="medium"
          />
        ) : (
          <View style={styles.coinBadgeLoading}>
            <ActivityIndicator size="small" color={colors.lightMustard} />
          </View>
        )}

        {/* Right - Action buttons */}
        <View style={styles.rightActions}>
          {/* Share Button */}
          <Animated.View style={shareScaleStyle}>
            <Pressable
              style={styles.iconBtn}
              onPress={handleSharePress}
              onPressIn={() => animateScale(shareScaleAnim, 0.9)}
              onPressOut={() => animateScale(shareScaleAnim, 1)}
              accessibilityLabel="Share"
              accessibilityRole="button"
            >
              <Ionicons name="share-outline" size={18} color={colors.neutral[700]} />
            </Pressable>
          </Animated.View>

          {/* Cart Button */}
          <Animated.View style={cartScaleStyle}>
            <Pressable
              style={styles.iconBtn}
              onPress={handleCartPress}
              onPressIn={() => animateScale(cartScaleAnim, 0.9)}
              onPressOut={() => animateScale(cartScaleAnim, 1)}
              accessibilityLabel="Cart"
              accessibilityRole="button"
            >
              <Ionicons name="bag-outline" size={18} color={colors.neutral[700]} />
            </Pressable>
          </Animated.View>

          {/* Heart/Wishlist Button */}
          <Animated.View style={heartScaleStyle}>
            <Pressable
              style={[
                styles.iconBtn,
                isSaved && styles.heartBtnActive
              ]}
              onPress={handleFavoritePress}
              onPressIn={() => animateScale(heartScaleAnim, 0.9)}
              onPressOut={() => animateScale(heartScaleAnim, 1)}
              disabled={isWishlistLoading}
              accessibilityLabel={isSaved ? "Remove from wishlist" : "Add to wishlist"}
              accessibilityRole="button"
            >
              {isWishlistLoading ? (
                <ActivityIndicator size="small" color={colors.lightPeach} />
              ) : (
                <Ionicons
                  name={isSaved ? "heart" : "heart-outline"}
                  size={18}
                  color={isSaved ? colors.lightPeach : colors.neutral[700]}
                />
              )}
            </Pressable>
          </Animated.View>
        </View>
      </View>
      )}

      {/* Product Image Slider - Below the header */}
      {showImage && (
        <View style={styles.imageContainer}>
          {allImages.length > 0 ? (
            <>
              <ScrollView
                ref={imageScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleImageScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={imageWidth}
                snapToAlignment="center"
                contentContainerStyle={{ width: imageWidth * allImages.length }}
              >
                {allImages.map((imageUrl, index) => (
                  <Pressable
                    key={index}
                   
                    onPress={() => {
                      triggerImpact('Light');
                      setShowZoomModal(true);
                    }}
                  >
                    <CachedImage
                      source={{ uri: imageUrl }}
                      style={[styles.productImage, { width: imageWidth }]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </Pressable>
                ))}
              </ScrollView>

              {/* Pagination Dots */}
              {hasMultipleImages && (
                <View style={styles.paginationContainer}>
                  {allImages.map((_, index) => (
                    <Pressable
                      key={index}
                      onPress={() => handleDotPress(index)}
                      style={[
                        styles.paginationDot,
                        index === currentImageIndex && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Image Counter */}
              {hasMultipleImages && (
                <View style={styles.imageCounter}>
                  <ThemedText style={styles.imageCounterText}>
                    {currentImageIndex + 1}/{allImages.length}
                  </ThemedText>
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholderContainer}>
              <LinearGradient
                colors={['rgba(255, 205, 87, 0.1)', 'rgba(255, 205, 87, 0.05)']}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="image-outline" size={56} color={colors.lightMustard} />
              <ThemedText style={styles.placeholderText}>No Image</ThemedText>
            </View>
          )}

          {/* Availability Badge - Top left */}
          {isInStore && (
            <View style={styles.availabilityBadgeContainer}>
              <AvailabilityBadge
                status="in-store"
                label="In-Store Available"
              />
            </View>
          )}

          {/* Bottom gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)']}
            style={[styles.bottomGradient, { pointerEvents: 'none' }]}
          />

          {/* Store Badge - Bottom left */}
          <View style={styles.storeBadge}>
            <Ionicons name="storefront" size={18} color={colors.lightMustard} />
          </View>

          {/* Zoom hint - Bottom right */}
          {allImages.length > 0 && (
            <Pressable
              style={styles.zoomHint}
              onPress={() => {
                triggerImpact('Light');
                setShowZoomModal(true);
              }}
              accessibilityLabel="Tap to zoom"
              accessibilityRole="button"
            >
              <Ionicons name="expand-outline" size={16} color={colors.background.primary} />
            </Pressable>
          )}
        </View>
      )}

      {/* Image Zoom Modal */}
      {allImages.length > 0 && (
        <ImageZoomModal
          visible={showZoomModal}
          onClose={() => setShowZoomModal(false)}
          images={allImages}
          initialIndex={currentImageIndex}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
  },

  // Header bar - separate from image
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 12,
    paddingBottom: 12,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },

  // Icon button style
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },

  heartBtnActive: {
    backgroundColor: colors.errorScale[50],
    borderColor: colors.errorScale[200],
  },

  // Coin badge loading state
  coinBadgeLoading: {
    height: 34,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Right actions
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Image container
  imageContainer: {
    position: 'relative',
    height: 340,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  // Availability badge position
  availabilityBadgeContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },

  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderText: {
    fontSize: 14,
    color: colors.lightMustard,
    marginTop: 8,
    fontWeight: '500',
  },

  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },

  // Store badge
  storeBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  zoomHint: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Pagination dots for image slider
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },

  paginationDotActive: {
    width: 24,
    backgroundColor: colors.lightMustard,
    borderRadius: 4,
  },

  // Image counter badge
  imageCounter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  imageCounterText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default withErrorBoundary(React.memo(StoreHeader), 'StoreSectionStoreHeader');
