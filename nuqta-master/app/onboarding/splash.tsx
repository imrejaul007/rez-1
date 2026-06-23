import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useEffect} from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming } from 'react-native-reanimated';
import analyticsService from '@/services/analyticsService';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { useBackButton } from '@/hooks/useSafeNavigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Rez Design System Colors
const COLORS = {
  primary: Colors.gold,
  primaryDark: Colors.nileBlue,
  deepTeal: Colors.nileBlue,
  gold: Colors.gold,
  goldDark: colors.lightPeach, // Brand-specific peach — keep unique
  textPrimary: Colors.nileBlue,
  white: Colors.background.primary };

function SplashScreen() {
  const router = useRouter();
  useBackButton(() => true); // Block back navigation

  // Animations
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);
  const coinRotate = useSharedValue(0);
  const taglineAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  const coinEntranceStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));
  const coinSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(coinRotate.value, [0, 1], [0, 360])}deg` }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineAnim.value,
  }));

  useEffect(() => {
    analyticsService.track('onboarding_started', { platform: Platform.OS });
  }, []);

  useEffect(() => {
    // Start animations - entrance + tagline
    fadeAnim.value = withTiming(1, { duration: 600 });
    scaleAnim.value = withSpring(1, { damping: 8, stiffness: 40 });
    taglineAnim.value = withTiming(1, { duration: 400 });

    // Coin rotation loop
    coinRotate.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1
    );

    // Pulse animation for glow
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1
    );

    // Navigate after delay
    const timer = setTimeout(() => {
      router.replace('/onboarding/registration');
    }, 1200);

    return () => {
      clearTimeout(timer);
      coinRotate.value = 0;
      pulseAnim.value = 1;
    };
  }, [router]);

  // coinSpin handled by coinSpinStyle useAnimatedStyle above

  return (
    <View style={styles.container}>
      {/* Hero Gradient Background */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark, COLORS.deepTeal]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative Circles */}
      <View style={styles.decorativeCircles}>
        <View style={[styles.circle, styles.circleGoldLarge]} />
        <View style={[styles.circle, styles.circleGreenMedium]} />
        <View style={[styles.circle, styles.circleGoldSmall]} />
        <View style={[styles.circle, styles.circleGreenTiny]} />
        <View style={[styles.circle, styles.circleGoldTiny]} />
      </View>

      <View style={styles.content}>
        {/* Animated Coin Logo */}
        <Animated.View
          style={[
            styles.coinContainer,
            coinEntranceStyle,
          ]}
          accessible={true}
          accessibilityLabel={`${BRAND.APP_NAME} App Logo`}
          accessibilityRole="image"
        >
          {/* Glow Effect */}
          <Animated.View
            style={[
              styles.coinGlow,
              pulseStyle,
            ]}
          />

          {/* Main Logo */}
          <Animated.View
            style={[
              styles.coinOuter,
              coinSpinStyle,
            ]}
          >
            <CachedImage
              source={require('@/assets/images/nuqta-logo.png')}
              style={styles.coinImage}
              contentFit="contain"
              transition={200}
            />
          </Animated.View>
        </Animated.View>

        {/* Brand Name */}
        <Animated.View
          style={[
            styles.brandContainer,
            coinEntranceStyle,
          ]}
        >
          <Text style={styles.brandText}>{BRAND.APP_NAME}</Text>
          <View style={styles.brandUnderline}>
            <LinearGradient
              colors={[COLORS.gold, COLORS.goldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underlineGradient}
            />
          </View>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={[
            styles.taglineContainer,
            taglineStyle,
          ]}
        >
          <Text style={styles.tagline}>{`Smart people use ${BRAND.APP_NAME} to save money`}</Text>
        </Animated.View>
      </View>

      {/* Bottom Badge */}
      <View style={styles.bottomBadge}>
        <Text style={styles.badgeText}>Save smarter, live better</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40 },

  // Decorative Circles
  decorativeCircles: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden' },
  circle: {
    position: 'absolute',
    borderRadius: 999 },
  circleGoldLarge: {
    width: 350,
    height: 350,
    top: -100,
    right: -120,
    backgroundColor: 'rgba(255, 200, 87, 0.12)' },
  circleGreenMedium: {
    width: 250,
    height: 250,
    bottom: 80,
    left: -100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  circleGoldSmall: {
    width: 120,
    height: 120,
    top: SCREEN_HEIGHT * 0.3,
    left: 30,
    backgroundColor: 'rgba(255, 200, 87, 0.1)' },
  circleGreenTiny: {
    width: 80,
    height: 80,
    bottom: SCREEN_HEIGHT * 0.25,
    right: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  circleGoldTiny: {
    width: 50,
    height: 50,
    top: 120,
    left: SCREEN_WIDTH * 0.6,
    backgroundColor: 'rgba(255, 200, 87, 0.15)' },

  // Coin Logo
  coinContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center' },
  coinGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 200, 87, 0.25)' },
  coinOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 15 },
  coinImage: {
    width: 120,
    height: 120,
    borderRadius: 60 },

  // Brand
  brandContainer: {
    alignItems: 'center',
    marginBottom: 16 },
  brandText: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8 },
  brandUnderline: {
    marginTop: 8,
    width: 80,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden' },
  underlineGradient: {
    flex: 1 },

  // Tagline
  taglineContainer: {
    marginTop: 8 },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    letterSpacing: 0.3 },

  // Bottom Badge
  bottomBadge: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)' },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5 } });

export default withErrorBoundary(SplashScreen, 'OnboardingSplash');
