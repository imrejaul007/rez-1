import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useEffect,  useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

function SurveyCompletePage() {
  const router = useRouter();
  const { coinsEarned, timeSpent, surveyTitle } = useLocalSearchParams<{
    coinsEarned: string;
    timeSpent: string;
    surveyTitle: string;
  }>();

  // Animations
  const scaleAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleAnim.value }] }));
  const fadeSlideStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }]}));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));
  const [displayedCoins, setDisplayedCoins] = useState(0);

  const coins = parseInt(coinsEarned || '0', 10);
  const time = parseInt(timeSpent || '0', 10);
  const timeMinutes = Math.floor(time / 60);
  const timeSeconds = time % 60;

  useEffect(() => {
    // Run entrance animations
    scaleAnim.value = withSpring(1, { damping: 8, stiffness: 100 });
    fadeAnim.value = withTiming(1, { duration: 400 });
    slideAnim.value = withTiming(0, { duration: 400 });
    

    // Coin count animation using timer
    const duration = 1500;
    const steps = 30;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOutQuad = progress * (2 - progress); // easing function
      setDisplayedCoins(Math.round(coins * easeOutQuad));

      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayedCoins(coins);
      }
    }, stepDuration);

    return () => {
      clearInterval(timer);
    };
  }, [coins]);

  const handleBackToSurveys = () => {
    router.replace('/surveys');
  };

  const handleGoHome = () => {
    router.replace('/');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.secondary} />

        <View style={styles.content}>
          {/* Success Animation */}
          <Animated.View
            style={[
              styles.successCircle,
              scaleStyle,
            ]}
          >
            <LinearGradient
              colors={[colors.lightMustard, colors.lightMustard]}
              style={styles.successGradient}
            >
              <Ionicons name="checkmark" size={56} color={Colors.text.inverse} />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Animated.View
            style={[
              styles.titleContainer,
              fadeSlideStyle,
            ]}
          >
            <Text style={styles.title}>Survey Completed!</Text>
            <Text style={styles.subtitle}>
              Thank you for sharing your feedback
            </Text>
          </Animated.View>

          {/* Reward Card */}
          <Animated.View
            style={[
              styles.rewardCard,
              fadeSlideStyle,
            ]}
          >
            <LinearGradient
              colors={['rgba(255, 205, 87, 0.1)', 'rgba(255, 205, 87, 0.1)']}
              style={styles.rewardGradient}
            >
              <View style={styles.rewardIconContainer}>
                <Ionicons name="wallet" size={32} color={Colors.gold} />
              </View>
              <Text style={styles.rewardLabel}>You earned</Text>
              <Text style={styles.rewardValue}>+{displayedCoins}</Text>
              <Text style={styles.rewardCurrency}>{BRAND.COIN_NAME}</Text>
            </LinearGradient>
          </Animated.View>

          {/* Stats */}
          <Animated.View
            style={[
              styles.statsContainer,
              fadeSlideStyle,
            ]}
          >
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="time-outline" size={20} color={Colors.gold} />
              </View>
              <Text style={styles.statValue}>
                {timeMinutes > 0 ? `${timeMinutes}m ${timeSeconds}s` : `${timeSeconds}s`}
              </Text>
              <Text style={styles.statLabel}>Time Taken</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="document-text-outline" size={20} color={colors.brand.purpleLight} />
              </View>
              <Text style={styles.statValue}>{surveyTitle || 'Survey'}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </Animated.View>

          {/* Info Banner */}
          <Animated.View
            style={[
              styles.infoBanner,
              fadeSlideStyle,
            ]}
          >
            <Ionicons name="information-circle-outline" size={20} color={Colors.text.tertiary} />
            <Text style={styles.infoText}>
              Coins have been added to your wallet and can be used for rewards
            </Text>
          </Animated.View>
        </View>

        {/* Bottom Buttons */}
        <Animated.View
          style={[
            styles.bottomButtons,
            fadeStyle,
          ]}
        >
          <Pressable
            style={styles.secondaryButton}
            onPress={handleGoHome}
          >
            <Ionicons name="home-outline" size={20} color={Colors.text.primary} />
            <Text style={styles.secondaryButtonText}>Home</Text>
          </Pressable>

          <Pressable
            style={styles.primaryButton}
            onPress={handleBackToSurveys}
          >
            <LinearGradient
              colors={[colors.infoScale[400], colors.brand.purpleLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>More Surveys</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl },
  successCircle: {
    marginBottom: Spacing['2xl'] },
  successGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16 },
      android: {
        elevation: 8 } }) },
  titleContainer: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'] },
  title: {
    ...Typography.h1,
    color: Colors.text.primary,
    marginBottom: Spacing.sm },
  subtitle: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.text.tertiary,
    textAlign: 'center' },
  rewardCard: {
    width: '100%',
    marginBottom: Spacing.xl },
  rewardGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)' },
  rewardIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadows.medium },
  rewardLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs },
  rewardValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.gold },
  rewardCurrency: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginTop: Spacing.xs },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border.default },
  statItem: {
    flex: 1,
    alignItems: 'center' },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm },
  statValue: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
    textAlign: 'center' },
  statLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border.default,
    marginHorizontal: Spacing.base },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(107, 114, 128, 0.08)',
    borderRadius: BorderRadius.md,
    width: '100%' },
  infoText: {
    flex: 1,
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
    lineHeight: 18 },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    gap: Spacing.sm },
  secondaryButtonText: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary },
  primaryButton: {
    flex: 2,
    borderRadius: BorderRadius.md,
    overflow: 'hidden' },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: Spacing.sm },
  primaryButtonText: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.inverse } });

export default withErrorBoundary(SurveyCompletePage, 'SurveyComplete');
