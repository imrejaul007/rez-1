// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat, interpolate } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { storesApi } from '@/services/storesApi';
import { useCurrentRegionId } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Web Video Component - renders native HTML5 video on web platform
const WebVideoPlayer: React.FC<{ uri: string; poster?: string }> = ({ uri, poster }) => {
  const videoRef = useRef<any>(null); // Use any for cross-platform compatibility

  useEffect(() => {
    if (Platform.OS === 'web' && videoRef.current) {
      const video = videoRef.current;

      // Ensure video properties are set
      video.muted = true;
      video.loop = true;
      video.playsInline = true;

      // Try to play
      const playVideo = async () => {
        try {
          await video.play();
        } catch (err: any) {
          // Retry after a short delay
          setTimeout(async () => {
            try {
              await video.play();
            } catch (e) {
            }
          }, 100);
        }
      };

      if (video.readyState >= 2) {
        playVideo();
      } else {
        video.addEventListener('loadeddata', playVideo, { once: true });
      }
    }
  }, [uri]);

  if (Platform.OS === 'web') {
    return (
      <View style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <video
          ref={videoRef as any}
          src={uri}
          poster={poster || ''}
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            backgroundColor: colors.neutral[100],
          } as any}
        />
      </View>
    );
  }

  // For non-web platforms, show poster image (native video handled separately)
  return (
    <CachedImage
      source={poster || uri}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
    />
  );
};

// Video component that works on both web and native
const AutoPlayVideo: React.FC<{
  uri: string;
  poster?: string;
  style?: any;
}> = ({ uri, poster, style }) => {

  // For web, use native HTML5 video element
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.storeVideo, style]}>
        <WebVideoPlayer uri={uri} poster={poster} />
      </View>
    );
  }

  // For native (iOS/Android), use expo-av Video
  const videoRef = useRef<Video>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const isMounted = useIsMounted();

  // Cleanup video resources on unmount
  useEffect(() => {
    return () => {
      videoRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    const startPlayback = async () => {
      if (isLoaded && videoRef.current) {
        try {
          await videoRef.current.playAsync();
          if (!isMounted()) return;
          setShowPoster(false);
        } catch (err) {
        }
      }
    };
    startPlayback();
  }, [isLoaded, uri]);

  return (
    <View style={[styles.storeVideo, style]}>
      {showPoster && poster && (
        <CachedImage
          source={poster}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      )}
      <Video
        ref={videoRef}
        source={{ uri }}
        style={[StyleSheet.absoluteFill, showPoster && { opacity: 0 }]}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isLooping={true}
        isMuted={true}
        useNativeControls={false}
        onLoad={() => {
          setIsLoaded(true);
        }}
        onError={() => {}}
      />
    </View>
  );
};

interface TrendingStore {
  id: string;
  name: string;
  image: string;
  video?: string;           // Video URL for auto-play loop
  videoThumbnail?: string;  // Thumbnail/poster for video
  category: string;
  trending: string; // e.g., "324 people"
  cashback: string; // e.g., "15%"
}

interface TrendingNearYouProps {
  onViewAllPress?: () => void;
  onStorePress?: (storeId: string) => void;
}

// Transform backend store data to frontend TrendingStore format
const transformStoreData = (backendStore: any): TrendingStore => {
  // Get store ID
  const id = backendStore._id || backendStore.id || '';

  // Get store name
  const name = backendStore.name || 'Unknown Store';

  // Get image - try banner first, then logo, then image
  // Note: Check array length to avoid empty array [] being truthy
  let image = '';
  if (backendStore.banner && Array.isArray(backendStore.banner) && backendStore.banner.length > 0) {
    image = backendStore.banner[0];
  } else if (backendStore.banner && typeof backendStore.banner === 'string' && backendStore.banner) {
    image = backendStore.banner;
  } else if (backendStore.logo && backendStore.logo.trim()) {
    image = backendStore.logo;
  } else if (backendStore.image) {
    image = Array.isArray(backendStore.image) && backendStore.image.length > 0
      ? backendStore.image[0]
      : (typeof backendStore.image === 'string' ? backendStore.image : '');
  }

  // Get video if available (for auto-play loop)
  let video = '';
  let videoThumbnail = '';
  if (backendStore.videos && Array.isArray(backendStore.videos) && backendStore.videos.length > 0) {
    video = backendStore.videos[0].url || '';
    videoThumbnail = backendStore.videos[0].thumbnail || '';
  }

  // Get category - handle string or object
  let category = 'General';
  if (typeof backendStore.category === 'string') {
    category = backendStore.category;
  } else if (backendStore.category?.name) {
    category = backendStore.category.name;
  }

  // Get trending count - use recentOrders from backend
  const recentOrders = backendStore.recentOrders || 0;
  const trending = `${recentOrders} people`;

  // Get cashback percentage
  const cashbackPercent = backendStore.offers?.cashback ||
    backendStore.rewardRules?.baseCashbackPercent ||
    10; // Default 10%
  const cashback = `${cashbackPercent}%`;

  return {
    id,
    name,
    image,
    video,
    videoThumbnail,
    category,
    trending,
    cashback,
  };
};

// Skeleton card component for loading state
const SkeletonCard: React.FC = () => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1);
  }, [shimmerAnim]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <View style={styles.storeCard}>
      <Animated.View style={[styles.skeletonImage, shimmerStyle]} />
      <View style={styles.storeInfo}>
        <Animated.View style={[styles.skeletonName, shimmerStyle]} />
        <Animated.View style={[styles.skeletonCategory, shimmerStyle]} />
        <View style={styles.storeFooter}>
          <Animated.View style={[styles.skeletonCashback, shimmerStyle]} />
          <Animated.View style={[styles.skeletonCoins, shimmerStyle]} />
        </View>
      </View>
    </View>
  );
};

const TrendingNearYou: React.FC<TrendingNearYouProps> = ({
  onViewAllPress,
  onStorePress,
}) => {
  const router = useRouter();
  const currentRegion = useCurrentRegionId(); // Refetch when region changes
  const [stores, setStores] = useState<TrendingStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  // Fetch trending stores from API
  const fetchTrendingStores = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await storesApi.getTrendingStores({
        limit: 4,
        days: 7,
      });

      if (response.success && response.data?.stores) {
        const transformedStores = response.data.stores
          .filter((store: any) => store && store._id) // Filter out undefined/null stores
          .map(transformStoreData);
        if (!isMounted()) return;
        setStores(transformedStores);
      } else {
        setError(response.error || 'Failed to load trending stores');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err?.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendingStores();
  }, [fetchTrendingStores, currentRegion]); // Refetch when region changes

  const handleStorePress = (storeId: string) => {
    if (onStorePress) {
      onStorePress(storeId);
    } else {
      router.push(`/MainStorePage?storeId=${storeId}`);
    }
  };

  const handleViewAll = () => {
    if (onViewAllPress) {
      onViewAllPress();
    } else {
      router.push('/explore/trending');
    }
  };

  const handleRetry = () => {
    fetchTrendingStores();
  };

  // Render loading skeleton
  const renderLoading = () => (
    <View style={styles.grid}>
      {[1, 2, 3, 4].map((key) => (
        <SkeletonCard key={key} />
      ))}
    </View>
  );

  // Render error state
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.lightMustard} />
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

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="storefront-outline" size={48} color={colors.neutral[400]} />
      <Text style={styles.emptyText}>No trending stores found</Text>
    </View>
  );

  // Render stores grid
  const renderStores = () => (
    <View style={styles.grid}>
      {stores.map((store) => (
        <Pressable
          key={store.id}
          onPress={() => handleStorePress(store.id)}
         
          style={styles.storeCard}
        >
          {/* Media Container - Video or Image */}
          <View style={styles.imageContainer}>
            {store.video ? (
              <AutoPlayVideo
                uri={store.video}
                poster={store.videoThumbnail || store.image}
                style={styles.storeVideo}
              />
            ) : (
              // Fallback to static image
              <CachedImage
                source={{ uri: store.image || `https://picsum.photos/seed/${store.id || 'store'}/200/150` }}
                style={styles.storeImage}
                contentFit="cover"
                defaultSource={{ uri: 'https://picsum.photos/200/150?grayscale' }}
              />
            )}
            {/* Trending Badge */}
            <View style={styles.trendingBadge}>
              <Ionicons name="flame" size={10} color={colors.background.primary} />
              <Text style={styles.trendingText}>{store.trending}</Text>
            </View>
            {/* Video indicator badge */}
            {store.video && (
              <View style={styles.videoBadge}>
                <Ionicons name="videocam" size={10} color={colors.background.primary} />
              </View>
            )}
          </View>

          {/* Store Info */}
          <View style={styles.storeInfo}>
            <Text style={styles.storeName} numberOfLines={1}>
              {store.name}
            </Text>
            <Text style={styles.storeCategory} numberOfLines={1}>
              {store.category}
            </Text>
            <View style={styles.storeFooter}>
              <Text style={styles.cashbackText}>
                {store.cashback} cashback
              </Text>
              <View style={styles.coinsContainer}>
                <Ionicons name="star" size={12} color={colors.warningScale[400]} />
                <Text style={styles.coinsText}>Coins</Text>
              </View>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="flame" size={20} color={colors.lightMustard} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Trending Near You</Text>
            <Text style={styles.subtitle}>Popular in your area</Text>
          </View>
        </View>
        <Pressable
          onPress={handleViewAll}
         
          style={styles.viewAllButton}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.lightMustard} />
        </Pressable>
      </View>

      {/* Content */}
      {loading && renderLoading()}
      {!loading && error && renderError()}
      {!loading && !error && stores.length === 0 && renderEmpty()}
      {!loading && !error && stores.length > 0 && renderStores()}
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
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  storeCard: {
    width: '47%',
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
    height: 96,
    position: 'relative',
  },
  storeImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[100],
  },
  storeVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[100],
  },
  videoPoster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249, 115, 22, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  storeInfo: {
    padding: 12,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  storeCategory: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  storeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cashbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.nileBlue,
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
    height: 96,
    backgroundColor: colors.neutral[200],
  },
  skeletonName: {
    width: '80%',
    height: 14,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonCategory: {
    width: '50%',
    height: 12,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonCashback: {
    width: 60,
    height: 12,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
  },
  skeletonCoins: {
    width: 40,
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
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  // Empty styles
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[400],
    textAlign: 'center',
  },
});

export default React.memo(TrendingNearYou);
