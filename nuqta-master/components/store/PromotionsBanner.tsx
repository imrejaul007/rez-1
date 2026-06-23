import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  ImageBackground,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DealCountdownTimer from './DealCountdownTimer';
import { PromotionBanner, PromotionBannerProps, PromotionBannerItemProps } from '@/types/promotions.types';
import { colors } from '@/constants/theme';

/**
 * PromotionsBanner Component
 *
 * Full-width banner at top of store page (below header)
 * Features:
 * - Auto-rotating carousel if multiple promotions
 * - Gradient background (purple to pink)
 * - Shows deal title, discount badge, countdown timer, "Shop Now" CTA
 * - Close button (X) to dismiss
 * - Animation: Slide in from top on mount
 * - Support multiple banner types
 *
 * @example
 * ```tsx
 * <PromotionsBanner
 *   banners={promotions}
 *   storeId="store-001"
 *   autoRotate={true}
 *   showCountdown={true}
 * />
 * ```
 */
function PromotionsBanner({
  banners,
  storeId,
  storeName,
  onBannerPress,
  onDismiss,
  autoRotate = true,
  rotationInterval = 5000,
  showCountdown = true,
  containerStyle,
}: PromotionBannerProps) {
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
  const slideAnim = useSharedValue(-100);
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter active and non-dismissed banners
  const visibleBanners = banners.filter(
    banner => banner.isActive !== false && !dismissedBanners.has(banner.id)
  );

  // Sort by priority (higher = more urgent)
  const sortedBanners = [...visibleBanners].sort((a, b) => b.priority - a.priority);

  // Slide in animation on mount
  useEffect(() => {
    if (sortedBanners.length > 0) {
      slideAnim.value = withSpring(0, { damping: 8, stiffness: 50 });
    }
  }, [sortedBanners.length]);

  // Auto-rotation logic
  useEffect(() => {
    if (!autoRotate || sortedBanners.length <= 1) {
      return;
    }

    rotationTimerRef.current = setInterval(() => {
      setActiveBannerIndex((prevIndex) => (prevIndex + 1) % sortedBanners.length);
    }, rotationInterval);

    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
      }
    };
  }, [autoRotate, sortedBanners.length, rotationInterval]);

  const slideAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  const handleDismiss = useCallback((bannerId: string) => {
    setDismissedBanners(prev => new Set(prev).add(bannerId));
    if (onDismiss) {
      onDismiss(bannerId);
    }

    // If all banners dismissed, animate out
    if (dismissedBanners.size + 1 >= banners.length) {
      slideAnim.value = withTiming(-100, { duration: 300 });
    }
  }, [onDismiss, dismissedBanners.size, banners.length]);

  const handleBannerPress = useCallback((banner: PromotionBanner) => {
    if (onBannerPress) {
      onBannerPress(banner);
    } else if (banner.ctaAction) {
      banner.ctaAction();
    }
  }, [onBannerPress]);

  // Don't render if no visible banners
  if (sortedBanners.length === 0) {
    return null;
  }

  const activeBanner = sortedBanners[activeBannerIndex];

  return (
    <Animated.View
      style={[
        styles.container,
        slideAnimatedStyle,
        containerStyle,
      ]}
    >
      {sortedBanners.length > 1 ? (
        // Carousel mode for multiple banners
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / Dimensions.get('window').width
            );
            setActiveBannerIndex(index);
          }}
        >
          {sortedBanners.map((banner, index) => (
            <PromotionBannerItem
              key={banner.id}
              banner={banner}
              onPress={handleBannerPress}
              onDismiss={handleDismiss}
              showCountdown={showCountdown}
              isActive={index === activeBannerIndex}
            />
          ))}
        </ScrollView>
      ) : (
        // Single banner mode
        <PromotionBannerItem
          banner={activeBanner}
          onPress={handleBannerPress}
          onDismiss={handleDismiss}
          showCountdown={showCountdown}
          isActive={true}
        />
      )}

      {/* Pagination Dots */}
      {sortedBanners.length > 1 && (
        <View style={styles.paginationContainer}>
          {sortedBanners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeBannerIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

/**
 * Individual Promotion Banner Item
 */
function PromotionBannerItem({
  banner,
  onPress,
  onDismiss,
  showCountdown,
  isActive,
}: PromotionBannerItemProps) {
  const screenWidth = Dimensions.get('window').width;
  const pulseAnim = useSharedValue(1);

  // Pulsing animation for critical urgency
  useEffect(() => {
    if (!banner.expiryDate || !isActive) return;

    const now = new Date().getTime();
    const expiry = new Date(banner.expiryDate).getTime();
    const timeRemaining = expiry - now;

    // Pulse if < 5 minutes remaining
    if (timeRemaining <= 300000 && timeRemaining > 0) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1
      );
    }
  }, [banner.expiryDate, isActive]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const gradientColors = banner.backgroundColor || [colors.brand.purple, colors.brand.pink];
  const textColor = banner.textColor || colors.text.white;

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        { width: screenWidth - 32 },
        pulseAnimatedStyle,
      ]}
    >
      <Pressable
       
        onPress={() => onPress && onPress(banner)}
        style={styles.touchableContainer}
      >
        {banner.image ? (
          <ImageBackground
            source={{ uri: banner.image }}
            style={styles.imageBackground}
            imageStyle={styles.backgroundImage}
          >
            <View style={styles.imageOverlay} />
            <BannerContent
              banner={banner}
              textColor={textColor}
              showCountdown={showCountdown}
              onDismiss={onDismiss}
            />
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <BannerContent
              banner={banner}
              textColor={textColor}
              showCountdown={showCountdown}
              onDismiss={onDismiss}
            />
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Banner Content Component
 */
function BannerContent({
  banner,
  textColor,
  showCountdown,
  onDismiss,
}: {
  banner: PromotionBanner;
  textColor: string;
  showCountdown?: boolean;
  onDismiss?: (bannerId: string) => void;
}) {
  return (
    <>
      {/* Close Button */}
      {onDismiss && (
        <Pressable
          style={styles.closeButton}
          onPress={() => onDismiss(banner.id)}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          accessibilityLabel="Dismiss banner"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={20} color={textColor} />
        </Pressable>
      )}

      {/* Banner Type Icon */}
      <View style={styles.typeIconContainer}>
        <Ionicons
          name={getBannerIcon(banner.type)}
          size={24}
          color={textColor}
        />
      </View>

      {/* Banner Content */}
      <View style={styles.contentContainer}>
        <View style={styles.textSection}>
          {/* Title */}
          <Text
            style={[styles.title, { color: textColor }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {banner.title}
          </Text>

          {/* Subtitle */}
          {banner.subtitle && (
            <Text
              style={[styles.subtitle, { color: textColor }]}
              numberOfLines={1}
            >
              {banner.subtitle}
            </Text>
          )}

          {/* Discount Badge */}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText} numberOfLines={1}>
              {banner.discountText}
            </Text>
          </View>
        </View>

        {/* Right Section: Countdown + CTA */}
        <View style={styles.rightSection}>
          {showCountdown && banner.expiryDate && (
            <View style={styles.countdownContainer}>
              <DealCountdownTimer
                expiryDate={banner.expiryDate}
                size="small"
                showLabel={false}
                containerStyle={styles.countdownTimer}
              />
            </View>
          )}

          {/* CTA Button */}
          <Pressable
            style={styles.ctaButton}
            onPress={() => banner.ctaAction && banner.ctaAction()}
            accessibilityLabel={banner.ctaText || 'Shop Now'}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText} numberOfLines={1}>
              {banner.ctaText || 'Shop Now'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.brand.purple} />
          </Pressable>
        </View>
      </View>
    </>
  );
}

/**
 * Get icon based on banner type
 */
function getBannerIcon(type: PromotionBanner['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'flash_sale':
      return 'flash';
    case 'limited_offer':
      return 'time';
    case 'weekend_special':
      return 'calendar';
    case 'clearance':
      return 'pricetag';
    case 'new_arrivals':
      return 'sparkles';
    case 'seasonal':
      return 'leaf';
    case 'exclusive':
      return 'star';
    default:
      return 'gift';
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  bannerContainer: {
    marginHorizontal: 0,
  },
  touchableContainer: {
    width: '100%',
    height: '100%',
  },
  imageBackground: {
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    borderRadius: 16,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    minHeight: 120,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 6,
    zIndex: 10,
  },
  typeIconContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  textSection: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
  },
  discountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  discountText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brand.purple,
    letterSpacing: 0.5,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
    minWidth: 100,
  },
  countdownContainer: {
    width: '100%',
  },
  countdownTimer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.purple,
    letterSpacing: 0.3,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: colors.background.primary,
  },
});

export default React.memo(PromotionsBanner);
