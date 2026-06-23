/**
 * CashStorePromoBanner Component
 *
 * Hero banner for Nuqta Cash Store - Dark Nile Blue design
 * Creates strong contrast against the warm page background
 *
 * Uses Nuqta Palette: Nile Blue (#1a3a52), Light Mustard (#ffcd57),
 * Light Peach (#ffd7b5), Linen (#faf1e0)
 */

import React, { memo, useEffect} from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform} from 'react-native';
import Animated, { useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

const CashStorePromoBanner: React.FC = () => {
  const router = useRouter();
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.95);
  const badgePulseAnim = useSharedValue(1);
  const arrowAnim = useSharedValue(0);

  useEffect(() => {
    // Entry animation
    fadeAnim.value = withDelay(100, withTiming(1, { duration: 500 }));
      scaleAnim.value = withSpring(1);

    // Badge pulse animation
    badgePulseAnim.value = withRepeat(withSequence(withTiming(1.08, { duration: 1000 })), -1);
    
    // Arrow bounce
    arrowAnim.value = withRepeat(withSequence(withTiming(4, { duration: 600 })), -1);
    
    return () => {
      // animation auto-cancels
      // animation auto-cancels
    };
  }, []);

  const handleStartShopping = () => {
    router.push('/cash-store/brands' as any);
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.bannerWrapper,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.nileBlue, '#1f3d56', colors.brand.nileBlueLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          {/* Decorative elements */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeLine1} />
          <View style={styles.decorativeLine2} />

          {/* HOT DEAL Badge - Gold accent */}
          <Animated.View
            style={[
              styles.hotDealBadge,
              { transform: [{ scale: badgePulseAnim }] },
            ]}
          >
            <LinearGradient
              colors={[colors.lightMustard, colors.brand.sand]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hotDealGradient}
            >
              <Ionicons name="flash" size={11} color={colors.nileBlue} />
              <Text style={styles.hotDealText}>HOT DEAL</Text>
            </LinearGradient>
          </Animated.View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>
                Earn cashback on{'\n'}every online order
              </Text>
              <Text style={styles.subtitle}>
                {`Shop from 1000+ partner brands with ${BRAND.APP_NAME} rewards`}
              </Text>

              {/* Start Shopping Button - Gold CTA */}
              <Pressable
                style={styles.ctaButton}
                onPress={handleStartShopping}
               
              >
                <LinearGradient
                  colors={[colors.lightMustard, colors.brand.sand]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>Start Shopping</Text>
                  <Animated.View style={{ transform: [{ translateX: arrowAnim }] }}>
                    <View style={styles.ctaArrow}>
                      <Ionicons name="arrow-forward" size={14} color={colors.nileBlue} />
                    </View>
                  </Animated.View>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Shopping Cart Icon - Gold themed */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['rgba(255,205,87,0.2)', 'rgba(255,205,87,0.08)']}
                style={styles.iconBackground}
              >
                <Ionicons name="cart" size={36} color={colors.lightMustard} />
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  bannerWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  banner: {
    borderRadius: 22,
    padding: 22,
    minHeight: 170,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,205,87,0.12)',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,205,87,0.07)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,215,181,0.05)',
  },
  decorativeLine1: {
    position: 'absolute',
    top: 25,
    right: 80,
    width: 45,
    height: 2,
    backgroundColor: 'rgba(255,205,87,0.15)',
    transform: [{ rotate: '45deg' }],
  },
  decorativeLine2: {
    position: 'absolute',
    bottom: 30,
    left: 10,
    width: 30,
    height: 2,
    backgroundColor: 'rgba(255,215,181,0.1)',
    transform: [{ rotate: '-30deg' }],
  },
  hotDealBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  hotDealGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  hotDealText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: 0.5,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 14,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.background.primary,
    marginBottom: 8,
    lineHeight: 27,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 18,
    lineHeight: 18,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 10,
    gap: 10,
    borderRadius: 14,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  ctaArrow: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(26,58,82,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBackground: {
    width: 76,
    height: 76,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,205,87,0.15)',
  },
});

export default memo(CashStorePromoBanner);
