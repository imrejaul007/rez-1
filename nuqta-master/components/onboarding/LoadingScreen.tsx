import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, interpolate, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

// Nuqta Design System Colors
const COLORS = {
  primary: colors.lightMustard,        // Light Mustard
  primaryDark: colors.nileBlue,    // Nile Blue
  deepTeal: colors.nileBlue,       // Nile Blue
  gold: colors.lightMustard,           // Light Mustard
  goldDark: colors.lightPeach,       // Light Peach
  textPrimary: colors.nileBlue,    // Nile Blue
  textMuted: colors.gray[400],
  surface: colors.linen,        // Linen
  glassWhite: 'rgba(255, 255, 255, 0.9)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
};

interface LoadingScreenProps {
  duration?: number;
  onComplete?: () => void;
}

function LoadingScreen({ duration = 5000, onComplete }: LoadingScreenProps) {
  const spinValue = useSharedValue(0);
  const pulseValue = useSharedValue(1);
  const progressValue = useSharedValue(0);
  const fadeValue = useSharedValue(0);

  useEffect(() => {
    // Fade in animation
    fadeValue.value = withTiming(1, { duration: 500 });

    // Start rotation animation (continuous spin)
    spinValue.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1
    );

    // Pulse animation for the center coin
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1
    );

    // Progress animation (width)
    progressValue.value = withTiming(1, {
      duration: duration - 500,
      easing: Easing.inOut(Easing.ease),
    });

    // Complete after specified duration
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onComplete]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeValue.value,
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(spinValue.value, [0, 1], [0, 360])}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  const progressWidthStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={[COLORS.surface, '#EDF2F7', COLORS.surface]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Elements */}
      <View style={styles.decorativeCircles}>
        <View style={[styles.circle, styles.circleGreen]} />
        <View style={[styles.circle, styles.circleGold]} />
        <View style={[styles.circle, styles.circleGreen2]} />
      </View>

      <Animated.View
        style={[styles.content, fadeStyle]}
        accessible={true}
        accessibilityLabel="Loading your personalized experience"
        accessibilityRole="progressbar"
        accessibilityHint="Please wait while we set up your account"
      >
        <View style={styles.glassCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
            style={styles.glassShine}
          />

          {/* Animated Spinner Ring */}
          <View style={styles.spinnerContainer}>
            <Animated.View
              style={[
                styles.spinnerOuter,
                spinStyle,
              ]}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.deepTeal, COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.spinnerGradient}
              />
            </Animated.View>

            {/* Center Coin */}
            <Animated.View
              style={[
                styles.centerCoin,
                pulseStyle,
              ]}
            >
              <LinearGradient
                colors={[COLORS.gold, COLORS.goldDark]}
                style={styles.coinGradient}
              >
                <Text style={styles.coinText}>R</Text>
              </LinearGradient>
            </Animated.View>

            {/* Orbiting Dots */}
            <Animated.View
              style={[
                styles.orbitContainer,
                spinStyle,
              ]}
            >
              <View style={[styles.orbitDot, styles.orbitDot1]} />
              <View style={[styles.orbitDot, styles.orbitDot2]} />
              <View style={[styles.orbitDot, styles.orbitDot3]} />
            </Animated.View>
          </View>

          {/* Loading Text */}
          <Text style={styles.loadingTitle}>Setting up your experience</Text>
          <Text style={styles.loadingSubtitle}>
            Finding the best deals for you...
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressWidthStyle]}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.deepTeal]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressGradient}
                />
              </Animated.View>
            </View>
          </View>

          {/* Features Loading */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(26, 58, 82, 0.1)' }]}>
                <Text style={styles.featureEmoji}>🏪</Text>
              </View>
              <Text style={styles.featureText}>Discovering stores</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(255, 200, 87, 0.15)' }]}>
                <Text style={styles.featureEmoji}>💰</Text>
              </View>
              <Text style={styles.featureText}>Loading rewards</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(26, 58, 82, 0.1)' }]}>
                <Text style={styles.featureEmoji}>🎁</Text>
              </View>
              <Text style={styles.featureText}>Preparing offers</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Decorative
  decorativeCircles: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circleGreen: {
    width: 200,
    height: 200,
    top: -60,
    right: -60,
    backgroundColor: 'rgba(26, 58, 82, 0.08)',
  },
  circleGold: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -50,
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
  },
  circleGreen2: {
    width: 120,
    height: 120,
    bottom: 200,
    right: -40,
    backgroundColor: 'rgba(223, 235, 247, 0.3)',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // Glass Card
  glassCard: {
    backgroundColor: COLORS.glassWhite,
    borderRadius: 28,
    padding: 32,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 15,
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(30px)',
    }),
  },
  glassShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  // Spinner
  spinnerContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  spinnerOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
  },
  spinnerGradient: {
    flex: 1,
    borderRadius: 60,
    opacity: 0.3,
  },
  centerCoin: {
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  coinGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#B8860B',
  },
  coinText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  // Orbiting Dots
  orbitContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
  },
  orbitDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  orbitDot1: {
    top: 0,
    left: '50%',
    marginLeft: -5,
  },
  orbitDot2: {
    bottom: 12,
    left: 8,
    backgroundColor: COLORS.gold,
  },
  orbitDot3: {
    bottom: 12,
    right: 8,
    backgroundColor: COLORS.deepTeal,
  },

  // Loading Text
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Progress Bar
  progressContainer: {
    width: '100%',
    marginBottom: 28,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 205, 87, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },

  // Features
  featuresContainer: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureEmoji: {
    fontSize: 18,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
});

export default React.memo(LoadingScreen);
