// @ts-nocheck
import React, { useCallback, useRef, useState, memo, useEffect } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  ListRenderItemInfo,
  ViewToken,
  Platform,
  ScrollView,
  Linking} from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolateColor,
  SharedValue,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from '@expo/vector-icons/Ionicons';
import { triggerImpact, triggerNotification } from "@/utils/haptics";
import { GlassCard } from "@/components/ui";
import { ThemedText } from "@/components/ThemedText";
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';
import { safeCallPhone, safeOpenURL } from '@/utils/linking';
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
  IconSize,
  Timing,
  Typography,
  Gradients,
} from "@/constants/DesignSystem";

interface ProductImage {
  id: string;
  uri: string;
}

interface ProductDisplayProps {
  images?: ProductImage[];
  onSharePress?: () => void;
  onFavoritePress?: () => void;
  isFavorited?: boolean;
  // New Magicpin-inspired props
  rating?: number;
  reviewCount?: number;
  categoryTags?: string[];
  phoneNumber?: string;
  locationCoords?: { lat: number; lng: number };
  onDirectionsPress?: () => void;
  onCallPress?: () => void;
}

const DEFAULT_IMAGES: ProductImage[] = [];

// PaginationDot with reanimated for width + backgroundColor
const ProductPaginationDot: React.FC<{
  index: number;
  activeIndex: SharedValue<number>;
  totalCount: number;
}> = memo(({ index, activeIndex, totalCount }) => {
  const dotStyle = useAnimatedStyle(() => {
    const isActive = activeIndex.value === index ? 1 : 0;
    return {
      width: withSpring(isActive ? 24 : 8, { damping: 15, stiffness: 120 }),
      backgroundColor: interpolateColor(
        isActive,
        [0, 1],
        ['rgba(255,255,255,0.5)', colors.lightMustard],
      ),
    };
  });

  return (
    <ReAnimated.View
      style={[productDotBaseStyle, dotStyle]}
      accessibilityLabel={`Image ${index + 1} of ${totalCount}`}
    />
  );
});

const productDotBaseStyle = {
  height: 8,
  borderRadius: 4,
};

export default memo(function ProductDisplay({
  images: imagesProp = DEFAULT_IMAGES,
  onSharePress,
  onFavoritePress,
  isFavorited = false,
  // New Magicpin-inspired props
  rating,
  reviewCount,
  categoryTags = [],
  phoneNumber,
  locationCoords,
  onDirectionsPress,
  onCallPress,
}: ProductDisplayProps) {
  // Use default images when empty array is passed
  const images = imagesProp.length > 0 ? imagesProp : DEFAULT_IMAGES;

  const { width } = Dimensions.get("window");
  const isTablet = width >= 768;
  const imageCardWidth = Math.round(width * (isTablet ? 0.7 : 0.92));
  // Reduced height ratio for less whitespace - edge-to-edge look
  const imageHeight = Math.round(imageCardWidth * (isTablet ? 0.7 : 0.8));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const flatRef = useRef<FlashList<any> | null>(null);

  // Format rating display
  const formattedRating = rating ? rating.toFixed(1) : null;
  const formattedReviewCount = reviewCount
    ? reviewCount >= 1000
      ? `${(reviewCount / 1000).toFixed(1)}K`
      : reviewCount.toString()
    : null;

  // Animation refs for micro-interactions
  const shareScaleAnim = useSharedValue(1);
  const favoriteScaleAnim = useSharedValue(1);
  const imageScaleAnim = useSharedValue(1);

  // Pulse animation for favorited heart
  const heartPulseAnim = useSharedValue(1);

  // Animated pagination dots (reanimated)
  const activeDotIndex = useSharedValue(0);

  // CTA button animations
  const directionsScaleAnim = useSharedValue(1);
  const callScaleAnim = useSharedValue(1);

  // Category tag entrance animations — use simple state-based opacity
  const [tagsVisible, setTagsVisible] = useState(false);

  // Category icon mapping
  const getCategoryIcon = (tag: string): keyof typeof Ionicons.glyphMap => {
    const lowerTag = tag.toLowerCase();
    if (lowerTag.includes('coffee') || lowerTag.includes('cafe')) return 'cafe-outline';
    if (lowerTag.includes('art')) return 'color-palette-outline';
    if (lowerTag.includes('food') || lowerTag.includes('restaurant') || lowerTag.includes('dining')) return 'restaurant-outline';
    if (lowerTag.includes('local')) return 'location-outline';
    if (lowerTag.includes('fashion') || lowerTag.includes('clothing')) return 'shirt-outline';
    if (lowerTag.includes('beauty') || lowerTag.includes('spa')) return 'sparkles-outline';
    if (lowerTag.includes('health') || lowerTag.includes('fitness')) return 'fitness-outline';
    if (lowerTag.includes('grocery')) return 'cart-outline';
    return 'pricetag-outline';
  };

  // Heart pulse animation effect
  useEffect(() => {
    if (isFavorited) {
      heartPulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400 }),
          withTiming(1, { duration: 400 }),
        ),
        -1,
      );
    } else {
      heartPulseAnim.value = 1;
    }
  }, [isFavorited]);

  // Animate pagination dots on index change (reanimated)
  useEffect(() => {
    activeDotIndex.value = currentIndex;
  }, [currentIndex]);

  // Staggered entrance animation for category tags
  useEffect(() => {
    if (categoryTags.length > 0) {
      const timer = setTimeout(() => setTagsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [categoryTags]);

  // viewability config + callback to track current index reliably
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems && viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      setCurrentIndex(idx);
    }
  }).current;

  const handleImageError = useCallback((imageId: string) => {
    setImageErrors(prev => new Set(prev).add(imageId));
  }, []);

  // Animation helper
  const animateScale = useCallback((animValue: SharedValue<number>, toValue: number) => {
    animValue.value = withSpring(toValue);
  }, []);

  // Handlers with haptic feedback
  const handleSharePress = useCallback(() => {
    triggerImpact('Medium');
    if (onSharePress) onSharePress();
  }, [onSharePress]);

  const handleFavoritePress = useCallback(() => {
    triggerImpact('Medium');
    if (onFavoritePress) onFavoritePress();
  }, [onFavoritePress]);

  // New handlers for Magicpin-style actions
  const handleDirectionsPress = useCallback(() => {
    triggerImpact('Medium');
    if (onDirectionsPress) {
      onDirectionsPress();
    } else if (locationCoords) {
      const url = Platform.select({
        ios: `maps:0,0?q=${locationCoords.lat},${locationCoords.lng}`,
        android: `geo:${locationCoords.lat},${locationCoords.lng}?q=${locationCoords.lat},${locationCoords.lng}`,
        default: `https://www.google.com/maps/search/?api=1&query=${locationCoords.lat},${locationCoords.lng}`,
      });
      try { safeOpenURL(url); } catch (e) { catchAndWarn(e, 'ProductDisplay/openURL'); }
    }
  }, [onDirectionsPress, locationCoords]);

  const handleCallPress = useCallback(() => {
    triggerImpact('Medium');
    if (onCallPress) {
      onCallPress();
    } else if (phoneNumber) {
      try { safeCallPhone(phoneNumber); } catch (e) { catchAndWarn(e, 'ProductDisplay/openURL'); }
    }
  }, [onCallPress, phoneNumber]);

  const renderImage = useCallback(
    ({ item }: ListRenderItemInfo<ProductImage>) => {
      const hasError = imageErrors.has(item.id);
      const fallbackUri = DEFAULT_IMAGES[0]?.uri;

      return (
        <View style={[styles.imageWrapper, { width }]}>
          <View style={[styles.imageCard, { width: imageCardWidth, height: imageHeight }]}>
            <CachedImage
              source={hasError ? fallbackUri : item.uri}
              style={[styles.image, { width: imageCardWidth, height: imageHeight }]}
              contentFit="cover"
              onError={() => handleImageError(item.id)}
              defaultSource={require('@/assets/images/icon.png')}
            />
            {/* Gradient Overlay for Depth */}
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.4)']}
              style={[styles.imageGradientOverlay, { pointerEvents: 'none' }]}
            />
            {hasError && (
              <View style={styles.errorOverlay}>
                <Ionicons name="image-outline" size={48} color={Colors.gray[400]} />
              </View>
            )}
          </View>
        </View>
      );
    },
    [imageCardWidth, imageHeight, width, imageErrors, handleImageError]
  );

  return (
    <View
      style={styles.container}
      accessibilityLabel="Product image gallery"
    >
      <FlashList
        ref={flatRef}
        data={images}
        keyExtractor={(i) => i.id}
        renderItem={renderImage}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={width}
        decelerationRate={Platform.OS === "ios" ? "fast" : 0.98}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        accessibilityLabel={`Product image carousel. Showing image ${currentIndex + 1} of ${images.length}`}
        accessibilityRole="list"
        estimatedItemSize={150}
      />

      {/* Share and Favorite buttons removed - now in header */}

      {/* Modern Animated Pagination Dots */}
      {images.length > 1 && (
        <View style={styles.pagination}>
          <View style={styles.paginationInner}>
            {images.map((_, i) => (
              <ProductPaginationDot
                key={i}
                index={i}
                activeIndex={activeDotIndex}
                totalCount={images.length}
              />
            ))}
          </View>
        </View>
      )}

    </View>
);
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
  imageWrapper: {
    justifyContent: "center",
    alignItems: "center",
    // Removed background color for cleaner look
  },
  imageCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    backgroundColor: Colors.gray[100],
    // Enhanced shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.gray[100],
    justifyContent: "center",
    alignItems: "center",
  },

  // Enhanced Glassmorphic Action Buttons
  actionCol: {
    position: "absolute",
    right: Spacing.lg,
    zIndex: 20,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  actionBtnShadow: {
    borderRadius: BorderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: Spacing.sm,
  },
  actionBtnGlow: {
    shadowColor: "#FF4757",
    shadowOpacity: 0.4,
  },
  actionBtn: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnTouchable: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },

  // Modern Animated Pagination Dots
  pagination: {
    position: "absolute",
    bottom: Spacing.lg,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  paginationInner: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  dotBase: {
    height: 8,
    borderRadius: 4,
  },

  // Rating Badge - Magicpin Style
  ratingBadgeContainer: {
    position: "absolute",
    bottom: 60,
    left: Spacing.lg,
    zIndex: 30,
  },
  ratingBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  ratingBadgeInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: "700",
  },
  ratingDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.gray[300],
    marginHorizontal: Spacing.xs,
  },
  reviewCountText: {
    ...Typography.bodySmall,
    color: Colors.gray[600],
  },

  // Category Tags - Compact Single Line
  categoryTagsContainer: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  categoryTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "nowrap",
    gap: 8,
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 205, 87, 0.2)",
    backgroundColor: "rgba(255, 205, 87, 0.06)",
    gap: 4,
  },
  categoryTagText: {
    fontSize: 11,
    color: "#00875A",
    fontWeight: "600",
  },

  // Quick Actions Bar - Left & Right with Center Gap
  quickActionsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  directionsButton: {
    width: 110,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  directionsButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 5,
  },
  directionsButtonText: {
    fontSize: 12,
    color: colors.background.primary,
    fontWeight: "600",
  },
  callButton: {
    width: 110,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    gap: 5,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255, 205, 87, 0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  callButtonText: {
    fontSize: 12,
    color: "#00875A",
    fontWeight: "600",
  },
});
