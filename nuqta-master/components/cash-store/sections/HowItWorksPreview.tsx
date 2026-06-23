/**
 * HowItWorksPreview Component
 *
 * Premium animated 4-step preview of how Cash Store works
 * Features: Animated step progression, interactive elements, animated connectors
 */

import React, { memo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface HowItWorksPreviewProps {
  onLearnMore: () => void;
}

const STEPS = [
  {
    id: 1,
    icon: 'search',
    title: 'Browse',
    description: 'Find your favorite brand',
    color: colors.nileBlue,
    gradient: [colors.nileBlue, '#243f55'],
    iconColor: colors.background.primary,
  },
  {
    id: 2,
    icon: 'cart',
    title: 'Shop',
    description: 'Click through to shop',
    color: colors.brand.sand,
    gradient: [colors.lightPeach, colors.brand.sand],
    iconColor: colors.nileBlue,
  },
  {
    id: 3,
    icon: 'bag-check',
    title: 'Purchase',
    description: 'Complete your order',
    color: colors.brand.sand,
    gradient: [colors.brand.sand, colors.brand.caramel],
    iconColor: colors.background.primary,
  },
  {
    id: 4,
    icon: 'wallet',
    title: 'Earn',
    description: 'Get REZ coins in wallet',
    color: colors.nileBlue,
    gradient: ['#243f55', colors.nileBlue],
    iconColor: colors.background.primary,
  },
];

const StepItem: React.FC<{
  step: (typeof STEPS)[0];
  index: number;
  isLast: boolean;
}> = memo(({ step, index, isLast }) => {
  const scaleAnim = useSharedValue(0);
  const iconBounceAnim = useSharedValue(0);
  const connectorAnim = useSharedValue(0);

  useEffect(() => {
    scaleAnim.value = withDelay(index * 200, withSpring(1, { damping: 12, stiffness: 100 }));
    connectorAnim.value = withDelay(index * 200, withTiming(1, { duration: 400 }));
    iconBounceAnim.value = withDelay(
      index * 100,
      withRepeat(withSequence(withTiming(-3, { duration: 600 }), withTiming(0, { duration: 600 })), -1)
    );
  }, [index]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconBounceAnim.value }],
  }));

  const connectorStyle = useAnimatedStyle(() => ({
    width: `${interpolate(connectorAnim.value, [0, 1], [0, 100])}%` as any,
  }));

  return (
    <Animated.View style={[styles.stepItem, scaleStyle]}>
      {/* Step Icon with Gradient */}
      <Animated.View style={bounceStyle}>
        <LinearGradient colors={step.gradient} style={styles.stepIconContainer}>
          <Ionicons name={step.icon as any} size={22} color={step.iconColor || colors.background.primary} />
        </LinearGradient>
      </Animated.View>

      {/* Step Number Badge */}
      <View style={[styles.stepNumber, { backgroundColor: step.color }]}>
        <Text style={styles.stepNumberText}>{step.id}</Text>
      </View>

      {/* Step Content */}
      <Text style={styles.stepTitle}>{step.title}</Text>
      <Text style={styles.stepDescription}>{step.description}</Text>

      {/* Animated Connector Line */}
      {!isLast && (
        <View style={styles.connectorContainer}>
          <Animated.View style={[styles.connector, connectorStyle]} />
          <View style={styles.connectorDot} />
        </View>
      )}
    </Animated.View>
  );
});

const HowItWorksPreview: React.FC<HowItWorksPreviewProps> = ({ onLearnMore }) => {
  const containerFadeAnim = useSharedValue(0);
  const arrowAnim = useSharedValue(0);

  useEffect(() => {
    containerFadeAnim.value = withTiming(1, { duration: 500 });
    arrowAnim.value = withRepeat(withSequence(withTiming(4, { duration: 500 }), withTiming(0, { duration: 500 })), -1);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerFadeAnim.value }));
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: arrowAnim.value }] }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={[colors.linen, colors.linen, colors.background.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <LinearGradient
              colors={[colors.lightPeach, colors.brand.sand]}
              style={styles.headerIconContainer}
            >
              <Ionicons name="help-circle" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>How It Works</Text>
          </View>
          <Pressable onPress={onLearnMore} style={styles.learnMoreButton}>
            <Text style={styles.learnMoreText}>Learn More</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.brand.sand} />
          </Pressable>
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {STEPS.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              index={index}
              isLast={index === STEPS.length - 1}
            />
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={16} color={colors.brand.sand} />
          <Text style={styles.infoText}>
            REZ coins are typically credited within 24-72 hours after delivery
          </Text>
        </View>

        {/* CTA Button */}
        <Pressable style={styles.ctaButton} onPress={onLearnMore}>
          <LinearGradient
            colors={[colors.nileBlue, colors.brand.nileBlueLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>See Detailed Guide</Text>
            <Animated.View style={arrowStyle}>
              <Ionicons name="arrow-forward" size={18} color={colors.background.primary} />
            </Animated.View>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background.primary,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  gradient: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 181, 0.3)',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightPeach,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 181, 0.15)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 181, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: -0.3,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(232, 184, 150, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  learnMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.sand,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
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
  stepNumber: {
    position: 'absolute',
    top: 36,
    right: '28%',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.background.primary,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 4,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 10,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  connectorContainer: {
    position: 'absolute',
    top: 25,
    right: -8,
    width: 18,
    height: 3,
    justifyContent: 'center',
  },
  connector: {
    height: 3,
    backgroundColor: colors.lightPeach,
    borderRadius: 2,
  },
  connectorDot: {
    position: 'absolute',
    right: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lightPeach,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(232, 184, 150, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.nileBlue,
    fontWeight: '500',
    lineHeight: 16,
  },
  ctaButton: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightPeach,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: -0.2,
  },
});

export default memo(HowItWorksPreview);
