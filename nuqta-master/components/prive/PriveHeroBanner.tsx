// @ts-nocheck
/**
 * PriveHeroBanner Component
 *
 * Premium auto-rotating carousel for Privé tab
 * 3D luxury design with glowing gold accents
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
import { LinearGradient } from 'expo-linear-gradient';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { Ionicons } from '@expo/vector-icons';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 20; // 10px padding on each side
const BANNER_HEIGHT = 170; // Compact height
const AUTO_SCROLL_INTERVAL = 4500;

interface PriveBanner {
  id: string;
  title: string;
  subtitle: string;
  highlight?: string;
  badge?: string;
  accentColor: string;
  gradientColors: [string, string, string];
  ctaText?: string;
  glowColor: string;
  stat?: { value: string; label: string };
}

// Static banners — only include banners backed by real features
const STATIC_BANNERS: PriveBanner[] = [
  {
    id: '1',
    title: 'Welcome to Privé',
    subtitle: 'Exclusive rewards for distinguished members',
    highlight: 'Premium Access',
    badge: 'VIP',
    accentColor: colors.brand.goldAccent,
    gradientColors: [colors.deepNavy, '#16213E', '#0F0F1A'],
    ctaText: 'Explore Benefits',
    glowColor: 'rgba(201, 169, 98, 0.4)',
  },
  {
    id: '2',
    title: 'Your Tier Progress',
    subtitle: 'Build your reputation to unlock higher tiers',
    highlight: 'Keep Engaging',
    badge: 'TIER',
    accentColor: colors.brand.purpleMedium,
    gradientColors: ['#1E1033', '#150A24', '#0A0512'],
    ctaText: 'Check Progress',
    glowColor: 'rgba(168, 85, 247, 0.35)',
  },
  {
    id: '3',
    title: 'Redeem Your Coins',
    subtitle: 'Convert coins into gift cards, experiences & more',
    highlight: 'Privé Exclusive',
    badge: 'REDEEM',
    accentColor: '#00D4AA',
    gradientColors: ['#0A2922', '#061A16', '#030F0C'],
    ctaText: 'Redeem Now',
    glowColor: 'rgba(0, 212, 170, 0.3)',
  },
];

interface PriveHeroBannerProps {
  banners?: PriveBanner[];
  onBannerPress?: (banner: PriveBanner) => void;
}

const PriveHeroBanner: React.FC<PriveHeroBannerProps> = ({
  banners = STATIC_BANNERS,
  onBannerPress,
}) => {
  const flatListRef = useRef<FlashList<PriveBanner>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (banners.length <= 1) return;

    autoScrollTimer.current = setInterval(() => {
      const nextIndex = (currentIndex + 1) % banners.length;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }, AUTO_SCROLL_INTERVAL);

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [currentIndex, banners.length]);

  const handleScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (BANNER_WIDTH + 10));
    if (index !== currentIndex && index >= 0 && index < banners.length) {
      setCurrentIndex(index);
    }
  }, [currentIndex, banners.length]);

  const handleBannerPress = useCallback((banner: PriveBanner) => {
    onBannerPress?.(banner);
  }, [onBannerPress]);

  const renderBanner = useCallback(({ item, index }: { item: PriveBanner; index: number }) => {
    const isActive = index === currentIndex;

    return (
      <Pressable
        style={[styles.bannerWrapper]}
        onPress={() => handleBannerPress(item)}
       
      >
        {/* Outer glow effect */}
        <View style={[styles.glowOuter, { shadowColor: item.accentColor }]} />

        {/* Main card with 3D depth */}
        <View style={styles.bannerContainer}>
          {/* Background gradient */}
          <LinearGradient
            colors={item.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          >
            {/* Inner glow border */}
            <LinearGradient
              colors={[`${item.accentColor}40`, 'transparent', `${item.accentColor}20`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.innerGlow}
            />

            {/* Top accent line with glow */}
            <View style={styles.topAccentContainer}>
              <LinearGradient
                colors={['transparent', item.accentColor, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.topAccentLine}
              />
              <View style={[styles.topAccentGlow, { backgroundColor: item.glowColor }]} />
            </View>

            {/* Content */}
            <View style={styles.bannerContent}>
              {/* Left content */}
              <View style={styles.bannerLeft}>
                {/* Badge with glass effect */}
                {item.badge && (
                  <View style={[styles.badgeContainer, { borderColor: `${item.accentColor}60` }]}>
                    <LinearGradient
                      colors={[`${item.accentColor}30`, `${item.accentColor}10`]}
                      style={styles.badgeGradient}
                    >
                      <Text style={[styles.badgeText, { color: item.accentColor }]}>
                        {item.badge}
                      </Text>
                    </LinearGradient>
                  </View>
                )}

                {/* Title with subtle shadow */}
                <Text style={styles.bannerTitle}>{item.title}</Text>

                {/* Subtitle */}
                <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>

                {/* CTA with glow */}
                {item.ctaText && (
                  <View
                    style={[styles.ctaButton, { borderColor: `${item.accentColor}50` }]}
                  >
                    <Text style={[styles.ctaText, { color: item.accentColor }]}>
                      {item.ctaText}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color={item.accentColor} />
                  </View>
                )}
              </View>

              {/* Right content - Stat card with 3D effect */}
              {item.stat && (
                <View style={styles.statContainer}>
                  <View style={[styles.statCard, { borderColor: `${item.accentColor}30` }]}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                      style={styles.statCardInner}
                    >
                      <Text style={[styles.statValue, { color: item.accentColor }]}>
                        {item.stat.value}
                      </Text>
                      <Text style={styles.statLabel}>{item.stat.label}</Text>
                    </LinearGradient>
                  </View>
                  {/* Stat card shadow for 3D depth */}
                  <View style={[styles.statCardShadow, { backgroundColor: item.glowColor }]} />
                </View>
              )}
            </View>

            {/* Highlight text at bottom */}
            {item.highlight && (
              <View style={styles.highlightContainer}>
                <View style={[styles.highlightDot, { backgroundColor: item.accentColor }]} />
                <Text style={[styles.highlightText, { color: item.accentColor }]}>
                  {item.highlight}
                </Text>
              </View>
            )}

            {/* Decorative floating particles */}
            <View style={[styles.particle1, { backgroundColor: `${item.accentColor}20` }]} />
            <View style={[styles.particle2, { backgroundColor: `${item.accentColor}15` }]} />
            <View style={[styles.particle3, { backgroundColor: `${item.accentColor}10` }]} />

            {/* Bottom reflection effect */}
            <LinearGradient
              colors={['transparent', `${item.accentColor}08`]}
              style={styles.bottomReflection}
            />
          </LinearGradient>
        </View>
      </Pressable>
    );
  }, [currentIndex, handleBannerPress]);

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {banners.map((banner, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentIndex && [
              styles.dotActive,
              { backgroundColor: banners[currentIndex].accentColor }
            ],
          ]}
        />
      ))}
    </View>
  );

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
        snapToInterval={BANNER_WIDTH + 10}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        estimatedItemSize={200}
      />
      {renderDots()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingRight: 16,
  },
  bannerWrapper: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    marginRight: 10,
  },
  glowOuter: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: PRIVE_RADIUS.xl + 4,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  bannerContainer: {
    flex: 1,
    borderRadius: PRIVE_RADIUS.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  bannerGradient: {
    flex: 1,
    borderRadius: PRIVE_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: PRIVE_RADIUS.xl,
    opacity: 0.5,
  },
  topAccentContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 3,
    alignItems: 'center',
  },
  topAccentLine: {
    width: '60%',
    height: 2,
    borderRadius: 1,
  },
  topAccentGlow: {
    position: 'absolute',
    top: -4,
    width: '40%',
    height: 10,
    borderRadius: 5,
    opacity: 0.6,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    paddingTop: 18,
    paddingRight: 16,
    paddingBottom: 8,
  },
  bannerLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 12,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    borderRadius: PRIVE_RADIUS.sm,
    borderWidth: 1,
    marginBottom: 6,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 6,
    letterSpacing: 0,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
    }),
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 10,
    lineHeight: 16,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: PRIVE_RADIUS.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statCardInner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 75,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statCardShadow: {
    position: 'absolute',
    bottom: -6,
    left: 8,
    right: 8,
    height: 16,
    borderRadius: 8,
    opacity: 0.4,
    transform: [{ scaleX: 0.8 }],
  },
  highlightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
  },
  highlightDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  highlightText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  particle1: {
    position: 'absolute',
    top: 25,
    right: 100,
    width: 35,
    height: 35,
    borderRadius: 18,
  },
  particle2: {
    position: 'absolute',
    top: 55,
    right: 85,
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  particle3: {
    position: 'absolute',
    bottom: 35,
    right: 110,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  bottomReflection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: PRIVE_SPACING.lg,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotActive: {
    width: 24,
    borderRadius: 3,
  },
});

export default memo(PriveHeroBanner);
