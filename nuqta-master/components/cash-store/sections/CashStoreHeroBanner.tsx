// @ts-nocheck
/**
 * CashStoreHeroBanner Component
 *
 * Premium hero banner section for Cash Store with promotional content
 * Features: Auto-scroll, animated badges, shine effects, and better typography
 */

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CashStoreHeroBanner as HeroBannerType } from '../../../types/cash-store.types';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const AUTO_SCROLL_INTERVAL = 5000; // 5 seconds

interface CashStoreHeroBannerProps {
  banners: HeroBannerType[];
  isLoading?: boolean;
  onBannerPress?: (banner: HeroBannerType) => void;
}

const CashStoreHeroBanner: React.FC<CashStoreHeroBannerProps> = ({
  banners,
  isLoading = false,
  onBannerPress,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlashList<HeroBannerType>>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
  const activeIndexRef = useRef(0); // Ref to track current index without re-running effects
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.95);
  const shineAnim = useSharedValue(0);
  const badgePulseAnim = useSharedValue(1);

  // Entry animation
  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 500 });
      scaleAnim.value = withSpring(1);
    
    // Start shine animation
    shineAnim.value = withRepeat(withSequence(withTiming(1, { duration: 2000 })), -1);
    
    // Badge pulse animation
    badgePulseAnim.value = withRepeat(withSequence(withTiming(1.1, { duration: 800 })), -1);
    
    // Cleanup animations on unmount
    return () => {
      // animation auto-cancels
      // animation auto-cancels
      // animation auto-cancels
    };
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Auto-scroll functionality
  useEffect(() => {
    if (banners.length <= 1) return;

    const startAutoScroll = () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
      autoScrollRef.current = setInterval(() => {
        const nextIndex = (activeIndexRef.current + 1) % banners.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
      }, AUTO_SCROLL_INTERVAL);
    };

    startAutoScroll();

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [banners.length]); // Only re-run when banners length changes

  const handleScroll = useCallback((event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (BANNER_WIDTH + 8));
    if (index !== activeIndex && index >= 0 && index < banners.length) {
      setActiveIndex(index);
      // Reset auto-scroll timer on manual scroll
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    }
  }, [activeIndex, banners.length]);

  const handleMomentumScrollEnd = useCallback(() => {
    // Restart auto-scroll after manual interaction
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
    }
    autoScrollRef.current = setInterval(() => {
      const nextIndex = (activeIndexRef.current + 1) % banners.length;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }, AUTO_SCROLL_INTERVAL);
  }, [banners.length]);

  const renderBanner = useCallback(
    ({ item, index }: { item: HeroBannerType; index: number }) => (
      <Pressable
       
        onPress={() => onBannerPress?.(item)}
        style={styles.bannerWrapper}
      >
        <Animated.View
          style={[
            styles.bannerAnimatedContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={item.gradientColors || [colors.linen, colors.background.primary, colors.background.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerCard}
          >
            {/* Shine overlay */}
            <Animated.View
              style={[
                styles.shineOverlay,
                {
                  transform: [
                    {
                      translateX: interpolate(shineAnim.value, [0, 1], [-BANNER_WIDTH, BANNER_WIDTH]),
                    },
                  ],
                },
              ]}
            />

            {/* Decorative circles */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            <View style={styles.decorativeCircle3} />

            {/* Badge */}
            {item.badge && (
              <Animated.View
                style={[
                  styles.badge,
                  {
                    transform: [{ scale: badgePulseAnim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.2)']}
                  style={styles.badgeGradient}
                >
                  <Ionicons name="flame" size={12} color={colors.background.primary} />
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </LinearGradient>
              </Animated.View>
            )}

            {/* Content */}
            <View style={styles.bannerContent}>
              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: item.textColor || colors.nileBlue }]}>
                  {item.title}
                </Text>
                {item.subtitle && (
                  <Text style={[styles.subtitle, { color: item.textColor || colors.nileBlue }]}>
                    {item.subtitle}
                  </Text>
                )}

                {/* CTA Button */}
                <Pressable style={styles.ctaButton}>
                  <LinearGradient
                    colors={[colors.background.primary, colors.neutral[50]]}
                    style={styles.ctaGradient}
                  >
                    <Text style={styles.ctaText}>{item.ctaText}</Text>
                    <View style={styles.ctaArrowContainer}>
                      <Ionicons name="arrow-forward" size={16} color={colors.background.primary} />
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Icon/Image */}
              <View style={styles.iconContainer}>
                <View style={styles.iconBackground}>
                  <Ionicons name="cart" size={44} color={colors.brand.sand} />
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    ),
    [onBannerPress, fadeAnim, scaleAnim, shineAnim, badgePulseAnim]
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.bannerWrapper, styles.skeletonBanner]}>
          <Animated.View
            style={[
              styles.skeletonShimmer,
              {
                transform: [
                  {
                    translateX: interpolate(shineAnim.value, [0, 1], [-BANNER_WIDTH, BANNER_WIDTH]),
                  },
                ],
              },
            ]}
          />
          <LinearGradient
            colors={[colors.neutral[200], colors.neutral[100], colors.neutral[200]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bannerCard}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        ref={flatListRef}
        data={banners}
        renderItem={renderBanner}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        snapToInterval={BANNER_WIDTH + 8}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        estimatedItemSize={BANNER_WIDTH + 8}
      />

      {/* Pagination Dots */}
      {banners.length > 1 && (
        <View style={styles.pagination}>
          {banners.map((_, index) => (
            <Pressable
              key={index}
              onPress={() => {
                flatListRef.current?.scrollToIndex({ index, animated: true });
                setActiveIndex(index);
              }}
              style={styles.paginationTouchable}
            >
              <Animated.View
                style={[
                  styles.paginationDot,
                  index === activeIndex && styles.paginationDotActive,
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  bannerWrapper: {
    width: BANNER_WIDTH,
    marginRight: 8,
  },
  bannerAnimatedContainer: {
    width: '100%',
  },
  bannerCard: {
    borderRadius: 20,
    padding: 24,
    minHeight: 180,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.brand.sand,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.sand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  shineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ skewX: '-20deg' }],
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,245,230,0.6)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,245,230,0.5)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: 60,
    right: 80,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,245,230,0.7)',
  },
  badge: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 20,
    lineHeight: 20,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 24,
    gap: 10,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.sand,
  },
  ctaArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brand.sand,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.sand,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  paginationTouchable: {
    padding: 4,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[300],
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: colors.brand.sand,
  },
  skeletonBanner: {
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.5)',
    zIndex: 1,
  },
});

export default memo(CashStoreHeroBanner);
