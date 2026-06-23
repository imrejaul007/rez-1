// @ts-nocheck
import React, { useRef, useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { ThemedText } from '@/components/ThemedText';
import { VideoCardProps, VIDEO_CARD_SIZES, PLAY_PAGE_COLORS } from '@/types/playPage.types';
import { getIOSVideoProps, getVideoLoadingStrategy } from '@/utils/videoUtils';
import ShimmerEffect from '@/components/common/ShimmerEffect';
import { useVideoManager } from '@/hooks/useVideoManager';
import logger from '@/utils/logger';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth } = Dimensions.get('window');

function VideoCard({
  item,
  onPress,
  onPlay,
  onPause,
  autoPlay = true,
  showProductCount = true,
  showHashtags = true,
  size = 'medium',
  style
}: VideoCardProps) {
  // Use the video manager hook
  const {
    videoRef,
    isPlaying,
    isLoaded: isVideoReady,
    startPlayback,
    stopPlayback,
    setLoaded,
    getManagerStatus
  } = useVideoManager(item.id);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true); // Volume control state
  const [isFullscreen, setIsFullscreen] = useState(false); // Fullscreen state
  const [showControls, setShowControls] = useState(false); // Show/hide controls
  const [isLiked, setIsLiked] = useState(item.isLiked || false); // Like state
  const [likeCount, setLikeCount] = useState(item.engagement?.likes || 0); // Like count
  const [lastTap, setLastTap] = useState<number | null>(null); // For double-tap detection
  const isMounted = useIsMounted();
  
  // Animation values
  const scaleAnim = useSharedValue(1);
  const opacityAnim = useSharedValue(0);
  
  // Get iOS-optimized video props
  const videoProps = getIOSVideoProps(item.videoUrl, item.thumbnailUrl);
  const loadingStrategy = getVideoLoadingStrategy();

  const sizeConfig = VIDEO_CARD_SIZES[size];
  const cardWidth = size === 'large' || size === 'featured' 
    ? screenWidth - 40 
    : (screenWidth - 60) / 2; // More spacing between cards

  // Cleanup video resources on unmount
  useEffect(() => {
    return () => {
      videoRef.current?.unloadAsync();
    };
  }, []);

  // Preload video immediately when component mounts
  useEffect(() => {
    const loadVideo = async () => {
      if (videoRef.current) {
        try {
          // Load video but don't play yet for faster initial loading
          await videoRef.current.loadAsync(
            { uri: item.videoUrl },
            {
              shouldPlay: false, // Load but don't play initially
              isLooping: true,
              isMuted: true,
              volume: 0,
            }
          );
        } catch (error) {
          logger.warn('Video loading error:', error);
          if (!isMounted()) return;
          setHasError(true);
        }
      }
    };
    
    loadVideo();
  }, [item.videoUrl]);
  
  // Handle auto-play when video is ready
  useEffect(() => {
    const handleAutoPlay = async () => {
      if (autoPlay && isVideoReady && !isPlaying) {
        const status = getManagerStatus();

        const success = await startPlayback();
        if (success) {
          onPlay?.();
        } else {
          logger.warn(`Auto-play failed for ${item.id}`);
        }
      } else if (!autoPlay && isPlaying) {
        await stopPlayback();
        onPause?.();
      }
    };
    
    handleAutoPlay();
  }, [autoPlay, isVideoReady, item.id, startPlayback, stopPlayback, onPlay, onPause, getManagerStatus]);

  const handleVideoLoad = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setLoaded(true); // Notify video manager that video is loaded

      // Fade in animation
      opacityAnim.value = withTiming(1, { duration: 500 });
    }
    
    // Track loading progress
    if (status.isLoaded && 'playableDurationMillis' in status && 'durationMillis' in status) {
      const progress = status.playableDurationMillis && status.durationMillis 
        ? (status.playableDurationMillis / status.durationMillis) * 100
        : 0;
      setLoadingProgress(progress);
    }
  };

  const handleVideoError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleCardPress = () => {
    // Toggle controls visibility on card press
    setShowControls(!showControls);

    // Auto-hide controls after 3 seconds
    if (!showControls) {
      setTimeout(() => setShowControls(false), 3000);
    }

    // Scale animation on press
    scaleAnim.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // ms

    if (lastTap && now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap detected - like the video
      handleLike();
      setLastTap(null);
    } else {
      // Single tap - navigate to detail
      setLastTap(now);
      setTimeout(() => {
        if (lastTap === now) {
          onPress(item);
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleLike = async (e?: any) => {
    e?.stopPropagation();

    // Optimistic update
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

    // Animate heart
    scaleAnim.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );

    // TODO: Call API to update like status
    logger.debug(`❤️ [VideoCard] ${newLikedState ? 'Liked' : 'Unliked'} video ${item.id}`);

    // In real implementation, call API:
    // try {
    //   await videosApi.toggleLike(item.id);
    // } catch (error) {
    //   // Revert on error
    //   setIsLiked(!newLikedState);
    //   setLikeCount(prev => newLikedState ? prev - 1 : prev + 1);
    // }
  };

  const handleShare = async (e: any) => {
    e.stopPropagation();

    logger.debug(`🔗 [VideoCard] Sharing video ${item.id}`);

    // TODO: Implement share functionality
    // For now, just log. In real implementation:
    // - Use expo-sharing or react-native-share
    // - Generate share URL
    // - Track share event
    // - Update share count

    // Example:
    // try {
    //   await Share.share({
    //     message: `Check out this video: ${item.description}`,
    //     url: `https://yourapp.com/video/${item.id}`,
    //   });
    // } catch (error) {
    //   logger.error('Error sharing:', error);
    // }
  };

  const handleComment = (e: any) => {
    e.stopPropagation();

    // Navigate to detail screen (which has comments)
    logger.debug(`💬 [VideoCard] Opening comments for video ${item.id}`);
    onPress(item);
  };

  const handleVolumeToggle = async (e: any) => {
    e.stopPropagation();

    if (videoRef.current) {
      try {
        if (!isMounted()) return;
        await videoRef.current.setIsMutedAsync(!isMuted);
        setIsMuted(!isMuted);
        logger.debug(`🔊 [VideoCard] Volume ${!isMuted ? 'muted' : 'unmuted'}`);
      } catch (error) {
        logger.error('Error toggling volume:', error);
      }
    }
  };

  const handleFullscreenToggle = (e: any) => {
    e.stopPropagation();

    // For now, navigate to UGC detail screen which provides better fullscreen experience
    // In the future, implement native fullscreen with expo-video-player
    logger.debug('🔲 [VideoCard] Fullscreen toggle - navigating to detail');
    onPress(item);
  };

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: opacityAnim.value,
  }));

  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  return (
    <Animated.View
      style={[cardAnimStyle]}
    >
      <Pressable
        style={[
          styles.container,
          {
            width: cardWidth,
            height: sizeConfig.height
          },
          style
        ]}
        onPress={handleCardPress}
        // Disable default opacity since we have custom animation
        accessibilityLabel={`${item.description}. ${item.viewCount} views${item.productCount ? `. ${item.productCount} product${item.productCount !== 1 ? 's' : ''} available` : ''}${item.hashtags?.length ? `. Tags: ${item.hashtags.join(', ')}` : ''}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to watch video and shop products"
        accessibilityState={{ busy: isLoading, disabled: hasError }}
      >
      <View style={styles.videoContainer}>
        {!hasError ? (
          <Video
            ref={videoRef}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isPlaying && isVideoReady}
            onPlaybackStatusUpdate={handleVideoLoad}
            onError={handleVideoError}
            {...videoProps} // Apply iOS-optimized props
            // Override props to ensure auto-play compatibility
            isLooping={true}
            isMuted={isMuted}
            volume={isMuted ? 0 : 1}
            progressUpdateIntervalMillis={200}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.errorContainer]}>
            <Ionicons name="videocam-off" size={40} color={colors.midGray} />
            <ThemedText style={styles.errorText}>Video unavailable</ThemedText>
          </View>
        )}

        {/* Enhanced loading overlay with shimmer */}
        {isLoading && !hasError && (
          <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
            {/* Shimmer background effect */}
            <ShimmerEffect
              width="100%"
              height="100%"
              style={styles.shimmerBackground}
              shimmerColors={[colors.neutral[200], colors.background.primary, colors.neutral[200]]}
              duration={1200}
            />
            
            <View style={styles.loadingContent}>
              <View style={styles.loadingSpinner}>
                <Ionicons name="play-circle" size={36} color={colors.background.primary} />
              </View>
              
              {loadingProgress > 0 && (
                <View style={styles.loadingProgress}>
                  <View style={styles.progressBarBackground}>
                    <Animated.View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${loadingProgress}%` }
                      ]} 
                    />
                  </View>
                  <ThemedText style={styles.loadingText}>
                    {Math.round(loadingProgress)}%
                  </ThemedText>
                </View>
              )}
              
              {loadingProgress === 0 && (
                <ThemedText style={styles.loadingText}>
                  Preparing video...
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {/* Gradient overlay for text readability */}
        <LinearGradient
          colors={PLAY_PAGE_COLORS.gradient.cardOverlay as any}
          style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* View count overlay */}
        <View style={styles.viewCountContainer}>
          <View style={styles.viewCountPill}>
            <Ionicons name="eye" size={12} color={colors.background.primary} />
            <ThemedText style={styles.viewCountText}>
              {item.viewCount}
            </ThemedText>
          </View>
        </View>

        {/* Product count badge */}
        {showProductCount && item.productCount && item.productCount > 0 && (
          <View style={styles.productCountContainer}>
            <View style={styles.productCountPill}>
              <Ionicons name="pricetag" size={12} color={colors.background.primary} />
              <ThemedText style={styles.productCountText}>
                {item.productCount} {item.productCount === 1 ? 'product' : 'products'}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Video Controls - Show on tap */}
        {showControls && !isLoading && !hasError && (
          <View style={styles.controlsContainer}>
            {/* Volume Toggle */}
            <Pressable
              style={styles.controlButton}
              onPress={handleVolumeToggle}
             
              accessibilityLabel={isMuted ? 'Unmute video' : 'Mute video'}
              accessibilityRole="button"
              accessibilityHint={`Double tap to ${isMuted ? 'turn on' : 'turn off'} video sound`}
              accessibilityState={{ selected: !isMuted }}
            >
              <Ionicons
                name={isMuted ? "volume-mute" : "volume-high"}
                size={24}
                color={colors.background.primary}
              />
            </Pressable>

            {/* Fullscreen Toggle */}
            <Pressable
              style={styles.controlButton}
              onPress={handleFullscreenToggle}
             
              accessibilityLabel="Enter fullscreen mode"
              accessibilityRole="button"
              accessibilityHint="Double tap to watch video in fullscreen mode"
            >
              <Ionicons
                name="expand"
                size={24}
                color={colors.background.primary}
              />
            </Pressable>
          </View>
        )}

        {/* Shop Now Button - Always visible if products available */}
        {item.productCount && item.productCount > 0 && !isLoading && (
          <Pressable
            style={styles.shopNowButton}
            onPress={handleDoubleTap}
           
            accessibilityLabel={`Shop now. ${item.productCount} product${item.productCount !== 1 ? 's' : ''} available`}
            accessibilityRole="button"
            accessibilityHint="Double tap to view and purchase products featured in this video"
          >
            <Ionicons name="cart" size={18} color={colors.background.primary} />
            <ThemedText style={styles.shopNowText}>Shop Now</ThemedText>
          </Pressable>
        )}

        {/* Social Actions - TikTok/Reels style */}
        {!isLoading && !hasError && (
          <View style={styles.socialActionsContainer}>
            {/* Like Button */}
            <Pressable
              style={styles.socialActionButton}
              onPress={handleLike}
             
              accessibilityLabel={`${isLiked ? 'Unlike' : 'Like'} video${likeCount > 0 ? `. ${likeCount} like${likeCount !== 1 ? 's' : ''}` : ''}`}
              accessibilityRole="button"
              accessibilityHint={`Double tap to ${isLiked ? 'remove like from' : 'like'} this video`}
              accessibilityState={{ selected: isLiked }}
            >
              <Animated.View style={heartAnimStyle}>
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={28}
                  color={isLiked ? colors.error : colors.background.primary}
                />
              </Animated.View>
              {likeCount > 0 && (
                <ThemedText style={styles.socialActionText}>
                  {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
                </ThemedText>
              )}
            </Pressable>

            {/* Comment Button */}
            <Pressable
              style={styles.socialActionButton}
              onPress={handleComment}
             
              accessibilityLabel={`View comments${item.engagement?.comments ? `. ${item.engagement.comments} comment${item.engagement.comments !== 1 ? 's' : ''}` : ''}`}
              accessibilityRole="button"
              accessibilityHint="Double tap to view and add comments"
            >
              <Ionicons name="chatbubble-outline" size={26} color={colors.background.primary} />
              {item.engagement?.comments && item.engagement.comments > 0 && (
                <ThemedText style={styles.socialActionText}>
                  {item.engagement.comments >= 1000
                    ? `${(item.engagement.comments / 1000).toFixed(1)}k`
                    : item.engagement.comments}
                </ThemedText>
              )}
            </Pressable>

            {/* Share Button */}
            <Pressable
              style={styles.socialActionButton}
              onPress={handleShare}
             
              accessibilityLabel={`Share video${item.engagement?.shares ? `. ${item.engagement.shares} share${item.engagement.shares !== 1 ? 's' : ''}` : ''}`}
              accessibilityRole="button"
              accessibilityHint="Double tap to share this video with others"
            >
              <Ionicons name="paper-plane-outline" size={26} color={colors.background.primary} />
              {item.engagement?.shares && item.engagement.shares > 0 && (
                <ThemedText style={styles.socialActionText}>
                  {item.engagement.shares >= 1000
                    ? `${(item.engagement.shares / 1000).toFixed(1)}k`
                    : item.engagement.shares}
                </ThemedText>
              )}
            </Pressable>
          </View>
        )}



        {/* Content overlay */}
        <View style={styles.contentOverlay}>
          {/* Description */}
          <ThemedText 
            style={[
              styles.description, 
              { fontSize: sizeConfig.fontSize }
            ]} 
            numberOfLines={size === 'featured' ? 3 : 2}
          >
            {item.description}
          </ThemedText>

          {/* Hashtags */}
          {showHashtags && item.hashtags && item.hashtags.length > 0 && (
            <View style={styles.hashtagsContainer}>
              {item.hashtags.slice(0, 2).map((hashtag, index) => (
                <View key={index} style={styles.hashtagPill}>
                  <ThemedText style={styles.hashtagText}>
                    {hashtag}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

       
        </View>

        {/* Play/Pause indicator (subtle) */}
        {!isLoading && !hasError && (
          <View style={styles.playIndicator}>
            <View style={[styles.playDot, { opacity: isPlaying ? 1 : 0.5 }]} />
          </View>
        )}
      </View>
      </Pressable>
    </Animated.View>
    );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20, // More rounded corners
    overflow: 'hidden',
    backgroundColor: PLAY_PAGE_COLORS.cardBackground,
    shadowColor: PLAY_PAGE_COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, // Softer shadow
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 20, // More spacing between cards
    marginHorizontal: 2, // Subtle horizontal spacing
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.midGray,
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  shimmerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.7,
  },
  loadingContent: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingProgress: {
    alignItems: 'center',
    width: '80%',
  },
  progressBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.background.primary,
    borderRadius: 2,
  },
  loadingText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  viewCountContainer: {
    position: 'absolute',
    top: 16, // More spacing from edge
    left: 16,
  },
  viewCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // More subtle
    borderRadius: 16, // More rounded
    paddingHorizontal: 12,
    paddingVertical: 6, // More padding
    gap: 6,
    // // backdropFilter: 'blur(10px)', // Not supported in React Native // Glass effect - not supported in React Native
  },
  viewCountText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  productCountContainer: {
    position: 'absolute',
    top: 16, // More spacing from edge
    right: 16,
  },
  productCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PLAY_PAGE_COLORS.primary,
    borderRadius: 16, // More rounded
    paddingHorizontal: 12,
    paddingVertical: 6, // More padding
    gap: 6,
    shadowColor: PLAY_PAGE_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  productCountText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20, // More generous padding
  },
  description: {
    color: colors.background.primary,
    fontWeight: '600', // Slightly bolder
    lineHeight: 22, // Better line spacing
    marginBottom: 12, // More space below
    letterSpacing: 0.3, // Better letter spacing
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // More space between hashtags
    marginBottom: 12, // More space below
  },
  hashtagPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // More subtle
    borderRadius: 14, // More rounded
    paddingHorizontal: 12,
    paddingVertical: 6, // More padding
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hashtagText: {
    color: colors.background.primary,
    fontSize: 11, // Slightly larger
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  

  playIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  playDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.successScale[400],
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}),
  },
  shopNowButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PLAY_PAGE_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: PLAY_PAGE_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  shopNowText: {
    color: colors.background.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  socialActionsContainer: {
    position: 'absolute',
    right: 16,
    bottom: 160, // Above shop button and content
    flexDirection: 'column',
    gap: 20,
    alignItems: 'center',
  },
  socialActionButton: {
    alignItems: 'center',
    gap: 4,
  },
  socialActionText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default React.memo(VideoCard);