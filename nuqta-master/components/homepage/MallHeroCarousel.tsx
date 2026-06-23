// @ts-nocheck
/**
 * MallHeroCarousel Component
 *
 * Auto-rotating carousel for Nuqta Mall tab header
 * Replaces HeroBanner when Mall tab is selected
 * Same dimensions as HeroBanner for seamless transition
 */

import React, { memo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 2;
const BANNER_WIDTH = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - 4;
const BANNER_HEIGHT = 180;
const AUTO_SCROLL_INTERVAL = 4000;

interface CarouselItem {
  id: string;
  badge?: string;
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaUrl?: string;
  image?: string;
  gradientColors: string[];
}

// Default promotional banners for mall
const DEFAULT_BANNERS: CarouselItem[] = [
  {
    id: '1',
    badge: 'SALE',
    title: 'Fashion Sale',
    subtitle: 'Up to 50% off on top brands',
    ctaText: 'Shop Fashion',
    ctaUrl: '/mall/category/fashion',
    gradientColors: [colors.nileBlue, colors.brand.nileBlueLight, '#2d5c7e'],
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
  },
  {
    id: '2',
    badge: 'NEW',
    title: 'Electronics Fest',
    subtitle: 'Latest gadgets at best prices',
    ctaText: 'Shop Electronics',
    ctaUrl: '/mall/category/electronics',
    gradientColors: [colors.lightMustard, colors.lightPeach, colors.linen],
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
  },
  {
    id: '3',
    badge: 'TRENDING',
    title: 'Home & Living',
    subtitle: 'Transform your space with style',
    ctaText: 'Shop Home',
    ctaUrl: '/mall/category/home',
    gradientColors: [colors.nileBlue, colors.brand.nileBlueLight, '#2d5c7e'],
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
  },
  {
    id: '4',
    badge: 'DEALS',
    title: 'Beauty & Care',
    subtitle: 'Premium products, amazing prices',
    ctaText: 'Shop Beauty',
    ctaUrl: '/mall/category/beauty',
    gradientColors: [colors.lavenderMist, colors.nileBlue, colors.brand.nileBlueLight],
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
  },
];

interface MallHeroCarouselProps {
  banners?: CarouselItem[];
}

function MallHeroCarousel({ banners = DEFAULT_BANNERS }: MallHeroCarouselProps) {
  const router = useRouter();
  const flatListRef = useRef<FlashList<CarouselItem>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll effect
  useEffect(() => {
    if (banners.length <= 1) return;

    const startAutoScroll = () => {
      autoScrollTimer.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % banners.length;
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, AUTO_SCROLL_INTERVAL);
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [banners.length]);

  const handleScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / BANNER_WIDTH);
    if (index >= 0 && index < banners.length) {
      setCurrentIndex(index);
    }
  }, [banners.length]);

  const handleBannerPress = useCallback((banner: CarouselItem) => {
    if (banner.ctaUrl) {
      router.push(banner.ctaUrl as any);
    }
  }, [router]);

  const renderBanner = useCallback(({ item }: { item: CarouselItem }) => {
    return (
      <Pressable
        style={styles.bannerContainer}
        onPress={() => handleBannerPress(item)}
       
      >
        <LinearGradient
          colors={item.gradientColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bannerGradient}
        >
          {/* Banner Image */}
          {item.image && (
            <CachedImage
              source={item.image}
              style={styles.bannerImage}
              contentFit="cover"
            />
          )}

          {/* Dark Overlay for better text visibility */}
          <View style={styles.darkOverlay} />

          {/* Content Overlay */}
          <View style={styles.bannerContent}>
            {/* Badge */}
            {item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}

            {/* Title */}
            <Text style={styles.bannerTitle} numberOfLines={1}>
              {item.title}
            </Text>

            {/* Subtitle */}
            {item.subtitle && (
              <Text style={styles.bannerSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}

            {/* CTA Button */}
            {item.ctaText && (
              <Pressable
                style={styles.ctaButton}
                onPress={() => handleBannerPress(item)}
              >
                <Text style={styles.ctaButtonText}>{item.ctaText}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.lightMustard} />
              </Pressable>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    );
  }, [handleBannerPress]);

  if (!banners || banners.length === 0) {
    return null;
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
        scrollEventThrottle={16}
        snapToInterval={BANNER_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        estimatedItemSize={200}
      />

      {/* Pagination Dots */}
      {banners.length > 1 && (
        <View style={styles.pagination}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 12,
  },
  listContent: {
    paddingHorizontal: 0,
  },
  bannerContainer: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
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
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  bannerContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.lightMustard,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.background.primary,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  bannerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.lightMustard,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(26, 58, 82, 0.3)', // Light nile blue for inactive dots
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: colors.nileBlue, // Nile Blue for active dot (Nuqta Mall theme)
  },
});

export default memo(MallHeroCarousel);
