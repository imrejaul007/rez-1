// @ts-nocheck
/**
 * MallDealsOfDay Component
 *
 * Flash deals section with countdown timer to midnight.
 * Shows time-sensitive offers that refresh daily.
 * Urgent red/orange gradient container for visual urgency.
 */

import React, { memo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MallOffer } from '../../types/mall.types';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

interface MallDealsOfDayProps {
  offers: MallOffer[];
  isLoading?: boolean;
  onOfferPress: (offer: MallOffer) => void;
  onViewAllPress?: () => void;
}

function getTimeUntilMidnight(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

const MallDealsOfDay: React.FC<MallDealsOfDayProps> = ({
  offers,
  isLoading = false,
  onOfferPress,
  onViewAllPress,
}) => {
  const [countdown, setCountdown] = useState(getTimeUntilMidnight);
  const pulseAnim = useSharedValue(1);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation for urgency dot
  useEffect(() => {
    pulseAnim.value = withRepeat(withSequence(withTiming(0.3, { duration: 800 }), withTiming(1, { duration: 800 })), -1);
      }, [pulseAnim]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const renderOffer = useCallback(
    ({ item }: { item: MallOffer }) => {
      const brandName = item.brand?.name || item.store?.name || 'Store';
      const brandLogo = item.brand?.logo || item.store?.logo;
      const discountDisplay = item.valueType === 'percentage'
        ? `${item.value}% OFF`
        : `${item.value} OFF`;

      return (
        <Pressable
          style={styles.dealCard}
          onPress={() => onOfferPress(item)}
         
        >
          {/* Discount Badge */}
          <View style={styles.discountBadge}>
            <LinearGradient
              colors={[colors.error, colors.error]}
              style={styles.discountGradient}
            >
              <Text style={styles.discountText}>{discountDisplay}</Text>
            </LinearGradient>
          </View>

          {/* Offer Image or Brand Logo */}
          <View style={styles.dealImageContainer}>
            {item.image ? (
              <CachedImage
                source={item.image}
                style={styles.dealImage}
                contentFit="cover"
              />
            ) : brandLogo ? (
              <CachedImage
                source={brandLogo}
                style={styles.dealImage}
                contentFit="cover"
              />
            ) : (
              <LinearGradient
                colors={[colors.brand.orange, colors.brand.orangeDark]}
                style={styles.dealImageFallback}
              >
                <Ionicons name="flash" size={28} color={colors.background.primary} />
              </LinearGradient>
            )}
          </View>

          {/* Deal Info */}
          <View style={styles.dealInfo}>
            <Text style={styles.dealTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.dealBrand} numberOfLines={1}>{brandName}</Text>

            {/* Badge */}
            {item.badge && (
              <View style={styles.dealBadgeContainer}>
                <Text style={styles.dealBadgeText}>
                  {item.badge === 'flash-sale' ? 'Flash Sale' :
                   item.badge === 'limited-time' ? 'Limited Time' :
                   item.badge === 'best-deal' ? 'Best Deal' :
                   item.badge === 'mall-exclusive' ? 'Exclusive' : item.badge}
                </Text>
              </View>
            )}

            {/* Extra Coins */}
            {(item.extraCoins ?? 0) > 0 && (
              <View style={styles.extraCoinsRow}>
                <Ionicons name="flash" size={11} color={colors.brand.sky} />
                <Text style={styles.extraCoinsText}>+{item.extraCoins} Bonus Coins</Text>
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [onOfferPress]
  );

  const keyExtractor = useCallback((item: MallOffer) => item.id || item._id, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.errorScale[50], colors.errorScale[100], colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.headerRow}>
            <LinearGradient
              colors={[colors.brand.orange, colors.brand.orangeDark]}
              style={styles.iconWrapper}
            >
              <Ionicons name="flash" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Deals of the Day</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.brand.orange} />
            <Text style={styles.loadingText}>Loading today's deals...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.errorScale[50], colors.errorScale[100], colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <LinearGradient
              colors={[colors.brand.orange, colors.brand.orangeDark]}
              style={styles.iconWrapper}
            >
              <Ionicons name="flash" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Deals of the Day</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Text style={styles.subtitle}>
            Flash deals that expire at midnight
          </Text>

          {/* Empty State Placeholder */}
          <View style={styles.emptyStateContainer}>
            <Ionicons name="flash-outline" size={24} color={colors.neutral[400]} />
            <Text style={styles.emptyStateText}>No deals today - check back soon</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.errorScale[50], colors.errorScale[100], colors.background.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      >
        {/* Decorative Elements */}
        <View style={styles.decorativeElements}>
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <LinearGradient
            colors={[colors.brand.orange, colors.brand.orangeDark]}
            style={styles.iconWrapper}
          >
            <Ionicons name="flash" size={18} color={colors.background.primary} />
          </LinearGradient>
          <Text style={styles.title}>Deals of the Day</Text>
          <View style={styles.headerSpacer} />
          {onViewAllPress && (
            <Pressable
              style={styles.viewAllButton}
              onPress={onViewAllPress}
             
            >
              <Text style={styles.viewAllText}>View All</Text>
              <View style={styles.viewAllArrow}>
                <Ionicons name="arrow-forward" size={14} color={colors.brand.orange} />
              </View>
            </Pressable>
          )}
        </View>

        <Text style={styles.subtitle}>
          Flash deals that expire at midnight
        </Text>

        {/* Countdown Timer */}
        <View style={styles.countdownWrapper}>
          <LinearGradient
            colors={['rgba(249, 115, 22, 0.12)', 'rgba(234, 88, 12, 0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.countdownContainer}
          >
            <Animated.View style={[styles.urgencyDot, { opacity: pulseAnim }]} />
            <Text style={styles.countdownLabel}>Ends in</Text>
            <View style={styles.countdownDigits}>
              <View style={styles.digitBox}>
                <Text style={styles.digitText}>{pad(countdown.hours)}</Text>
                <Text style={styles.digitLabel}>HRS</Text>
              </View>
              <Text style={styles.digitSeparator}>:</Text>
              <View style={styles.digitBox}>
                <Text style={styles.digitText}>{pad(countdown.minutes)}</Text>
                <Text style={styles.digitLabel}>MIN</Text>
              </View>
              <Text style={styles.digitSeparator}>:</Text>
              <View style={styles.digitBox}>
                <Text style={styles.digitText}>{pad(countdown.seconds)}</Text>
                <Text style={styles.digitLabel}>SEC</Text>
              </View>
            </View>
            <View style={styles.dealCountBadge}>
              <Text style={styles.dealCountText}>{offers.length} deals</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Offers List */}
        <FlashList
          data={offers}
          renderItem={renderOffer}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          snapToInterval={200}
          decelerationRate="fast"
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={4}
          windowSize={4}
          initialNumToRender={2}
          estimatedItemSize={150}
        />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  gradientBackground: {
    paddingVertical: 20,
    borderRadius: 24,
    marginHorizontal: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeElements: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
  },
  decorCircle1: {
    width: 150,
    height: 150,
    top: -50,
    right: -30,
  },
  decorCircle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 10,
  },
  headerSpacer: {
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.orange,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.orange,
  },
  viewAllArrow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.tint.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownWrapper: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    gap: 10,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  countdownLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A3412',
  },
  countdownDigits: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  digitBox: {
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  digitText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.nileBlue,
  },
  digitLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.neutral[400],
    letterSpacing: 0.5,
  },
  digitSeparator: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brand.orange,
    marginHorizontal: 2,
  },
  dealCountBadge: {
    backgroundColor: colors.brand.orange,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  dealCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background.primary,
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 28,
    paddingBottom: 8,
  },
  dealCard: {
    width: 185,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.errorScale[100],
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.orange,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  discountGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.3,
  },
  dealImageContainer: {
    width: '100%',
    height: 100,
  },
  dealImage: {
    width: '100%',
    height: '100%',
  },
  dealImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealInfo: {
    padding: 12,
  },
  dealTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
    lineHeight: 18,
  },
  dealBrand: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 6,
  },
  dealBadgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tint.orange,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  dealBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9A3412',
  },
  extraCoinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  extraCoinsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.skyDark,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
});

export default memo(MallDealsOfDay);
