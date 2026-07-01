// @ts-nocheck
/**
 * Trending Near You Section - Matching V2 Design
 * Featured card layout with hero + small cards + horizontal card
 * Connected to /api/stores/new endpoint
 * With waterfall carousel animation
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { storesApi } from '@/services/storesApi';
import CoinIcon from '@/components/ui/CoinIcon';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Video Component - uses native video for web, expo-av for mobile
const AutoPlayVideo: React.FC<{ uri: string; poster?: string; style?: any }> = ({ uri, poster, style }) => {
  const videoRef = useRef<Video>(null);
  const webContainerRef = useRef<View>(null);
  const videoElementRef = useRef<any>(null); // Use any for cross-platform compatibility

  // Cleanup video resources on unmount
  useEffect(() => {
    return () => {
      videoRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    let videoElement: HTMLVideoElement | null = null;

    if (Platform.OS === 'web' && webContainerRef.current && typeof document !== 'undefined') {
      // Get the actual DOM node from the React Native Web View
      const container = webContainerRef.current as any;
      const domNode = container._nativeTag || container;

      // Find the actual DOM element
      setTimeout(() => {
        try {
          // Try to find the container in DOM and append video
          const elements = document.querySelectorAll('[data-video-container="true"]');
          elements.forEach((el) => {
            const videoUri = el.getAttribute('data-video-uri');
            if (videoUri === uri && !el.querySelector('video')) {
              const video = document.createElement('video');
              video.src = uri;
              video.poster = poster || '';
              video.autoplay = true;
              video.loop = true;
              video.muted = true;
              video.playsInline = true;
              video.setAttribute('webkit-playsinline', 'true');
              video.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;';

              el.appendChild(video);
              videoElement = video;
              video.play().catch(() => { });
            }
          });
        } catch (e) {
          // Silent error handling
        }
      }, 100);
    }

    return () => {
      if (videoElement) {
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
        videoElement.parentNode?.removeChild(videoElement);
      }
    };
  }, [uri, poster]);

  if (Platform.OS === 'web') {
    return (
      <View
        ref={webContainerRef}
        style={[{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: colors.neutral[100] }, style]}
        // @ts-ignore - web specific props
        dataSet={{ videoContainer: 'true', videoUri: uri }}
      />
    );
  }

  // For mobile, use expo-av
  return (
    <Video
      ref={videoRef}
      source={{ uri }}
      posterSource={poster ? { uri: poster } : undefined}
      style={[{ width: '100%', height: '100%' }, style]}
      resizeMode={ResizeMode.COVER}
      shouldPlay={true}
      isLooping={true}
      isMuted={true}
      useNativeControls={false}
    />
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;

// Colors
const COLORS = {
  white: colors.background.primary,
  navy: colors.nileBlue,
  gray50: colors.neutral[50],
  gray100: colors.neutral[100],
  gray200: colors.neutral[200],
  gray400: colors.neutral[400],
  gray600: colors.neutral[500],
  nileBlue: colors.nileBlue,
  nileBlueLight: colors.brand.nileBlueLight,
  amber400: colors.lightMustard,
  amber500: colors.brand.goldRich,
  orange500: colors.lightPeach,
  red500: colors.nileBlue,
};

interface NewStore {
  id: string;
  name: string;
  slug?: string;
  category: string;
  image: string;
  video?: string;
  videoThumbnail?: string;
  people: number;
  cashback: string;
  rating?: number;
  isNew?: boolean;
}


const NewOnNuqtaSection: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [featuredStore, setFeaturedStore] = useState<NewStore | null>(null);
  const [smallStores, setSmallStores] = useState<NewStore[]>([]);
  const [horizontalStore, setHorizontalStore] = useState<NewStore | null>(null);
  const isMounted = useIsMounted();

  // Store queue for rotation
  const [allStores, setAllStores] = useState<NewStore[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Animation shared values - waterfall effect
  const animationProgress = useSharedValue(0); // 0 to 1 master progress
  const smallCard1Y = useSharedValue(0);
  const smallCard1Opacity = useSharedValue(1);
  const smallCard2Y = useSharedValue(0);
  const smallCard2Opacity = useSharedValue(1);
  const horizontalOpacity = useSharedValue(1);
  const featuredOpacity = useSharedValue(1);
  const featuredScale = useSharedValue(1);

  // New card sliding in from right
  const newCardX = useSharedValue(200); // Start off-screen to the right
  const newCardOpacity = useSharedValue(0);
  const newCardScale = useSharedValue(0.9);
  const [incomingStore, setIncomingStore] = useState<NewStore | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation config - waterfall timing
  const ANIMATION_DURATION = 700;
  const STAGGER_DELAY = 80; // Delay between each card animation
  const ROTATION_INTERVAL = 5000;
  const SMALL_CARD_HEIGHT = 166; // Height of small card + gap
  const HORIZONTAL_SLIDE_OUT = 100;

  // Web-specific GPU acceleration style
  const webAnimationStyle = Platform.OS === 'web' ? {
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden' as const,
  } : {};

  // Transform store data to extract video URLs from backend response
  const transformStoreData = (store: any): NewStore => {
    // Extract video URL if available
    let video = '';
    let videoThumbnail = '';

    if (store.videos && Array.isArray(store.videos) && store.videos.length > 0) {
      video = store.videos[0].url || store.videos[0] || '';
      videoThumbnail = store.videos[0].thumbnail || '';
    } else if (store.video) {
      video = store.video;
      videoThumbnail = store.videoThumbnail || '';
    }

    return {
      id: store.id || store._id || '',
      name: store.name || 'Store',
      slug: store.slug,
      category: typeof store.category === 'string' ? store.category : store.category?.name || 'General',
      image: store.image || store.banner?.[0] || store.logo || '',
      video,
      videoThumbnail,
      people: store.people || store.recentOrders || 0,
      cashback: store.cashback || `${store.offers?.cashback || store.rewardRules?.baseCashbackPercent || 10}%`,
      rating: store.rating,
      isNew: store.isNew,
    };
  };

  // Animated styles - Smooth waterfall cascade effect
  const smallCard1Style = useAnimatedStyle(() => {
    // Card 1 slides down to Card 2 position - stays mostly visible
    const scale = interpolate(
      smallCard1Y.value,
      [0, SMALL_CARD_HEIGHT],
      [1, 0.98],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateY: smallCard1Y.value },
        { scale },
      ],
      opacity: smallCard1Opacity.value,
      zIndex: 2,
    };
  });

  const smallCard2Style = useAnimatedStyle(() => {
    // Card 2 slides down and exits (fades out)
    const scale = interpolate(
      smallCard2Y.value,
      [0, SMALL_CARD_HEIGHT],
      [1, 0.95],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateY: smallCard2Y.value },
        { scale },
      ],
      opacity: smallCard2Opacity.value,
      zIndex: 1,
    };
  });

  // Horizontal card X position for sliding out to the right
  const horizontalX = useSharedValue(0);

  const horizontalStyle = useAnimatedStyle(() => {
    // Horizontal card slides out to the RIGHT and fades
    const scale = interpolate(
      horizontalX.value,
      [0, 150, 300],
      [1, 0.95, 0.9],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: horizontalX.value },
        { scale },
      ],
      opacity: horizontalOpacity.value,
    };
  });

  const featuredStyle = useAnimatedStyle(() => {
    // Featured card: smooth crossfade with subtle pulse
    return {
      opacity: featuredOpacity.value,
      transform: [{ scale: featuredScale.value }],
    };
  });

  // New card sliding in from right
  const newCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      newCardX.value,
      [200, 0],
      [5, 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: newCardX.value },
        { scale: newCardScale.value },
        { rotate: `${rotate}deg` },
      ],
      opacity: newCardOpacity.value,
    };
  });

  // Refs to store data (avoids async state/closure issues)
  const incomingStoreRef = useRef<NewStore | null>(null);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const smallStoresRef = useRef<NewStore[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    smallStoresRef.current = smallStores;
  }, [smallStores]);

  // Rotation logic - waterfall: each card moves to the next position
  const rotateStores = useCallback(() => {
    const incoming = incomingStoreRef.current;
    const currentSmallStores = smallStoresRef.current;

    if (allStores.length < 5 || !incoming) {
      return;
    }

    // Waterfall data flow:
    // - New card (incoming) → Small 1 position
    // - Old Small 1 → Small 2 position
    // - Old Small 2 → Horizontal position
    // - Old Horizontal → exits (gone)

    // Get current values from ref (not closure)
    const oldSmall1 = currentSmallStores[0];
    const oldSmall2 = currentSmallStores[1];

    // Waterfall: shift cards down
    setSmallStores([incoming, oldSmall1]); // Incoming → Small1, Old Small1 → Small2
    setHorizontalStore(oldSmall2); // Old Small2 → Horizontal

    // Featured cycles through stores (separate from waterfall)
    setCurrentIndex((prev) => {
      const nextIndex = (prev + 1) % allStores.length;
      return nextIndex;
    });
    setFeaturedStore(allStores[(prev + 1) % allStores.length]);
  }, [allStores]);

  // Animation trigger function - Smooth waterfall cascade with staggered timing
  const triggerWaterfallAnimation = useCallback(() => {
    if (allStores.length < 5 || isPaused || isAnimating) return;

    setIsAnimating(true);

    // Calculate the next store that will slide in from the right
    // This should be the store that will become the new Small1 after rotation
    const nextQueueIndex = (currentIndex + 4) % allStores.length;
    const incomingStoreData = allStores[nextQueueIndex];

    // Store in ref (for rotation) and state (for rendering)
    incomingStoreRef.current = incomingStoreData;
    setIncomingStore(incomingStoreData);

    // Smooth easing curves for natural waterfall motion
    const easeOutCubic = Easing.bezier(0.33, 1, 0.68, 1);
    const easeInOutCubic = Easing.bezier(0.65, 0, 0.35, 1);
    const easeOutQuart = Easing.bezier(0.25, 1, 0.5, 1);
    const easeOutBack = Easing.bezier(0.34, 1.56, 0.64, 1); // Slight overshoot

    // ============ NEW CARD: Slides in from right ============
    // Reset position first
    newCardX.value = 200;
    newCardOpacity.value = 0;
    newCardScale.value = 0.85;

    // Animate in with slight delay to sync with falling cards
    newCardX.value = withDelay(
      100,
      withTiming(0, {
        duration: ANIMATION_DURATION * 0.9,
        easing: easeOutBack,
      })
    );
    newCardOpacity.value = withDelay(
      100,
      withTiming(1, {
        duration: ANIMATION_DURATION * 0.6,
        easing: easeOutCubic,
      })
    );
    newCardScale.value = withDelay(
      100,
      withTiming(1, {
        duration: ANIMATION_DURATION * 0.9,
        easing: easeOutBack,
      })
    );

    // ============ CARD 1: Slides down to Card 2 position (stays fully visible!) ============
    smallCard1Y.value = withTiming(SMALL_CARD_HEIGHT, {
      duration: ANIMATION_DURATION * 0.8, // Faster to reach bottom
      easing: easeOutCubic,
    });
    // Card 1 stays fully visible during animation

    // ============ CARD 2: Stays visible until Card 1 takes its place, then fades ============
    smallCard2Y.value = withDelay(
      ANIMATION_DURATION * 0.6, // Start moving after Card 1 is mostly in place
      withTiming(SMALL_CARD_HEIGHT * 0.5, {
        duration: ANIMATION_DURATION * 0.5,
        easing: easeOutCubic,
      })
    );
    // Card 2 fades AFTER Card 1 has arrived at its position
    smallCard2Opacity.value = withDelay(
      ANIMATION_DURATION * 0.7, // Wait for Card 1 to be in place
      withTiming(0, { duration: ANIMATION_DURATION * 0.4, easing: easeOutCubic })
    );

    // ============ HORIZONTAL CARD: Slides out to the RIGHT ============
    horizontalX.value = withDelay(
      STAGGER_DELAY * 2,
      withTiming(350, { // Slide far right off screen
        duration: ANIMATION_DURATION * 1.1,
        easing: easeOutCubic,
      })
    );
    horizontalOpacity.value = withDelay(
      STAGGER_DELAY * 2 + ANIMATION_DURATION * 0.5,
      withTiming(0, {
        duration: ANIMATION_DURATION * 0.5,
        easing: easeOutCubic,
      })
    );

    // ============ FEATURED CARD: Smooth crossfade with pulse ============
    featuredScale.value = withSequence(
      withTiming(0.98, { duration: ANIMATION_DURATION * 0.3, easing: easeInOutCubic }),
      withTiming(1.02, { duration: ANIMATION_DURATION * 0.4, easing: easeInOutCubic }),
      withTiming(1, { duration: ANIMATION_DURATION * 0.3, easing: easeOutCubic })
    );
    featuredOpacity.value = withSequence(
      withTiming(0.7, { duration: ANIMATION_DURATION * 0.4, easing: easeInOutCubic }),
      withTiming(1, { duration: ANIMATION_DURATION * 0.6, easing: easeOutCubic })
    );

    // After animation completes, update data and reset positions smoothly
    const totalAnimationTime = ANIMATION_DURATION + STAGGER_DELAY * 2 + 250;
    if (!isMounted()) return;
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = setTimeout(() => {
      animationTimeoutRef.current = null;
      if (!isMounted()) return;
      rotateStores();

      // Reset positions instantly
      smallCard1Y.value = 0;
      smallCard1Opacity.value = 1;
      smallCard2Y.value = 0;
      smallCard2Opacity.value = 1;
      horizontalX.value = 0; // Reset horizontal X position
      horizontalOpacity.value = 1;

      // Hide incoming card (it's now part of the main cards)
      newCardOpacity.value = 0;
      newCardX.value = 200;

      // Clear incoming store
      incomingStoreRef.current = null;
      setIncomingStore(null);
      setIsAnimating(false);
    }, totalAnimationTime);
  }, [allStores, isPaused, isAnimating, currentIndex, rotateStores, isMounted]);

  // Clear animation timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };
  }, []);

  // Fetch stores and set up initial display
  useEffect(() => {
    const fetchTrendingStores = async () => {
      try {
        setIsLoading(true);
        // Fetch more stores for rotation queue (10-12 stores)
        const response = await storesApi.getTrendingStores({ limit: 12, days: 7 });

        if (response.success && response.data?.stores && response.data.stores.length > 0) {
          const stores = response.data.stores;

          // Transform all stores for the queue
          const transformedStores = stores.map(transformStoreData);
          if (!isMounted()) return;
          setAllStores(transformedStores);

          // Set initial display (first 4 stores)
          if (transformedStores.length > 0) {
            if (!isMounted()) return;
            setFeaturedStore(transformedStores[0]);
          }

          if (transformedStores.length > 2) {
            setSmallStores(transformedStores.slice(1, 3));
          } else if (transformedStores.length > 1) {
            setSmallStores(transformedStores.slice(1));
          }

          if (transformedStores.length > 3) {
            setHorizontalStore(transformedStores[3]);
          }
        }
      } catch (error) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setIsLoading(false);
      }
    };

    fetchTrendingStores();
  }, []);

  // Auto-rotation timer
  useEffect(() => {
    if (allStores.length < 5 || isPaused) return;

    const interval = setInterval(() => {
      triggerWaterfallAnimation();
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [allStores.length, isPaused, triggerWaterfallAnimation]);

  // Pause/resume on hover - attach native DOM listeners for web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const handleMouseEnter = () => {
      setIsPaused(true);
    };

    const handleMouseLeave = () => {
      setIsPaused(false);
    };

    // Use a small delay to ensure DOM is ready, then find the element
    const timer = setTimeout(() => {
      // Find by data-testid attribute (React Native Web creates this from dataSet)
      const domElement = document.querySelector('[data-testid="trending-container"]');
      if (domElement) {
        domElement.addEventListener('mouseenter', handleMouseEnter);
        domElement.addEventListener('mouseleave', handleMouseLeave);

        // Store reference for cleanup
        (window as any).__trendingHoverElement = domElement;
        (window as any).__trendingMouseEnter = handleMouseEnter;
        (window as any).__trendingMouseLeave = handleMouseLeave;
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      const domElement = (window as any).__trendingHoverElement;
      const mouseEnter = (window as any).__trendingMouseEnter;
      const mouseLeave = (window as any).__trendingMouseLeave;
      if (domElement && mouseEnter && mouseLeave) {
        domElement.removeEventListener('mouseenter', mouseEnter);
        domElement.removeEventListener('mouseleave', mouseLeave);
      }
    };
  }, []);

  const handleViewAll = () => {
    router.push('/explore');
  };

  const handleStorePress = (id: string) => {
    router.push(`/MainStorePage?storeId=${id}` as any);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.nileBlue} />
      </View>
    );
  }

  // Don't render if no data
  if (!featuredStore && smallStores.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.container}
      testID="trending-container"
      // @ts-ignore - web specific prop for hover detection
      dataSet={{ testid: 'trending-container' }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.fireIcon}>🔥</Text>
            <Text style={styles.headerTitle}>Trending Near You</Text>
          </View>
          <Text style={styles.headerSubtitle}>Popular in your area</Text>
        </View>
        <Pressable onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      {/* Main Grid: Featured + Small Cards */}
      <View style={styles.mainGrid}>
        {/* Featured Large Card (Left) - crossfade with pulse */}
        {featuredStore && (
          <Animated.View style={[styles.featuredCard, featuredStyle, webAnimationStyle]}>
            <Pressable
              style={styles.featuredCardInner}
              onPress={() => handleStorePress(featuredStore.id)}
             
            >
              <View style={styles.featuredImage}>
                {/* Video or Image Background */}
                {featuredStore.video ? (
                  <AutoPlayVideo
                    uri={featuredStore.video}
                    poster={featuredStore.videoThumbnail || featuredStore.image}
                    style={StyleSheet.absoluteFill}
                  />
                ) : (
                  <CachedImage
                    source={featuredStore.image}
                    style={[StyleSheet.absoluteFill, styles.featuredImageStyle]}
                    contentFit="cover"
                  />
                )}
                {/* Gradient Overlay */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.featuredGradient}
                >
                  {/* Top Badges */}
                  <View style={styles.featuredTopRow}>
                    <View style={styles.peopleBadge}>
                      <Text style={styles.fireEmoji}>🔥</Text>
                      <Text style={styles.peopleText}>{featuredStore.people}</Text>
                    </View>
                    <View style={styles.cashbackBadge}>
                      <Text style={styles.cashbackBadgeText}>{featuredStore.cashback} cashback</Text>
                    </View>
                  </View>

                  {/* Bottom Content */}
                  <View style={styles.featuredBottom}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{featuredStore.category}</Text>
                    </View>
                    <Text style={styles.featuredName}>{featuredStore.name}</Text>
                    <View style={styles.earnRow}>
                      <Text style={styles.earnText}>Earn rewards</Text>
                      <View style={styles.coinsBadgeSmall}>
                        <Text style={styles.coinsText}>Coins</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* Small Cards Column (Right) - with waterfall animation */}
        {smallStores.length > 0 && (
          <View style={styles.smallCardsColumn}>
            {/* Incoming New Card - slides in from right */}
            {incomingStore && isAnimating && (
              <Animated.View style={[styles.incomingCardWrapper, newCardStyle, webAnimationStyle]}>
                <Pressable
                  style={styles.smallCard}
                  onPress={() => handleStorePress(incomingStore.id)}
                 
                >
                  <View style={styles.smallImageContainer}>
                    {incomingStore.video ? (
                      <AutoPlayVideo
                        uri={incomingStore.video}
                        poster={incomingStore.videoThumbnail || incomingStore.image}
                        style={styles.smallImage}
                      />
                    ) : (
                      <CachedImage
                        source={incomingStore.image}
                        style={styles.smallImage}
                        contentFit="cover"
                      />
                    )}
                    <View style={styles.smallPeopleBadge}>
                      <Text style={styles.fireEmoji}>🔥</Text>
                      <Text style={styles.smallPeopleText}>{incomingStore.people}</Text>
                    </View>
                  </View>
                  <View style={styles.smallContent}>
                    <Text style={styles.smallCategory}>{incomingStore.category}</Text>
                    <Text style={styles.smallName} numberOfLines={1}>{incomingStore.name}</Text>
                    <View style={styles.smallRewardRow}>
                      <Text style={styles.smallCashback}>{incomingStore.cashback}</Text>
                      <CoinIcon size={12} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            )}

            {/* Small Card 1 - slides down first (waterfall) */}
            {smallStores[0] && (
              <Animated.View style={[styles.smallCardWrapper, smallCard1Style, webAnimationStyle]}>
                <Pressable
                  style={styles.smallCard}
                  onPress={() => handleStorePress(smallStores[0].id)}
                 
                >
                  <View style={styles.smallImageContainer}>
                    {smallStores[0].video ? (
                      <AutoPlayVideo
                        uri={smallStores[0].video}
                        poster={smallStores[0].videoThumbnail || smallStores[0].image}
                        style={styles.smallImage}
                      />
                    ) : (
                      <CachedImage
                        source={smallStores[0].image}
                        style={styles.smallImage}
                        contentFit="cover"
                      />
                    )}
                    <View style={styles.smallPeopleBadge}>
                      <Text style={styles.fireEmoji}>🔥</Text>
                      <Text style={styles.smallPeopleText}>{smallStores[0].people}</Text>
                    </View>
                  </View>
                  <View style={styles.smallContent}>
                    <Text style={styles.smallCategory}>{smallStores[0].category}</Text>
                    <Text style={styles.smallName} numberOfLines={1}>{smallStores[0].name}</Text>
                    <View style={styles.smallRewardRow}>
                      <Text style={styles.smallCashback}>{smallStores[0].cashback}</Text>
                      <CoinIcon size={12} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            )}

            {/* Small Card 2 - slides down with delay (cascade) */}
            {smallStores[1] && (
              <Animated.View style={[styles.smallCardWrapper, smallCard2Style, webAnimationStyle]}>
                <Pressable
                  style={styles.smallCard}
                  onPress={() => handleStorePress(smallStores[1].id)}
                 
                >
                  <View style={styles.smallImageContainer}>
                    {smallStores[1].video ? (
                      <AutoPlayVideo
                        uri={smallStores[1].video}
                        poster={smallStores[1].videoThumbnail || smallStores[1].image}
                        style={styles.smallImage}
                      />
                    ) : (
                      <CachedImage
                        source={smallStores[1].image}
                        style={styles.smallImage}
                        contentFit="cover"
                      />
                    )}
                    <View style={styles.smallPeopleBadge}>
                      <Text style={styles.fireEmoji}>🔥</Text>
                      <Text style={styles.smallPeopleText}>{smallStores[1].people}</Text>
                    </View>
                  </View>
                  <View style={styles.smallContent}>
                    <Text style={styles.smallCategory}>{smallStores[1].category}</Text>
                    <Text style={styles.smallName} numberOfLines={1}>{smallStores[1].name}</Text>
                    <View style={styles.smallRewardRow}>
                      <Text style={styles.smallCashback}>{smallStores[1].cashback}</Text>
                      <CoinIcon size={12} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            )}
          </View>
        )}
      </View>

      {/* Horizontal Card (Bottom) - slides out last */}
      {horizontalStore && (
        <Animated.View style={[styles.horizontalCardWrapper, horizontalStyle, webAnimationStyle]}>
          <Pressable
            style={styles.horizontalCard}
            onPress={() => handleStorePress(horizontalStore.id)}
           
          >
            <LinearGradient
              colors={['rgba(249, 115, 22, 0.1)', 'rgba(236, 72, 153, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.horizontalGradient}
            >
              <View style={styles.horizontalImageContainer}>
                {horizontalStore.video ? (
                  <AutoPlayVideo
                    uri={horizontalStore.video}
                    poster={horizontalStore.videoThumbnail || horizontalStore.image}
                    style={styles.horizontalImage}
                  />
                ) : (
                  <CachedImage
                    source={horizontalStore.image}
                    style={styles.horizontalImage}
                    contentFit="cover"
                  />
                )}
              </View>
              <View style={styles.horizontalContent}>
                <View style={styles.horizontalNameRow}>
                  <Text style={styles.horizontalName}>{horizontalStore.name}</Text>
                  <View style={styles.horizontalPeopleBadge}>
                    <Text style={styles.fireEmoji}>🔥</Text>
                    <Text style={styles.horizontalPeopleText}>{horizontalStore.people}</Text>
                  </View>
                </View>
                <Text style={styles.horizontalCategory}>{horizontalStore.category}</Text>
              </View>
              <View style={styles.horizontalRight}>
                <Text style={styles.horizontalCashback}>{horizontalStore.cashback} cashback</Text>
                <View style={styles.horizontalCoinsRow}>
                  <CoinIcon size={14} />
                  <Text style={styles.horizontalCoins}>Earn coins</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  loadingContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fireIcon: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.nileBlue,
  },

  // Main Grid
  mainGrid: {
    flexDirection: 'row',
    height: 320,
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // Featured Card (Left)
  featuredCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  featuredCardInner: {
    flex: 1,
  },
  featuredImage: {
    flex: 1,
  },
  featuredImageStyle: {
    borderRadius: 24,
  },
  featuredGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 12,
  },
  featuredTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  peopleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.orange500,
  },
  fireEmoji: {
    fontSize: 12,
  },
  peopleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  cashbackBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.nileBlue,
  },
  cashbackBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  featuredBottom: {
    gap: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  featuredName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  earnText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  coinsBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COLORS.amber500,
  },
  coinsText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Small Cards (Right Column)
  smallCardsColumn: {
    flex: 1,
    gap: CARD_GAP,
    overflow: 'hidden', // Clip cards during waterfall animation
    position: 'relative',
  },
  smallCardWrapper: {
    flex: 1,
  },
  incomingCardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%', // Same height as small card
    zIndex: 10,
  },
  smallCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  smallImageContainer: {
    height: 80,
    position: 'relative',
  },
  smallImage: {
    width: '100%',
    height: '100%',
  },
  smallPeopleBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COLORS.orange500,
  },
  smallPeopleText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  smallContent: {
    padding: 10,
  },
  smallCategory: {
    fontSize: 11,
    color: COLORS.gray600,
    marginBottom: 2,
  },
  smallName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 6,
  },
  smallRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallCashback: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.nileBlue,
  },
  coinDot: {
    fontSize: 14,
  },

  // Horizontal Card (Bottom)
  horizontalCardWrapper: {
    overflow: 'hidden', // Clip during animation
  },
  horizontalCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  horizontalGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  horizontalImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  horizontalImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  horizontalContent: {
    flex: 1,
  },
  horizontalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  horizontalName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
  horizontalPeopleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
  },
  horizontalPeopleText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.orange500,
  },
  horizontalCategory: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  horizontalRight: {
    alignItems: 'flex-end',
  },
  horizontalCashback: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.nileBlue,
    marginBottom: 2,
  },
  horizontalCoinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  horizontalCoins: {
    fontSize: 11,
    color: COLORS.amber500,
  },
});

export default React.memo(NewOnNuqtaSection);
