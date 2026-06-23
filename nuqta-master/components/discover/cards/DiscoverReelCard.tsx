// @ts-nocheck
// DiscoverReelCard.tsx - Video card for Discover & Shop reels
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform} from 'react-native';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { DiscoverReel } from '@/types/discover.types';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding
const CARD_HEIGHT = CARD_WIDTH * 1.4; // Aspect ratio for reels

interface DiscoverReelCardProps {
  item: DiscoverReel;
  isVisible?: boolean;
  autoPlay?: boolean;
  onPress: (item: DiscoverReel) => void;
  onProductPress?: (productId: string) => void;
}

function DiscoverReelCard({
  item,
  isVisible = false,
  autoPlay = false,
  onPress,
  onProductPress,
}: DiscoverReelCardProps) {
  const videoRef = useRef<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const isMounted = useIsMounted();
  const scaleAnim = useSharedValue(1);

  // Cleanup video resources on unmount
  useEffect(() => {
    return () => {
      videoRef.current?.unloadAsync();
    };
  }, []);

  // Handle autoplay based on visibility
  useEffect(() => {
    const handlePlayback = async () => {
      if (!videoRef.current) return;

      try {
        if (isVisible && autoPlay && videoLoaded) {
          await videoRef.current.playAsync();
          if (!isMounted()) return;
          setIsPlaying(true);
          setShowThumbnail(false);
        } else {
          await videoRef.current.pauseAsync();
          if (!isMounted()) return;
          setIsPlaying(false);
        }
      } catch (error) {
        // Silently handle playback errors
      }
    };

    handlePlayback();
  }, [isVisible, autoPlay, videoLoaded]);

  // Press animation
  const handlePressIn = useCallback(() => {
    scaleAnim.value = withSpring(0.96);
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    scaleAnim.value = withSpring(1);
  }, [scaleAnim]);

  // Format view count
  const formatCount = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const viewCount = item.engagement?.views || item.metrics?.views || 0;
  const likeCount = typeof item.engagement?.likes === 'number'
    ? item.engagement.likes
    : Array.isArray(item.engagement?.likes)
      ? item.engagement.likes.length
      : 0;
  const productCount = item.products?.length || 0;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
       
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.touchable}
        accessibilityLabel={`Reel: ${item.title}. ${formatCount(viewCount)} views, ${productCount} products`}
        accessibilityRole="button"
      >
        {/* Thumbnail / Video Container */}
        <View style={styles.mediaContainer}>
          {/* Thumbnail */}
          {(showThumbnail || !videoLoaded) && (
            <CachedImage
              source={item.thumbnail}
              style={styles.thumbnail}
              contentFit="cover"
            />
          )}

          {/* Video (hidden behind thumbnail until loaded) */}
          {item.videoUrl && (
            <Video
              ref={videoRef}
              source={item.videoUrl}
              style={[styles.video, showThumbnail && styles.hiddenVideo]}
              resizeMode={ResizeMode.COVER}
              isLooping
              isMuted
              shouldPlay={false}
              onLoad={() => setVideoLoaded(true)}
              useNativeControls={false}
            />
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.gradient}
          />

          {/* Play indicator (when not playing) */}
          {!isPlaying && (
            <View style={styles.playIndicator}>
              <Ionicons name="play" size={24} color={colors.background.primary} />
            </View>
          )}

          {/* Product count badge */}
          {productCount > 0 && (
            <View style={styles.productBadge}>
              <Ionicons name="bag-handle" size={12} color={colors.background.primary} />
              <Text style={styles.productBadgeText}>{productCount}</Text>
            </View>
          )}

          {/* View count */}
          <View style={styles.viewCount}>
            <Ionicons name="eye" size={12} color={colors.background.primary} />
            <Text style={styles.viewCountText}>{formatCount(viewCount)}</Text>
          </View>

          {/* Like count */}
          <View style={styles.likeCount}>
            <Ionicons name="heart" size={12} color={colors.error} />
            <Text style={styles.likeCountText}>{formatCount(likeCount)}</Text>
          </View>

          {/* Creator avatar */}
          <View style={styles.creatorContainer}>
            <CachedImage
              source={item.creator?.avatar || 'https://via.placeholder.com/32'}
              style={styles.creatorAvatar}
            />
          </View>
        </View>

        {/* Content info */}
        <View style={styles.contentInfo}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title || item.description || 'Untitled'}
          </Text>

          {/* Hashtags */}
          {item.hashtags && item.hashtags.length > 0 && (
            <Text style={styles.hashtags} numberOfLines={1}>
              {item.hashtags.slice(0, 2).map(tag => `#${tag}`).join(' ')}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(DiscoverReelCard);

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },
  touchable: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mediaContainer: {
    width: '100%',
    height: CARD_HEIGHT,
    backgroundColor: colors.neutral[800],
    position: 'relative',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  hiddenVideo: {
    opacity: 0,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  playIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  productBadgeText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  viewCount: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCountText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  likeCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCountText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  creatorContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  creatorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  contentInfo: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[800],
    lineHeight: 18,
    marginBottom: 4,
  },
  hashtags: {
    fontSize: 11,
    color: colors.brand.purpleLight,
    fontWeight: '500',
  },
});
