// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * UGCSection v3.0 - Modernized with Design System & Haptic Feedback
 *
 * Features:
 * - Design System integration for consistent styling
 * - Haptic feedback on all interactions
 * - Modern glassmorphism effects
 * - Purple-tinted shimmer loading states
 * - 8px grid spacing system
 */

import React, { useRef, useState, useCallback, useEffect, useMemo, memo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { triggerImpact, triggerNotification } from "@/utils/haptics";
import { ThemedText } from '@/components/ThemedText';
import { ShimmerSkeleton } from '@/components/ui';
import ugcApi, { UGCMedia } from '@/services/ugcApi';
import { realVideosApi } from '@/services/realVideosApi';
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
  IconSize,
  Timing,
  Gradients,
  Typography,
} from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

// Optional (recommended) — enable silent autoplay on iOS in your app root
// import { Audio } from 'expo-av';
// useEffect(() => {
//   Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });
// }, []);

// Transform UGCMedia from API to UGCImage format for component
interface UGCImage {
  id: string;
  uri?: string; // fallback image
  videoUrl?: string; // MP4/HLS
  viewCount: string;
  description: string;
  shortDescription?: string;
  readMoreUrl?: string;
  category?: string;
  author?: string;

  // Product plate
  productTitle?: string;
  productPrice?: string;
  productThumb?: string;

  // Like/Bookmark state
  likes?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

interface UGCSectionProps {
  title?: string;
  storeId?: string; // Store ID to fetch UGC content
  images?: UGCImage[]; // Optional override for custom images (store videos)
  onViewAllPress?: () => void;
  onImagePress?: (imageId: string) => void;
  onReadMorePress?: (imageId: string, url?: string) => void;
  cardAspectRatio?: number; // width/height
  showDescriptions?: boolean; // usually false for this visual
  maxDescriptionLength?: number;
}

// Transform API UGCMedia to component UGCImage format
const transformUGCMedia = (media: UGCMedia): UGCImage => {
  const formatViewCount = (views: number): string => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return {
    id: media._id,
    uri: media.type === 'photo' ? media.url : media.thumbnail,
    videoUrl: media.type === 'video' ? media.url : undefined,
    viewCount: formatViewCount(media.views),
    description: media.caption || '',
    category: media.relatedProduct?.name || media.relatedStore?.name,
    author: `${media.user.profile.firstName} ${media.user.profile.lastName}`,
    productTitle: media.relatedProduct?.name,
    productPrice: '', // Price not included in UGC
    productThumb: media.relatedProduct?.image || media.relatedStore?.logo,
    likes: media.likes,
    isLiked: media.isLiked,
    isBookmarked: media.isBookmarked,
  };
};

// No default images - will fetch from API or use empty state

interface UGCCardProps {
  item: UGCImage;
  cardWidth: number;
  cardHeight: number;
  showDescriptions: boolean;
  maxDescriptionLength: number;
  visibleItems: string[];
  typography: any;
  onImagePress?: (imageId: string) => void;
  onReadMorePress: (item: UGCImage) => void;
  onLikePress?: (item: UGCImage) => void;
  onBookmarkPress?: (item: UGCImage) => void;
  getTruncatedDescription: (description: string, maxLength: number) => string;
  needsTruncation: (description: string, maxLength: number) => boolean;
}

/**
 * UGCCard - memoized to avoid re-renders
 */
const UGCCard = memo(function UGCCard({
  item,
  cardWidth,
  cardHeight,
  typography,
  showDescriptions,
  maxDescriptionLength,
  visibleItems,
  onImagePress,
  onReadMorePress,
  onLikePress,
  onBookmarkPress,
  getTruncatedDescription,
  needsTruncation,
}: UGCCardProps) {
  const displayDescription = item.shortDescription || getTruncatedDescription(item.description, maxDescriptionLength);
  const showReadMore = needsTruncation(item.description, maxDescriptionLength) && !item.shortDescription;

  const scaleAnim = useSharedValue(1);
  const likeScaleAnim = useSharedValue(1);
  const bookmarkScaleAnim = useSharedValue(1);
  const cardScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleAnim.value }] }));
  const likeScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScaleAnim.value }] }));
  const bookmarkScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: bookmarkScaleAnim.value }] }));
  const videoRef = useRef<Video | null>(null);

  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Release native video resources on unmount
  useEffect(() => {
    return () => {
      videoRef.current?.unloadAsync();
    };
  }, []);

  // Visible means we should mount and play media
  const isVisible = visibleItems.includes(item.id);
  const shouldLoadMedia = isVisible;

  // Press animations with haptic feedback
  const handlePressIn = () => {
    triggerImpact('Light');

    if (Platform.OS === 'ios') {
      scaleAnim.value = 0.98;
    } else {
      scaleAnim.value = withSpring(0.98, { ...Timing.springBouncy });
    }
  };

  const handlePressOut = () => {
    if (Platform.OS === 'ios') {
      scaleAnim.value = 1;
    } else {
      scaleAnim.value = withSpring(1, { ...Timing.springBouncy });
    }
  };

  const handleImagePress = () => {
    triggerImpact('Medium');
    onImagePress?.(item.id);
  };

  // Like button handler with animation & haptic feedback
  const handleLikePress = () => {
    triggerImpact('Medium');

    likeScaleAnim.value = withSequence(
      withTiming(0.8, { duration: Timing.fast }),
      withSpring(1, { ...Timing.springBouncy }),
    );
    onLikePress?.(item);
  };

  // Bookmark button handler with animation & haptic feedback
  const handleBookmarkPress = () => {
    triggerImpact('Medium');

    bookmarkScaleAnim.value = withSequence(
      withTiming(0.8, { duration: Timing.fast }),
      withSpring(1, { ...Timing.springBouncy }),
    );
    onBookmarkPress?.(item);
  };

  // Format like count (1.2K, 5.3M)
  const formatLikeCount = (count: number = 0): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Debug: indicate whether Video component exists
  useEffect(() => {

  }, [isVisible, item.id]);

  return (
    <Pressable
      onPress={handleImagePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
     
      accessibilityLabel={`${item.category || 'Content'} by ${item.author || 'creator'}. ${item.viewCount} views. ${displayDescription}`}
      accessibilityRole="button"
      accessibilityHint="Tap to view full content details"
    >
      <Animated.View style={[styles.cardContainer, { width: cardWidth, height: cardHeight }, cardScaleStyle]}>
        {shouldLoadMedia ? (
          item.videoUrl ? (
            <>
              <Video
                ref={videoRef}
                source={item.videoUrl}
                style={styles.cardMedia}
                resizeMode={ResizeMode.COVER}
                isLooping
                shouldPlay={isVisible} // autoplay when visible
                isMuted // muted for autoplay policies
                useNativeControls={false}
                onLoadStart={() => {
                  setMediaLoading(true);
                  setMediaError(null);

                }}
                onLoad={() => {
                  setMediaLoading(false);

                }}
                onError={(e) => {
                  setMediaLoading(false);
                  setMediaError(String(e));
                   
                }}
                onPlaybackStatusUpdate={(status) => {
                  if (!status) return;
                }}
                progressUpdateIntervalMillis={400}
              />

              {mediaLoading && !mediaError && (
                <View style={styles.skeletonOverlay}>
                  <LinearGradient colors={[colors.neutral[100], colors.neutral[200], colors.neutral[100]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.skeletonGradient} />
                  <ActivityIndicator size="large" color={colors.lightMustard} style={styles.skeletonSpinner} />
                </View>
              )}
            </>
          ) : (
            <>
              <CachedImage
                source={item.uri}
                style={styles.cardMedia}
                contentFit="cover"
                defaultSource={require('@/assets/images/icon.png')}
                loadingIndicatorSource={require('@/assets/images/icon.png')}
                onLoadStart={() => {
                  setMediaLoading(true);
                  setMediaError(null);
                }}
                onLoadEnd={() => setMediaLoading(false)}
                onError={() => {
                  setMediaLoading(false);
                  setMediaError('image');
                }}
              />
              {mediaLoading && !mediaError && (
                <View style={styles.skeletonOverlay}>
                  <LinearGradient colors={[colors.neutral[100], colors.neutral[200], colors.neutral[100]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.skeletonGradient} />
                  <ActivityIndicator size="large" color={colors.lightMustard} style={styles.skeletonSpinner} />
                </View>
              )}
            </>
          )
        ) : (
          // Off-screen placeholder (lightweight)
          <View style={styles.cardMedia} />
        )}

        {mediaError && (
          <View style={styles.errorOverlay}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.neutral[400]} />
          </View>
        )}

        {/* Gradient for readability */}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']} style={styles.gradientOverlay} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />

        {/* View count badge */}
        <View style={styles.viewCountContainer}>
          <View style={styles.viewCountBadge}>
            <Ionicons name="eye" size={14} color={colors.background.primary} style={styles.eyeIcon} />
            <ThemedText style={[styles.viewCountText, { fontSize: typography.viewCountText }]}>{item.viewCount}</ThemedText>
          </View>
        </View>

        {/* Like & Bookmark buttons */}
        <View style={styles.actionsContainer}>
          {/* Like button */}
          <Pressable
            onPress={handleLikePress}
           
            style={styles.actionButton}
            accessibilityLabel={`${item.isLiked ? 'Unlike' : 'Like'} this content. ${formatLikeCount(item.likes || 0)} likes`}
            accessibilityRole="button"
            accessibilityHint="Double tap to like or unlike"
          >
            <Animated.View style={likeScaleStyle}>
              <Ionicons
                name={item.isLiked ? 'heart' : 'heart-outline'}
                size={22}
                color={item.isLiked ? colors.lightPeach : colors.background.primary}
                style={styles.actionIcon}
              />
            </Animated.View>
            {(item.likes || 0) > 0 && (
              <ThemedText style={styles.likeCountText}>{formatLikeCount(item.likes || 0)}</ThemedText>
            )}
          </Pressable>

          {/* Bookmark button */}
          <Pressable
            onPress={handleBookmarkPress}
           
            style={styles.actionButton}
            accessibilityLabel={`${item.isBookmarked ? 'Remove bookmark' : 'Bookmark'} this content`}
            accessibilityRole="button"
            accessibilityHint="Double tap to bookmark or unbookmark"
          >
            <Animated.View style={bookmarkScaleStyle}>
              <Ionicons
                name={item.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={item.isBookmarked ? colors.lightMustard : colors.background.primary}
                style={styles.actionIcon}
              />
            </Animated.View>
          </Pressable>
        </View>

        {/* Product plate (bottom) - Only show if we have product info */}
        {(item.productTitle || item.productThumb) && (
          <View style={styles.productPlateWrapper}>
            <View style={styles.productPlate}>
              {item.productThumb && (
                <CachedImage
                  source={item.productThumb}
                  style={styles.productThumb}
                  defaultSource={require('@/assets/images/icon.png')}
                />
              )}
              <View style={{ flex: 1, marginLeft: item.productThumb ? 10 : 0 }}>
                <ThemedText numberOfLines={1} style={styles.productTitle}>
                  {item.productTitle || item.category || ''}
                </ThemedText>
                {item.productPrice && (
                  <ThemedText style={styles.productPrice}>{item.productPrice}</ThemedText>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Optional description/read more (usually hidden) */}
        {showDescriptions && (
          <View style={styles.contentArea}>
            <ThemedText style={[styles.descriptionText, { fontSize: typography.descriptionText }]} numberOfLines={2}>
              {displayDescription}
            </ThemedText>
            {showReadMore && (
              <Pressable onPress={() => onReadMorePress(item)} style={styles.readMoreButton}>
                <ThemedText style={[styles.readMoreText, { fontSize: typography.readMoreText }]}>Read more</ThemedText>
              </Pressable>
            )}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

function UGCSection({
  title = 'UGC',
  storeId,
  images: propImages,
  onViewAllPress,
  onImagePress,
  onReadMorePress,
  cardAspectRatio = 9 / 16, // tall portrait
  showDescriptions = false,
  maxDescriptionLength = 120,
}: UGCSectionProps) {
  const isMounted = useIsMounted();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;
  const isSmallPhone = width < 375;

  // API State Management
  const [ugcContent, setUgcContent] = useState<UGCImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Combine store videos (propImages) with user-generated content (ugcContent)
  const images = useMemo(() => {
    const combined = [];

    // Add store videos first (if any)
    if (propImages && propImages.length > 0) {
      combined.push(...propImages);
    }

    // Add user-generated content (if any)
    if (ugcContent && ugcContent.length > 0) {
      combined.push(...ugcContent);
    }

    return combined;
  }, [propImages, ugcContent]);

  // Fetch UGC content from API
  const fetchUGCContent = useCallback(async (isRefresh = false) => {
    if (!storeId) {
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await ugcApi.getStoreContent(storeId!, {
        limit: 20,
        offset: 0,
      });

      if (response.success && response.data?.content) {
        const transformedContent = response.data.content.map(transformUGCMedia);
        if (!isMounted()) return;
        setUgcContent(transformedContent);
      } else {
        if (!isMounted()) return;
        setUgcContent([]); // Set empty array instead of error
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (!isMounted()) return;
      setError(errorMessage);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [storeId]); // propImages removed to prevent infinite loop if parent passes unstable reference

  // Load UGC content on mount
  useEffect(() => {
    fetchUGCContent();
  }, [fetchUGCContent]);

  // Refresh content when screen comes into focus (sync state after navigating back)
  useFocusEffect(
    useCallback(() => {
      // Only refetch if we already have content (not initial load)
      if (ugcContent.length > 0 || (propImages && propImages.length > 0)) {
        fetchUGCContent(true); // Silent refresh
      }
    }, [fetchUGCContent, ugcContent.length, propImages])
  );

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    fetchUGCContent(true);
  }, [fetchUGCContent]);

  // Handle like press
  const handleLikePress = useCallback(async (item: UGCImage) => {
    try {
      // Optimistic update
      setUgcContent(prev =>
        prev.map(ugc =>
          ugc.id === item.id
            ? {
                ...ugc,
                isLiked: !ugc.isLiked,
                likes: (ugc.likes || 0) + (ugc.isLiked ? -1 : 1)
              }
            : ugc
        )
      );

      // Call API
      const response = await ugcApi.toggleLike(item.id);

      if (!response.success) {
        // Revert on failure
        if (!isMounted()) return;
        setUgcContent(prev =>
          prev.map(ugc =>
            ugc.id === item.id
              ? {
                  ...ugc,
                  isLiked: item.isLiked,
                  likes: item.likes
                }
              : ugc
          )
        );
      }
    } catch (err) {
      // Revert on error
      if (!isMounted()) return;
      setUgcContent(prev =>
        prev.map(ugc =>
          ugc.id === item.id
            ? {
                ...ugc,
                isLiked: item.isLiked,
                likes: item.likes
              }
            : ugc
        )
      );
    }
  }, []);

  // Handle bookmark press
  const handleBookmarkPress = useCallback(async (item: UGCImage) => {
    try {
      // Optimistic update
      setUgcContent(prev =>
        prev.map(ugc =>
          ugc.id === item.id
            ? { ...ugc, isBookmarked: !ugc.isBookmarked }
            : ugc
        )
      );

      // Call real videos API for bookmark
      const response = await realVideosApi.toggleBookmark(item.id);

      if (!response.success && !response.data) {
        // Revert on failure
        if (!isMounted()) return;
        setUgcContent(prev =>
          prev.map(ugc =>
            ugc.id === item.id
              ? { ...ugc, isBookmarked: item.isBookmarked }
              : ugc
          )
        );
      } else {
        // Update with actual state from server
        const newBookmarkState = response.data?.isBookmarked;
        if (newBookmarkState !== undefined) {
          setUgcContent(prev =>
            prev.map(ugc =>
              ugc.id === item.id
                ? { ...ugc, isBookmarked: newBookmarkState }
                : ugc
            )
          );
        }
      }
    } catch (err) {
      // Revert on error
      if (!isMounted()) return;
      setUgcContent(prev =>
        prev.map(ugc =>
          ugc.id === item.id
            ? { ...ugc, isBookmarked: item.isBookmarked }
            : ugc
        )
      );
    }
  }, []);

  const getCardDimensions = () => {
    let cardsPerView: number;
    let horizontalPadding: number;

    if (isLargeTablet) {
      cardsPerView = 3.2;
      horizontalPadding = 28;
    } else if (isTablet) {
      cardsPerView = 2.6;
      horizontalPadding = 24;
    } else if (isSmallPhone) {
      cardsPerView = 1.7;
      horizontalPadding = 18;
    } else {
      cardsPerView = 2.0;
      horizontalPadding = 20;
    }

    const availableWidth = width - horizontalPadding * 2;
    const cardWidth = availableWidth / cardsPerView;
    const cardHeight = cardWidth / cardAspectRatio;
    return { cardWidth, cardHeight, horizontalPadding };
  };

  const { cardWidth, cardHeight, horizontalPadding } = getCardDimensions();
  const cardSpacing = isTablet ? 18 : isSmallPhone ? 12 : 14;

  const getTypographySizes = () => {
    if (isLargeTablet) {
      return { sectionTitle: 28, viewAllText: 16, descriptionText: 15, readMoreText: 14, viewCountText: 13 };
    } else if (isTablet) {
      return { sectionTitle: 26, viewAllText: 16, descriptionText: 15, readMoreText: 14, viewCountText: 12 };
    } else if (isSmallPhone) {
      return { sectionTitle: 20, viewAllText: 14, descriptionText: 13, readMoreText: 12, viewCountText: 11 };
    } else {
      return { sectionTitle: 24, viewAllText: 15, descriptionText: 14, readMoreText: 13, viewCountText: 12 };
    }
  };
  const typography = getTypographySizes();

  // Visibility tracking (stable identity for FlatList)
  const [visibleItems, setVisibleItems] = useState<string[]>([]);

  // memoize config so identity is stable across renders
  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 40, minimumViewTime: 150 }), []);

  // ref to hold the latest handler logic (updateable without changing callback identity)
  const viewableHandlerRef = useRef((info: { viewableItems: any[] }) => {
    const ids = info.viewableItems.map((v: any) => v.item.id);
    setVisibleItems(ids);
  });

  // keep the ref current (can include other dependencies if needed)
  useEffect(() => {
    viewableHandlerRef.current = (info: { viewableItems: any[] }) => {
      const ids = info.viewableItems.map((v: any) => v.item.id);
      setVisibleItems(ids);
    };
  }, []);

  // a stable wrapper passed to FlatList (never recreated)
  const stableOnViewableItemsChanged = useCallback((info: { viewableItems: any[]; changed?: any[] }) => {
    viewableHandlerRef.current(info);
  }, []);

  const getTruncatedDescription = (description: string, maxLength: number) => {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    const truncated = description.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > maxLength * 0.7) return truncated.substring(0, lastSpaceIndex).trim() + '...';
    return truncated.trim() + '...';
  };
  const needsTruncation = (description: string, maxLength: number) => !!description && description.length > maxLength;

  const handleReadMore = (item: UGCImage) => {
    if (onReadMorePress) onReadMorePress(item.id, item.readMoreUrl);
    else onImagePress?.(item.id);
  };

  const renderItem = useCallback(
    ({ item }: { item: UGCImage }) => (
      <UGCCard
        item={item}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        typography={typography}
        showDescriptions={showDescriptions}
        maxDescriptionLength={maxDescriptionLength}
        visibleItems={visibleItems}
        onImagePress={onImagePress}
        onReadMorePress={handleReadMore}
        onLikePress={handleLikePress}
        onBookmarkPress={handleBookmarkPress}
        getTruncatedDescription={getTruncatedDescription}
        needsTruncation={needsTruncation}
      />
    ),
    [cardWidth, cardHeight, typography, showDescriptions, maxDescriptionLength, visibleItems, onImagePress, handleLikePress, handleBookmarkPress]
  );

  // Loading skeleton
  if (loading && images.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <ThemedText style={[styles.sectionTitle, { fontSize: typography.sectionTitle }]}>{title}</ThemedText>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.imagesList, { paddingHorizontal: horizontalPadding }]}
          scrollEnabled={false}
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <View
              key={index}
              style={{
                width: cardWidth,
                height: cardHeight,
                borderRadius: 18,
                backgroundColor: colors.neutral[200],
                marginRight: index < 2 ? cardSpacing : 0,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Shimmer overlay */}
              <View style={styles.skeletonOverlay}>
                <LinearGradient
                  colors={[colors.neutral[200], colors.neutral[100], colors.tint.purple, colors.neutral[100], colors.neutral[200]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.skeletonGradient}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Error state with retry
  if (error && images.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <ThemedText style={[styles.sectionTitle, { fontSize: typography.sectionTitle }]}>{title}</ThemedText>
        </View>
        <View style={[styles.errorContainer, { paddingHorizontal: horizontalPadding }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.nileBlue} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable
            style={styles.retryButton}
            onPress={() => fetchUGCContent()}
           
          >
            <Ionicons name="refresh" size={20} color={colors.background.primary} />
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty state
  if (images.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <ThemedText style={[styles.sectionTitle, { fontSize: typography.sectionTitle }]}>{title}</ThemedText>
        </View>
        <View style={[styles.emptyContainer, { paddingHorizontal: horizontalPadding }]}>
          <Ionicons name="images-outline" size={64} color={colors.neutral[300]} />
          <ThemedText style={styles.emptyText}>No content available yet</ThemedText>
          <ThemedText style={styles.emptySubtext}>Check back later for updates</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <ThemedText style={[styles.sectionTitle, { fontSize: typography.sectionTitle }]}>{title}</ThemedText>
        {onViewAllPress && (
          <Pressable
            onPress={onViewAllPress}
           
            accessibilityLabel="View all user generated content"
            accessibilityRole="button"
            accessibilityHint={`Browse all ${images.length} posts`}
          >
            <ThemedText style={[styles.viewAllText, { fontSize: typography.viewAllText }]}>View all</ThemedText>
          </Pressable>
        )}
      </View>

      <FlashList
        data={images}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
          estimatedItemSize={250}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.imagesList, { paddingHorizontal: horizontalPadding }]}
        ItemSeparatorComponent={() => <View style={{ width: cardSpacing }} />}
        snapToInterval={cardWidth + cardSpacing}
        decelerationRate="fast"
        removeClippedSubviews
        updateCellsBatchingPeriod={60}
        disableIntervalMomentum
        onViewableItemsChanged={stableOnViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary[700]}
            colors={[Colors.primary[700]]}
          />
        }
        accessibilityLabel={`Fashion inspiration carousel with ${images.length} posts`}
        accessibilityRole="list"
        scrollEventThrottle={80}
      />
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  viewAllText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.primary[700],
    opacity: 0.9,
  },
  imagesList: {
    paddingVertical: 2,
  },

  // Modern Card Styles
  cardContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.background.primary,
    ...Shadows.strong,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardMedia: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.gray[100],
  },

  // Modern Overlays
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '52%',
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },
  viewCountContainer: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  viewCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    ...Shadows.subtle,
  },
  eyeIcon: { marginRight: Spacing.xs },
  viewCountText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.white,
  },

  // Modern Product Plate
  productPlateWrapper: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.md,
  },
  productPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  productThumb: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#222',
  },
  productTitle: {
    color: Colors.text.white,
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  productPrice: {
    color: Colors.error,
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 2,
  },

  // Optional description (usually hidden)
  contentArea: {
    position: 'absolute',
    bottom: 68,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.base,
    backgroundColor: 'transparent',
  },
  descriptionText: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.text.white,
    lineHeight: 21,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  readMoreButton: { alignSelf: 'flex-start', marginTop: Spacing.sm },
  readMoreText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.primary[400],
    letterSpacing: 0.1,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Modern Loading/Error States
  skeletonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  skeletonGradient: {
    flex: 1,
    opacity: 0.7,
  },
  skeletonSpinner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },

  // Modern Loading State
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.gray[500],
  },

  // Modern Error State
  errorContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.error,
    textAlign: 'center',
    maxWidth: '80%',
  },
  retryButton: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[700],
    paddingHorizontal: Spacing['2xl'] - 8,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadows.medium,
  },
  retryButtonText: {
    color: Colors.text.white,
    ...Typography.bodyLarge,
    fontWeight: '700',
  },

  // Modern Empty State
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: Spacing.base,
    ...Typography.h4,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: Spacing.sm,
    ...Typography.body,
    fontWeight: '500',
    color: Colors.gray[400],
    textAlign: 'center',
  },

  // Action buttons (like/bookmark)
  actionsContainer: {
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
    gap: Spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionIcon: {
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  likeCountText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default withErrorBoundary(UGCSection, 'MainStoreSectionUGCSection');
