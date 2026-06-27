// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// UGCDetailScreen.tsx - Modern TikTok/Reels Style Video Player
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  InteractionManager,
  Platform,
  Text,
  StatusBar,
  ScrollView
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useIsAuthenticated, useCartState, useGetCurrencySymbol } from '@/stores/selectors';
import { showAlert } from '@/utils/alert';
import ReportModal from '@/components/ugc/ReportModal';
import { ReportReason } from '@/types/report.types';
import { realVideosApi, Video as VideoType } from '@/services/realVideosApi';
import wishlistApi from '@/services/wishlistApi';
import useProductInteraction from '@/hooks/useProductInteraction';
import { shouldCountView, recordView } from '@/utils/viewTracker';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Fallback video URL
const FALLBACK_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

function UGCDetailScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const videoRef = useRef<Video | null>(null);

  // Animation refs
  const likeScale = useSharedValue(1);
  const heartOpacity = useSharedValue(0);
  const playPauseOpacity = useSharedValue(0);
  const likeScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));
  const heartOpacityStyle = useAnimatedStyle(() => ({ opacity: heartOpacity.value }));
  const playPauseOpacityStyle = useAnimatedStyle(() => ({ opacity: playPauseOpacity.value }));

  // View tracking ref - prevents counting same video multiple times in a session
  const viewTrackedRef = useRef<Set<string>>(new Set());

  // State
  const [ready, setReady] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [video, setVideo] = useState<VideoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video controls state
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Video aspect ratio detection - determines resize mode
  const [videoAspectRatio, setVideoAspectRatio] = useState<'vertical' | 'horizontal' | 'square'>('vertical');

  // Track if styles have been applied (for smooth transition)
  const [stylesApplied, setStylesApplied] = useState(false);

  // Social features state
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);

  // Report state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isReported, setIsReported] = useState(false);

  // Contexts
  const isAuthenticated = useIsAuthenticated();
  const cartState = useCartState();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Product interaction
  const { addToCart, navigateToProduct } = useProductInteraction({
    onSuccess: () => {},
    onError: () => {}});

  // Parse params item or fetch video from API (combined into single effect)
  useEffect(() => {
    // If video data was passed inline via params.item, use it directly
    if (params.item && typeof params.item === 'string') {
      try {
        const parsedItem = JSON.parse(params.item);
        setVideo(parsedItem as any);
        setLoading(false);
        return;
      } catch (err) {
        // silently handle
      }
    }

    // Otherwise fetch from API by ID
    if (!params.id) return;

    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        setLoading(true);
        setError(null);
        const videoId = params.id as string;
        const response = await realVideosApi.getVideoById(videoId);

        let videoData = null;
        if (response && response.success !== false) {
          if (response.data?.video) videoData = response.data.video;
          else if (response.video) videoData = response.video;
          else if (response.data?._id || response.data?.id) videoData = response.data;
          else if (response._id || response.id) videoData = response;
        }

        const extractedVideoId = videoData?._id || videoData?.id;
        if (videoData && extractedVideoId) {
          const normalizedVideo = {
            ...videoData,
            _id: extractedVideoId,
            products: videoData.products || videoData.relatedProducts || []};
          setVideo(normalizedVideo);
        } else {
          if (!isMounted()) return;
          setError('Video not found');
        }
      } catch (err) {
        if (!isMounted()) return;
        setError('Failed to load video');
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    });

    return () => task.cancel();
  }, [params.id, params.item]);

  // Release native video resources on unmount
  useEffect(() => {
    return () => {
      videoRef.current?.unloadAsync();
    };
  }, []);

  // Get the store ID to use for follow - prioritize store over creator
  const getFollowableStoreId = useCallback(() => {
    if (!video) return null;
    // Priority: video.store > video.storeId > creator.storeId > creator.store > creator.id
    return video.store?.id || video.store?._id ||
           (video as any).storeId ||
           video.creator?.storeId || (video.creator as any)?.store?.id || (video.creator as any)?.store?._id ||
           video.creator?.id || video.creator?._id;
  }, [video]);

  // Initialize engagement data
  useEffect(() => {
    let cancelled = false;
    if (video) {
      const likes = video.metrics?.likes || video.engagement?.likes;
      setLikesCount(Array.isArray(likes) ? likes.length : (Number(likes) || 0));
      setViewsCount(video.metrics?.views || video.engagement?.views || 0);
      setIsLiked(video.engagement?.liked || false);
      setIsBookmarked(video.engagement?.bookmarked || false);

      // Check follow status for the store (using wishlistApi)
      const storeIdToCheck = getFollowableStoreId();
      if (storeIdToCheck && isAuthenticated) {
        wishlistApi.checkWishlistStatus('store', storeIdToCheck)
          .then(response => {
            if (cancelled) return;
            if (response.success && response.data) {
              if (!isMounted()) return;
              setIsFollowing(response.data.inWishlist || false);
            }
          })
          .catch(() => {
            // Silently fail - keep default state
          });
      }
    }
    return () => { cancelled = true; };
  }, [video, isAuthenticated, getFollowableStoreId]);

  // Focus handling
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      StatusBar.setHidden(true);

      // Re-check follow status when screen comes into focus (might have changed in another screen)
      const storeIdToCheck = getFollowableStoreId();
      if (storeIdToCheck && isAuthenticated) {
        wishlistApi.checkWishlistStatus('store', storeIdToCheck)
          .then(response => {
            if (response.success && response.data) {
              if (!isMounted()) return;
              setIsFollowing(response.data.inWishlist || false);
            }
          })
          .catch(() => {});
      }

      return () => {
        setIsFocused(false);
        StatusBar.setHidden(false);
      };
    }, [getFollowableStoreId, isAuthenticated])
  );

  // Playback control: pause when unfocused, auto-play when ready
  useEffect(() => {
    const managePlayback = async () => {
      if (!videoRef.current || !ready) return;
      try {
        if (!isFocused) {
          // Pause when navigating away from screen
          await videoRef.current.pauseAsync();
        } else if (video?.videoUrl) {
          // Auto-play when video is ready and screen is focused
          await videoRef.current.playAsync();
          if (!isMounted()) return;
          setIsPlaying(true);
        }
      } catch (err) {
        // Silently handle playback errors
      }
    };
    managePlayback();
  }, [isFocused, ready, video?.videoUrl]);

  // Track if we've already detected the aspect ratio
  const aspectRatioDetected = useRef(false);

  // Web: detect video dimensions from DOM + apply object-fit styles for horizontal videos
  useEffect(() => {
    if (Platform.OS !== 'web' || !ready) return;

    // Step 1: Detect aspect ratio from DOM if not yet detected
    if (!aspectRatioDetected.current) {
      const detectDimensions = () => {
        try {
          const videoElements = document.querySelectorAll('video');
          for (const videoEl of videoElements) {
            if (videoEl.videoWidth && videoEl.videoHeight && videoEl.videoWidth > 0) {
              aspectRatioDetected.current = true;
              if (videoEl.videoWidth > videoEl.videoHeight) {
                setVideoAspectRatio('horizontal');
              } else if (videoEl.videoHeight > videoEl.videoWidth) {
                setVideoAspectRatio('vertical');
              }
              return true;
            }
          }
          return false;
        } catch (e) {
          return false;
        }
      };

      if (!detectDimensions()) {
        const timers = [30, 80, 150, 300].map(ms => setTimeout(detectDimensions, ms));
        return () => timers.forEach(clearTimeout);
      }
    }

    // Step 2: Apply object-fit styles for horizontal videos
    if (videoAspectRatio === 'horizontal') {
      let intervalId: NodeJS.Timeout;
      let attempts = 0;
      const maxAttempts = 50;

      const applyContainStyle = () => {
        try {
          const videoElements = document.querySelectorAll('video');
          attempts++;

          if (videoElements.length >= 2) {
            videoElements.forEach((videoEl, index) => {
              if (index === 0) {
                videoEl.style.setProperty('object-fit', 'cover', 'important');
                videoEl.style.setProperty('width', '150%', 'important');
                videoEl.style.setProperty('height', '150%', 'important');
                videoEl.style.setProperty('transform', 'scale(1.5)', 'important');
                videoEl.style.setProperty('filter', 'blur(15px)', 'important');
                videoEl.style.setProperty('top', '-25%', 'important');
                videoEl.style.setProperty('left', '-25%', 'important');
                videoEl.style.setProperty('position', 'absolute', 'important');
              } else {
                videoEl.style.setProperty('object-fit', 'contain', 'important');
                videoEl.style.setProperty('width', '100%', 'important');
                videoEl.style.setProperty('height', '100%', 'important');
                videoEl.style.setProperty('filter', 'none', 'important');
              }
            });
            if (intervalId) clearInterval(intervalId);
            setStylesApplied(true);
          } else if (videoElements.length === 1) {
            videoElements[0].style.setProperty('object-fit', 'contain', 'important');
          }

          if (attempts >= maxAttempts && intervalId) {
            clearInterval(intervalId);
          }
        } catch (e) {
          // Silently handle errors
        }
      };

      applyContainStyle();
      intervalId = setInterval(applyContainStyle, 100);

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [ready, videoAspectRatio]);

  // Transform products
  const products = useMemo(() => {
    if (!video?.products) return [];
    return video.products.map(product => {
      const price = product.pricing?.selling || product.pricing?.basePrice || product.price || 0;
      const image = product.thumbnail || product.image || product.images?.[0] || '';
      return {
        ...product,
        id: product.id || product._id,
        _id: product._id || product.id,
        name: product.name || product.title || 'Product',
        title: product.title || product.name || 'Product',
        image,
        price: typeof price === 'number' ? price : 0};
    });
  }, [video]);

  // Double tap to like animation
  const handleDoubleTap = useCallback(() => {
    if (!isLiked) {
      handleLike();
    }
    // Show heart animation
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 200 })
    );
  }, [isLiked]);

  // Video press - toggle play/pause
  const lastTap = useRef<number>(0);
  const handleVideoPress = useCallback(async () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleDoubleTap();
    } else {
      // Actually toggle video playback
      if (videoRef.current) {
        try {
          if (isPlaying) {
            await videoRef.current.pauseAsync();
            if (!isMounted()) return;
            setIsPlaying(false);
          } else {
            await videoRef.current.playAsync();
            if (!isMounted()) return;
            setIsPlaying(true);
          }
        } catch (err) {
          // Silently handle toggle errors
        }
      }
      // Show play/pause indicator
      playPauseOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 200 })
      );
    }
    lastTap.current = now;
  }, [handleDoubleTap, isPlaying]);

  // Track if we're currently restarting to prevent multiple restarts
  const isRestartingRef = useRef(false);

  // Playback status - handles looping like Reels/TikTok
  const handlePlaybackStatusUpdate = useCallback(async (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    const prog = (status.positionMillis / (status.durationMillis || 1)) * 100;
    setProgress(prog);
    setCurrentTime(status.positionMillis);
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);

    // Auto-loop: Check if video reached the end (position-based for web compatibility)
    const isAtEnd = status.durationMillis &&
                    status.durationMillis > 0 &&
                    status.positionMillis >= status.durationMillis - 500; // Within 500ms of end

    if ((status.didJustFinish || isAtEnd) && !isRestartingRef.current && videoRef.current) {
      isRestartingRef.current = true;

      try {
        // For web: directly manipulate HTML5 video element
        if (Platform.OS === 'web') {
          const videoElements = document.querySelectorAll('video');
          const mainVideo = videoElements[videoElements.length - 1];
          if (mainVideo) {
            mainVideo.currentTime = 0;
            mainVideo.play().catch(() => {
              mainVideo.muted = true;
              mainVideo.play().catch(() => {});
            });
          }
        } else {
          await videoRef.current.setPositionAsync(0);
          await videoRef.current.playAsync();
        }
      } catch (err) {
        // Silently handle replay errors
      }

      // Reset flag after a short delay
      setTimeout(() => {
        isRestartingRef.current = false;
      }, 1000);
    }
  }, []);

  // Social Actions
  const handleLike = useCallback(async () => {
    if (!isAuthenticated) {
      showAlert('Sign In Required', 'Please sign in to like videos', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/sign-in') }
      ]);
      return;
    }

    // Animate
    likeScale.value = withSequence(
      withTiming(1.4, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    try {
      if (!video?._id) return;
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikesCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

      const response = await realVideosApi.toggleVideoLike(video._id);
      if (response.success) {
        setIsLiked(response.data.isLiked ?? response.data.liked);
        setLikesCount(response.data.totalLikes ?? response.data.likeCount);
      }
    } catch (error) {
      if (!isMounted()) return;
      setIsLiked(!isLiked);
      if (!isMounted()) return;
      setLikesCount(prev => isLiked ? prev + 1 : Math.max(0, prev - 1));
    }
  }, [isAuthenticated, isLiked, video?._id, likeScale, router]);

  const handleBookmark = useCallback(async () => {
    if (!isAuthenticated) {
      showAlert('Sign In Required', 'Please sign in to save videos', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/sign-in') }
      ]);
      return;
    }

    try {
      if (!video?._id) return;
      const previousState = isBookmarked;
      setIsBookmarked(!previousState);

      const response = await realVideosApi.toggleBookmark(video._id);

      if (response?.success && response?.data) {
        if (!isMounted()) return;
        setIsBookmarked(response.data.isBookmarked);
      } else if (response?.data?.isBookmarked !== undefined) {
        if (!isMounted()) return;
        setIsBookmarked(response.data.isBookmarked);
      }
      // If API fails silently, keep the optimistic update
    } catch (error) {
      // Revert on error
      if (!isMounted()) return;
      setIsBookmarked(isBookmarked);
    }
  }, [isAuthenticated, isBookmarked, video?._id, router]);

  const handleFollow = useCallback(async () => {
    if (!isAuthenticated) {
      showAlert('Sign In Required', 'Please sign in to follow creators', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/sign-in') }
      ]);
      return;
    }

    // Use the same store ID as the check - this ensures consistency
    const storeIdToFollow = getFollowableStoreId();
    if (!storeIdToFollow) return;

    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        // Unfollow - use wishlistApi (backend supports this)
        const response = await wishlistApi.removeFromWishlist('store', storeIdToFollow);
        if (!response.success) {
          throw new Error(response.message || 'Failed to unfollow');
        }
      } else {
        // Follow - use wishlistApi (backend supports this)
        const creatorName = video?.creator?.name || video?.creator?.username || 'this creator';
        const response = await wishlistApi.addToWishlist({
          itemType: 'store',
          itemId: storeIdToFollow,
          notes: `Following ${creatorName}`,
          priority: 'medium'});
        if (!response.success) {
          throw new Error(response.message || 'Failed to follow');
        }
      }
    } catch (error) {
      // Revert on error
      if (!isMounted()) return;
      setIsFollowing(wasFollowing);
      showAlert('Error', wasFollowing ? 'Failed to unfollow' : 'Failed to follow');
    }
  }, [isAuthenticated, isFollowing, video, getFollowableStoreId, router]);

  const handleMuteToggle = useCallback(async () => {
    if (videoRef.current) {
      setIsMuted(!isMuted);
      await videoRef.current.setIsMutedAsync(!isMuted);
    }
  }, [isMuted]);

  // Track view - YouTube-like behavior with 4-hour cooldown
  useEffect(() => {
    const trackVideoView = async () => {
      if (!video || !ready || !video._id) return;

      // Check if we've already tracked this video in this component instance
      if (viewTrackedRef.current.has(video._id)) return;

      // Check if cooldown period has passed (YouTube-like)
      const canCount = await shouldCountView(video._id);

      // Mark as tracked for this component instance (prevents duplicate API calls)
      viewTrackedRef.current.add(video._id);

      if (canCount) {
        try {
          await realVideosApi.trackView(video._id);
          await recordView(video._id);
          if (!isMounted()) return;
          setViewsCount(prev => prev + 1);
        } catch (error) {
          // Silently handle view tracking errors
        }
      }
    };

    trackVideoView();
  }, [video?._id, ready]);

  // Format numbers
  const formatCount = useCallback((num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }, []);

  // Creator info (memoized to avoid recalculation on every render)
  const creatorName = useMemo(() => {
    if (video?.creator?.profile) {
      return `${video.creator.profile.firstName || ''} ${video.creator.profile.lastName || ''}`.trim() || 'User';
    }
    return video?.creator?.name || video?.creator?.username || video?.store?.name || 'User';
  }, [video?.creator, video?.store?.name]);

  const creatorAvatar = useMemo(() => {
    const raw = video?.creator?.profile?.avatar || video?.creator?.avatar || null;
    return raw && !raw.includes('ui-avatars.com') ? raw : null;
  }, [video?.creator]);

  // Deep-link parameter validation guard: requires either item (JSON) or id
  if (!params.item && !params.id) {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
    return null;
  }

  // Loading state
  if (loading) {
    return <DetailPageSkeleton />;
  }

  // Error state
  if (error || !video) {
    return (
      <View style={styles.container}>
        <Ionicons name="videocam-off-outline" size={64} color={Colors.text.tertiary} />
        <Text style={styles.errorText}>{error || 'Video not found'}</Text>
        <Pressable style={styles.retryButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Video - Only shown for horizontal videos (blurred background effect) */}
      {videoAspectRatio === 'horizontal' && (
        <>
          <Video
            key="bg-video-horizontal"
            source={videoError ? FALLBACK_VIDEO_URL : video.videoUrl}
            style={[
              StyleSheet.absoluteFill,
              styles.backgroundVideo,
              Platform.OS === 'web' && {
                // @ts-ignore - web-only style
                filter: 'blur(15px)',
                transform: 'scale(1.5)',
                width: '150%',
                height: '150%',
                top: '-25%',
                left: '-25%'},
            ]}
            resizeMode={ResizeMode.COVER}
            isLooping={true}
            shouldPlay={true}
            isMuted={true}
            useNativeControls={false}
          />
          {/* Dark overlay to dim background */}
          <View style={styles.darkOverlay} />
        </>
      )}


      {/* Main Video Player - Dynamic resize mode based on aspect ratio */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleVideoPress}
       
      >
        <Video
          key={`video-${videoAspectRatio}`}
          ref={videoRef}
          source={videoError ? FALLBACK_VIDEO_URL : video.videoUrl}
          style={StyleSheet.absoluteFill}
          resizeMode={videoAspectRatio === 'horizontal' ? ResizeMode.CONTAIN : ResizeMode.COVER}
          isLooping={true}
          shouldPlay={true}
          isMuted={isMuted}
          useNativeControls={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onLoad={async (status: any) => {
            setReady(true);
            setVideoError(false);

            // Detect video aspect ratio - try multiple sources
            let width = 0;
            let height = 0;

            // Try naturalSize first (native)
            if (status.naturalSize) {
              width = status.naturalSize.width;
              height = status.naturalSize.height;
            }
            // Try direct width/height (web fallback)
            else if (status.width && status.height) {
              width = status.width;
              height = status.height;
            }

            if (width > 0 && height > 0) {
              if (height > width) {
                setVideoAspectRatio('vertical');
              } else if (width > height) {
                setVideoAspectRatio('horizontal');
              } else {
                setVideoAspectRatio('square');
              }
            }

            // Force play after load
            if (videoRef.current) {
              try {
                await videoRef.current.playAsync();
                if (!isMounted()) return;
                setIsPlaying(true);
              } catch (e) {
                // Silently handle play errors
              }
            }

            // Web: Set loop attribute directly on HTML5 video element
            if (Platform.OS === 'web') {
              setTimeout(() => {
                const videoElements = document.querySelectorAll('video');
                videoElements.forEach((videoEl) => {
                  videoEl.loop = true;
                });
              }, 100);
            }
          }}
          onReadyForDisplay={(event: any) => {
            // Try to get dimensions from readyForDisplay event (web)
            if (event?.naturalSize || event?.nativeEvent?.naturalSize) {
              const size = event.naturalSize || event.nativeEvent?.naturalSize;
              if (size?.width && size?.height) {
                if (size.height > size.width) {
                  setVideoAspectRatio('vertical');
                } else if (size.width > size.height) {
                  setVideoAspectRatio('horizontal');
                }
              }
            }
          }}
          onError={() => {
            setVideoError(true);
          }}
        />
        {/* Transparent overlay to capture taps on web */}
        <View
          style={[StyleSheet.absoluteFill, { pointerEvents: 'box-only' }]}
        />
      </Pressable>

      {/* Play/Pause Indicator */}
      <Animated.View style={[styles.playPauseIndicator, playPauseOpacityStyle]}>
        <View style={styles.playPauseCircle}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={50} color={Colors.text.inverse} />
        </View>
      </Animated.View>

      {/* Double Tap Heart Animation */}
      <Animated.View style={[styles.heartAnimation, heartOpacityStyle]}>
        <Ionicons name="heart" size={120} color={Colors.error} />
      </Animated.View>

      {/* Top Gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={[styles.topGradient, { pointerEvents: 'none' }]}
      />

      {/* Bottom Gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={[styles.bottomGradient, { pointerEvents: 'none' }]}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
        </Pressable>

        <View style={styles.topBarRight}>
          <Pressable style={styles.topBarButton} onPress={handleMuteToggle}>
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={22} color={Colors.text.inverse} />
          </Pressable>

          <Pressable style={styles.topBarButton} onPress={() => router.push('/cart')}>
            <Ionicons name="bag-outline" size={22} color={Colors.text.inverse} />
            {cartState.items.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartState.items.length}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Right Side Social Actions */}
      <View style={styles.socialActions}>
        {/* Creator Avatar */}
        <View style={styles.creatorAvatarContainer}>
          <Pressable onPress={() => {
            const creatorId = video?.creator?._id || (video?.creator as any)?.id;
            if (creatorId) {
              router.push(`/creator/${creatorId}` as any);
            }
          }}>
            {creatorAvatar ? (
              <CachedImage
                source={creatorAvatar}
                style={styles.creatorAvatar}
              />
            ) : (
              <View style={[styles.creatorAvatar, { backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>
                  {creatorName?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </Pressable>
          {!isFollowing && (
            <Pressable style={styles.followBadge} onPress={handleFollow}>
              <Ionicons name="add" size={12} color={Colors.text.inverse} />
            </Pressable>
          )}
        </View>

        {/* Like */}
        <Pressable style={styles.actionButton} onPress={handleLike}>
          <Animated.View style={likeScaleStyle}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={32}
              color={isLiked ? Colors.error : colors.background.primary}
            />
          </Animated.View>
          <Text style={styles.actionCount}>{formatCount(likesCount)}</Text>
        </Pressable>

        {/* Bookmark */}
        <Pressable style={styles.actionButton} onPress={handleBookmark}>
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={30}
            color={isBookmarked ? Colors.warning : colors.background.primary}
          />
        </Pressable>

        {/* More Options */}
        <Pressable style={styles.actionButton} onPress={() => setReportModalVisible(true)}>
          <Ionicons name="ellipsis-horizontal" size={24} color={Colors.text.inverse} />
        </Pressable>
      </View>

      {/* Bottom Content */}
      <View style={styles.bottomContent}>
        {/* Creator Info */}
        <View style={styles.creatorInfo}>
          <Text style={styles.creatorName}>@{creatorName.toLowerCase().replace(/\s+/g, '_')}</Text>
          {isFollowing ? (
            <View style={styles.followingBadge}>
              <Text style={styles.followingText}>Following</Text>
            </View>
          ) : (
            <Pressable style={styles.followButton} onPress={handleFollow}>
              <Text style={styles.followButtonText}>Follow</Text>
            </Pressable>
          )}
        </View>

        {/* Caption */}
        <Text style={styles.caption} numberOfLines={2}>
          {video.description || video.title}
        </Text>

        {/* Tags */}
        {video.hashtags && video.hashtags.length > 0 && (
          <View style={styles.tagsContainer}>
            {video.hashtags.slice(0, 3).map((tag: string, index: number) => (
              <Text key={index} style={styles.tag}>
                {tag.startsWith('#') ? tag : `#${tag}`}
              </Text>
            ))}
          </View>
        )}

        {/* Products Section - Horizontal Scroll */}
        {products.length > 0 && (
          <View style={styles.productsSection}>
            <View style={styles.productsHeader}>
              <Ionicons name="bag-handle" size={14} color={Colors.text.inverse} />
              <Text style={styles.productsTitle}>Shop Products</Text>
              <View style={styles.productsBadge}>
                <Text style={styles.productsBadgeText}>{products.length}</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
            >
              {products.map((product: any, index: number) => (
                <Pressable
                  key={product.id || index}
                  style={styles.productCard}
                  onPress={() => navigateToProduct(product, 'ugc_video')}
                 
                >
                  <CachedImage source={product.image} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <View style={styles.productPriceRow}>
                      <Text style={styles.productPrice}>
                        {typeof product.price === 'number' ? `${currencySymbol}${product.price}` : product.price}
                      </Text>
                      <Pressable
                        style={styles.addToCartButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          addToCart(product, 1);
                        }}
                      >
                        <Ionicons name="add" size={14} color={Colors.text.inverse} />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        videoId={video._id}
        videoTitle={video.description || video.title}
        onReportSuccess={() => {
          setReportModalVisible(false);
          setIsReported(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.text.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && { overflow: 'hidden' as const })},
  backgroundVideo: {
    opacity: 0.7,
    transform: [{ scale: 1.5 }]},
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)'},
  loadingText: {
    color: Colors.text.tertiary,
    marginTop: Spacing.base,
    ...Typography.bodyLarge},
  errorText: {
    color: Colors.text.tertiary,
    marginTop: Spacing.base,
    ...Typography.bodyLarge},
  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.brand.purpleLight,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 25},
  retryButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600'},

  // Overlays
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150},
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5},

  // Play/Pause Indicator
  playPauseIndicator: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10},
  playPauseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'},

  // Heart Animation
  heartAnimation: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10},

  // Top Bar
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    zIndex: 20},
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center'},
  topBarRight: {
    flexDirection: 'row',
    gap: Spacing.md},
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center'},
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center'},
  cartBadgeText: {
    color: Colors.text.inverse,
    ...Typography.overline,
    fontWeight: '700'},

  // Social Actions (Right Side)
  socialActions: {
    position: 'absolute',
    right: 12,
    bottom: Platform.OS === 'ios' ? 280 : 260, // Moved up further to avoid bottom nav bar
    alignItems: 'center',
    gap: Spacing.lg,
    zIndex: 20},
  creatorAvatarContainer: {
    marginBottom: 10},
  creatorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.text.inverse},
  followBadge: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.text.primary},
  actionButton: {
    alignItems: 'center'},
  actionCount: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '600',
    marginTop: Spacing.xs},

  // Bottom Content
  bottomContent: {
    position: 'absolute',
    left: 12,
    right: 60,
    bottom: Platform.OS === 'ios' ? 100 : 80, // Moved up further to avoid bottom nav bar
    zIndex: 20},
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm},
  creatorName: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '700'},
  followButton: {
    marginLeft: Spacing.md,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderRadius: 4},
  followButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '600'},
  followingBadge: {
    marginLeft: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.text.inverse,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 4},
  followingText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall},
  caption: {
    color: Colors.text.inverse,
    ...Typography.body,
    lineHeight: 20,
    marginBottom: Spacing.sm},
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md},
  tag: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600'},

  // Products Section
  productsSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.md,
    padding: 10,
    ...Platform.select({ web: { backdropFilter: 'blur(10px)' } as any, default: {} })},
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: 6},
  productsTitle: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '600',
    flex: 1},
  productsBadge: {
    backgroundColor: Colors.brand.purpleLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm},
  productsBadgeText: {
    color: Colors.text.inverse,
    ...Typography.overline,
    fontWeight: '700'},
  productsList: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: Spacing.xs},
  productCard: {
    width: 120,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: Spacing.sm,
    overflow: 'hidden'},
  productImage: {
    width: '100%',
    height: 70,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.text.primary,
    marginBottom: 6},
  productInfo: {
    flex: 1},
  productName: {
    color: Colors.text.inverse,
    ...Typography.caption,
    fontWeight: '500',
    marginBottom: Spacing.xs},
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'},
  productPrice: {
    color: Colors.gold,
    ...Typography.bodySmall,
    fontWeight: '700'},
  addToCartButton: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.brand.purpleLight,
    justifyContent: 'center',
    alignItems: 'center'},

  // Progress Bar
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)'},
  progressBar: {
    height: '100%',
    backgroundColor: Colors.background.primary}});

export default withErrorBoundary(UGCDetailScreen, 'UGCDetailScreen');
