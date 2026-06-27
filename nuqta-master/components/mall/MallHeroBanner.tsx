// @ts-nocheck
/**
 * MallHeroBanner Component
 *
 * Premium auto-rotating carousel with promotional banners.
 * Full-width design with smooth animated transitions, auto-scroll,
 * and animated pagination dots. Production-optimized for scale.
 */

import React, { memo, useRef, useState, useEffect, useCallback } from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewToken,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MallBanner } from '../../types/mall.types';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HORIZONTAL_PADDING = 32;
const BANNER_GAP = 28;
const BANNER_WIDTH = SCREEN_WIDTH - BANNER_HORIZONTAL_PADDING * 2;
const SNAP_INTERVAL = BANNER_WIDTH + BANNER_GAP;
const BANNER_HEIGHT = 175;
const AUTO_SCROLL_INTERVAL = 4500;
const DOT_SIZE = 8;
const DOT_ACTIVE_WIDTH = 24;

const DEFAULT_BANNERS: MallBanner[] = [
  {
    _id: 'default-1',
    id: 'default-1',
    title: `Welcome to ${BRAND.APP_NAME} Mall`,
    subtitle: `Shop from top stores and earn ${BRAND.COIN_NAME} on every purchase`,
    badge: `${BRAND.APP_NAME.toUpperCase()} MALL`,
    image: '',
    backgroundColor: colors.nileBlue,
    textColor: colors.background.primary,
    ctaText: 'Explore Now',
    ctaAction: 'navigate',
    ctaUrl: '/mall/brands',
    gradientColors: [colors.nileBlue, colors.brand.sky],
    position: 'hero' as any,
    priority: 1,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    _id: 'default-2',
    id: 'default-2',
    title: 'Earn Coins. Save More.',
    subtitle: `Get up to 20% cashback in ${BRAND.COIN_NAME} on featured stores`,
    badge: 'REWARDS',
    image: '',
    backgroundColor: colors.brand.sky,
    textColor: colors.background.primary,
    ctaText: 'View Stores',
    ctaAction: 'navigate',
    ctaUrl: '/mall/brands?filter=featured',
    gradientColors: [colors.brand.sky, colors.brand.cyan],
    position: 'hero' as any,
    priority: 2,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    _id: 'default-3',
    id: 'default-3',
    title: 'Premium Stores',
    subtitle: 'Discover luxury brands with exclusive deals and premium rewards',
    badge: 'PREMIUM',
    image: '',
    backgroundColor: colors.nileBlue,
    textColor: colors.background.primary,
    ctaText: 'Shop Premium',
    ctaAction: 'navigate',
    ctaUrl: '/mall/brands?filter=luxury',
    gradientColors: [colors.nileBlue, colors.neutral[700]],
    position: 'hero' as any,
    priority: 3,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
];

interface MallHeroBannerProps {
  banners: MallBanner[];
  isLoading?: boolean;
  onBannerPress?: (banner: MallBanner) => void;
}

// Individual pagination dot with reanimated
const PaginationDot: React.FC<{ index: number; activeIndex: SharedValue<number> }> = memo(({ index, activeIndex }) => {
  const dotStyle = useAnimatedStyle(() => {
    const isActive = activeIndex.value === index ? 1 : 0;
    return {
      width: withSpring(isActive ? DOT_ACTIVE_WIDTH : DOT_SIZE, { damping: 15, stiffness: 120 }),
      opacity: withSpring(isActive ? 1 : 0.35, { damping: 15, stiffness: 120 }),
    };
  });

  return <Animated.View style={[paginationDotStyle, dotStyle]} />;
});

// Static style for pagination dot (height + borderRadius)
const paginationDotStyle = {
  height: DOT_SIZE,
  borderRadius: DOT_SIZE / 2,
  backgroundColor: colors.nileBlue,
};

const isValidImageUrl = (url: string | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

const MallHeroBanner: React.FC<MallHeroBannerProps> = ({
  banners,
  isLoading = false,
  onBannerPress,
}) => {
  const flatListRef = useRef<FlashList<MallBanner>>(null);
  const currentIndexRef = useRef(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUserScrolling = useRef(false);
  const activeIndexShared = useSharedValue(0);

  const displayBanners = (!banners || banners.length === 0) ? DEFAULT_BANNERS : banners;

  const animateDots = useCallback((activeIndex: number) => {
    activeIndexShared.value = activeIndex;
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    if (index >= 0 && index < displayBanners.length) {
      flatListRef.current?.scrollToOffset({
        offset: index * SNAP_INTERVAL,
        animated: true,
      });
      currentIndexRef.current = index;
      animateDots(index);
    }
  }, [displayBanners.length, animateDots]);

  // Auto-scroll: single stable interval, no re-creation
  useEffect(() => {
    if (displayBanners.length <= 1) return;

    autoScrollTimer.current = setInterval(() => {
      if (isUserScrolling.current) return;
      const nextIndex = (currentIndexRef.current + 1) % displayBanners.length;
      scrollToIndex(nextIndex);
    }, AUTO_SCROLL_INTERVAL);

    return () => {
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, [displayBanners.length, scrollToIndex]);

  const onScrollBeginDrag = useCallback(() => {
    isUserScrolling.current = true;
  }, []);

  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isUserScrolling.current = false;
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SNAP_INTERVAL);
    const clampedIndex = Math.max(0, Math.min(index, displayBanners.length - 1));
    currentIndexRef.current = clampedIndex;
    animateDots(clampedIndex);
  }, [displayBanners.length, animateDots]);

  const handleBannerPress = useCallback((banner: MallBanner) => {
    onBannerPress?.(banner);
  }, [onBannerPress]);

  const renderBanner = useCallback(({ item }: { item: MallBanner }) => {
    const gradientColors = item.gradientColors || [colors.nileBlue, colors.brand.sky];
    const hasValidImage = isValidImageUrl(item.image);

    return (
      <Pressable
        style={styles.bannerContainer}
        onPress={() => handleBannerPress(item)}
       
      >
        <LinearGradient
          colors={gradientColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bannerGradient}
        >
          {hasValidImage && (
            <CachedImage
              source={item.image}
              style={styles.bannerImage}
              contentFit="cover"
            />
          )}

          {/* Left-to-right gradient overlay for text readability */}
          <LinearGradient
            colors={[
              'rgba(26, 58, 82, 0.95)',
              'rgba(26, 58, 82, 0.78)',
              'rgba(26, 58, 82, 0.35)',
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.textOverlay}
          />

          {/* Decorative accent line */}
          <View style={styles.accentLine} />

          {/* Content */}
          <View style={styles.bannerContent}>
            {item.badge && (
              <View style={styles.badge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}

            <Text style={styles.bannerTitle} numberOfLines={2}>
              {item.title}
            </Text>

            {item.subtitle && (
              <Text style={styles.bannerSubtitle} numberOfLines={2}>
                {item.subtitle}
              </Text>
            )}

            {item.ctaText && (
              <Pressable
                style={styles.ctaButton}
                onPress={() => handleBannerPress(item)}
               
              >
                <Text style={styles.ctaButtonText}>{item.ctaText}</Text>
                <View style={styles.ctaArrow}>
                  <Ionicons name="arrow-forward" size={14} color={colors.nileBlue} />
                </View>
              </Pressable>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    );
  }, [handleBannerPress]);

  const keyExtractor = useCallback((item: MallBanner) => item.id || item._id, []);


  const ItemSeparator = useCallback(() => (
    <View style={{ width: BANNER_GAP }} />
  ), []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={[colors.lavenderMist, colors.tint.blue]}
            style={styles.loadingSkeleton}
          >
            <ActivityIndicator size="large" color={colors.nileBlue} />
          </LinearGradient>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        ref={flatListRef}
        data={displayBanners}
        renderItem={renderBanner}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={32}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        estimatedItemSize={200}
        ItemSeparatorComponent={ItemSeparator}
        removeClippedSubviews={Platform.OS !== 'web'}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
      />

      {/* External animated pagination dots */}
      {displayBanners.length > 1 && (
        <View style={styles.paginationContainer}>
          {displayBanners.map((_, index) => (
            <PaginationDot
              key={index}
              index={index}
              activeIndex={activeIndexShared}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  listContent: {
    paddingLeft: BANNER_HORIZONTAL_PADDING - 25,
    paddingRight: BANNER_HORIZONTAL_PADDING + 25,
  },
  bannerContainer: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bannerGradient: {
    flex: 1,
    position: 'relative',
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 28,
    bottom: 28,
    width: 3.5,
    backgroundColor: colors.warningScale[400],
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  bannerContent: {
    flex: 1,
    paddingLeft: 18,
    paddingRight: 14,
    paddingTop: 16,
    paddingBottom: 14,
    justifyContent: 'center',
    zIndex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 8,
    gap: 4,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.warningScale[400],
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.warningScale[700],
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.background.primary,
    marginBottom: 5,
    lineHeight: 22,
    maxWidth: '75%',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
      web: {
        textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  bannerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 10,
    lineHeight: 15,
    maxWidth: '75%',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.background.primary,
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ctaButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  ctaArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  // paginationDot style moved to module-level for reanimated PaginationDot component
  loadingContainer: {
    paddingHorizontal: BANNER_HORIZONTAL_PADDING,
  },
  loadingSkeleton: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(MallHeroBanner);
