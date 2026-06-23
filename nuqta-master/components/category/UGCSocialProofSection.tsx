// @ts-nocheck
/**
 * UGCSocialProofSection Component
 * User-generated content showcase for category pages
 * Uses videos API to fetch content by category
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import videosApi, { Video } from '@/services/videosApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Container has 16px margin on each side + 16px padding on each side = 64px total
// Gap between items is 10px
const CONTAINER_PADDING = 32 + 32; // marginHorizontal(16*2) + padding(16*2)
const GAP = 10;
const ITEM_WIDTH = (SCREEN_WIDTH - CONTAINER_PADDING - GAP) / 2;

// Fallback dummy video data when API returns no content
const DUMMY_VIDEO_DATA: Partial<Video>[] = [
  {
    id: 'ugc1',
    title: 'Love this outfit!',
    thumbnail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
    videoUrl: '',
    creator: { id: 'u1', name: 'Priya S.', avatar: '', username: 'priyas', verified: false },
    tags: ['OOTD'],
    metrics: { views: 1200, likes: 234, dislikes: 0, comments: 18, shares: 5 },
    engagement: { liked: false, disliked: false, bookmarked: false, watchTime: 0, completed: false },
  },
  {
    id: 'ugc2',
    title: 'Weekend vibes',
    thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    videoUrl: '',
    creator: { id: 'u2', name: 'Ananya R.', avatar: '', username: 'ananyr', verified: false },
    tags: ['StyleInspo'],
    metrics: { views: 890, likes: 189, dislikes: 0, comments: 12, shares: 3 },
    engagement: { liked: true, disliked: false, bookmarked: false, watchTime: 0, completed: false },
  },
  {
    id: 'ugc3',
    title: 'Try-on haul!',
    thumbnail: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
    videoUrl: 'https://example.com/video.mp4',
    creator: { id: 'u3', name: 'Meera K.', avatar: '', username: 'meerak', verified: true },
    tags: ['Trending'],
    metrics: { views: 5600, likes: 412, dislikes: 0, comments: 45, shares: 28 },
    engagement: { liked: false, disliked: false, bookmarked: true, watchTime: 0, completed: false },
  },
  {
    id: 'ugc4',
    title: 'Summer ready!',
    thumbnail: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
    videoUrl: '',
    creator: { id: 'u4', name: 'Riya M.', avatar: '', username: 'riyam', verified: false },
    tags: ['Summer'],
    metrics: { views: 670, likes: 156, dislikes: 0, comments: 8, shares: 2 },
    engagement: { liked: false, disliked: false, bookmarked: false, watchTime: 0, completed: false },
  },
  {
    id: 'ugc5',
    title: 'New arrivals',
    thumbnail: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
    videoUrl: '',
    creator: { id: 'u5', name: 'Kavya J.', avatar: '', username: 'kavyaj', verified: false },
    tags: ['Fashion'],
    metrics: { views: 2300, likes: 287, dislikes: 0, comments: 23, shares: 12 },
    engagement: { liked: true, disliked: false, bookmarked: false, watchTime: 0, completed: false },
  },
  {
    id: 'ugc6',
    title: 'My look book',
    thumbnail: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
    videoUrl: '',
    creator: { id: 'u6', name: 'Shreya P.', avatar: '', username: 'shreyap', verified: false },
    tags: ['LookBook'],
    metrics: { views: 1100, likes: 198, dislikes: 0, comments: 15, shares: 7 },
    engagement: { liked: false, disliked: false, bookmarked: false, watchTime: 0, completed: false },
  },
];

interface UGCSocialProofSectionProps {
  categorySlug?: string;
  categoryName?: string;
  maxItems?: number;
}

const UGCSocialProofSection: React.FC<UGCSocialProofSectionProps> = ({
  categorySlug,
  categoryName = 'Shopping',
  maxItems = 6,
}) => {
  const router = useRouter();
  const [videos, setVideos] = useState<Partial<Video>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  // Fetch videos by category
  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (categorySlug) {
          // Fetch videos by category
          const response = await videosApi.getVideosByCategory(categorySlug, { limit: maxItems });
          if (response.success && response.data?.videos && response.data.videos.length > 0) {
            if (!isMounted()) return;
            setVideos(response.data.videos.slice(0, maxItems));
          } else {
            // Try trending videos as fallback
            const trendingResponse = await videosApi.getTrendingVideos(maxItems, categorySlug);
            if (trendingResponse.success && trendingResponse.data && trendingResponse.data.length > 0) {
              if (!isMounted()) return;
              setVideos(trendingResponse.data.slice(0, maxItems));
            }
          }
        } else {
          // No category, get trending videos
          const response = await videosApi.getTrendingVideos(maxItems);
          if (response.success && response.data && response.data.length > 0) {
            if (!isMounted()) return;
            setVideos(response.data.slice(0, maxItems));
          }
        }
      } catch (err) {
        // API error - silently use fallback dummy data
        if (!isMounted()) return;
        setError(null);
      } finally {
        if (!isMounted()) return;
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [categorySlug, maxItems]);

  const handleContentPress = useCallback((item: Partial<Video>) => {
    router.push({
      pathname: '/videos/[id]',
      params: { id: item.id },
    } as any);
  }, [router]);

  const handleViewAll = useCallback(() => {
    router.push({
      pathname: '/videos',
      params: { category: categorySlug },
    } as any);
  }, [router, categorySlug]);

  const handleLike = useCallback(async (videoId: string) => {
    try {
      await videosApi.likeVideo(videoId);
      if (!isMounted()) return;
      setVideos((prev) =>
        prev.map((item) =>
          item.id === videoId
            ? {
                ...item,
                engagement: { ...item.engagement!, liked: !item.engagement?.liked },
                metrics: {
                  ...item.metrics!,
                  likes: item.engagement?.liked
                    ? (item.metrics?.likes || 0) - 1
                    : (item.metrics?.likes || 0) + 1,
                },
              }
            : item
        )
      );
    } catch (err) {
      // silently handle
    }
  }, []);

  const renderVideoItem = useCallback(({ item, index }: { item: Partial<Video>; index: number }) => {
    const isVideo = !!item.videoUrl;
    const userName = item.creator?.name || 'User';
    const userInitial = userName.charAt(0) || 'U';
    const userAvatar = item.creator?.avatar;

    return (
      <Pressable
        style={styles.ugcItem}
        onPress={() => handleContentPress(item)}
       
      >
        <CachedImage
          source={item.thumbnail}
          style={styles.ugcImage}
          contentFit="cover"
        />

        {/* Video indicator */}
        {isVideo && (
          <View style={styles.videoOverlay}>
            <Ionicons name="play-circle" size={32} color={colors.background.primary} />
          </View>
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        >
          <View style={styles.ugcInfo}>
            {/* User info */}
            <View style={styles.userRow}>
              {userAvatar ? (
                <CachedImage source={userAvatar} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{userInitial}</Text>
                </View>
              )}
              <Text style={styles.userName} numberOfLines={1}>
                {userName}
              </Text>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <Pressable
                style={styles.statItem}
                onPress={() => item.id && handleLike(item.id)}
              >
                <Ionicons
                  name={item.engagement?.liked ? 'heart' : 'heart-outline'}
                  size={14}
                  color={item.engagement?.liked ? colors.error : colors.background.primary}
                />
                <Text style={styles.statText}>{item.metrics?.likes || 0}</Text>
              </Pressable>

              {item.metrics?.comments !== undefined && item.metrics.comments > 0 && (
                <View style={styles.statItem}>
                  <Ionicons name="chatbubble-outline" size={13} color={colors.background.primary} />
                  <Text style={styles.statText}>{item.metrics.comments}</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Tag badge */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>#{item.tags[0]}</Text>
          </View>
        )}
      </Pressable>
    );
  }, [handleContentPress, handleLike]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="images" size={20} color={colors.lightMustard} />
            <Text style={styles.title}>Real Shoppers, Real Style</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.lightMustard} />
        </View>
      </View>
    );
  }

  // Use fallback data if API returns no content
  const displayContent = videos.length > 0 ? videos : DUMMY_VIDEO_DATA.slice(0, maxItems);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="images" size={20} color={colors.lightMustard} />
          <Text style={styles.title}>Real Shoppers, Real Style</Text>
        </View>
        <Pressable style={styles.viewAllButton} onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.lightMustard} />
        </Pressable>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        See how others are {categoryName === 'Fashion' ? 'styling' : 'shopping'} - Get inspired!
      </Text>

      {/* UGC Grid */}
      <FlashList
        data={displayContent}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id || Math.random().toString()}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={styles.gridContainer}
        estimatedItemSize={250}
      />

      {/* CTA Banner */}
      <Pressable style={styles.ctaBanner} onPress={handleViewAll}>
        <View style={styles.ctaContent}>
          <Ionicons name="camera" size={18} color={colors.lightMustard} />
          <Text style={styles.ctaText}>Share your look & earn coins!</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={colors.lightMustard} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(11, 34, 64, 0.04), 0 8px 24px rgba(11, 34, 64, 0.06)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 14,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    gap: GAP,
  },
  ugcItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.3,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
  },
  ugcImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    padding: 10,
    justifyContent: 'flex-end',
  },
  ugcInfo: {
    gap: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.background.primary,
  },
  avatarPlaceholder: {
    backgroundColor: colors.lightMustard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  userName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.background.primary,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    color: colors.background.primary,
    fontWeight: '500',
  },
  tagBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 205, 87, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.linen,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.linen,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
  },
});

export default memo(UGCSocialProofSection);
