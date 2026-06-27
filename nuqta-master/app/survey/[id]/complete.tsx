// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  Easing} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
function SurveyCompletePage() {
  const router = useRouter();
  const { coinsEarned, timeSpent } = useLocalSearchParams<{
    coinsEarned: string;
    timeSpent: string;
  }>();

  // Animation values
  const scaleAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(0);
  const coinScaleAnim = useSharedValue(0);
  const coinRotateAnim = useSharedValue(0);
  const statsSlideAnim = useSharedValue(50);
  const buttonSlideAnim = useSharedValue(100);

  useEffect(() => {
    // Check mark scale in + fade in content
    scaleAnim.value = withSpring(1, { damping: 7, stiffness: 50 });
    fadeAnim.value = withTiming(1, { duration: 300 });

    // Coin animation
    coinScaleAnim.value = withDelay(300, withSpring(1, { damping: 5, stiffness: 50 }));
    coinRotateAnim.value = withDelay(300, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) }));

    // Stats slide in
    statsSlideAnim.value = withDelay(500, withSpring(0, { damping: 8, stiffness: 50 }));

    // Button slide in
    buttonSlideAnim.value = withDelay(700, withSpring(0, { damping: 8, stiffness: 50 }));
  }, []);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const coins = parseInt(coinsEarned || '0', 10);
  const time = parseInt(timeSpent || '0', 10);

  const coinRotation = interpolate(coinRotateAnim.value, [0, 1], ['0deg', '360deg']);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Success Icon */}
          <Animated.View
            style={[
              styles.successIconContainer,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <LinearGradient
              colors={[Colors.gold, Colors.nileBlue]}
              style={styles.successIconGradient}
            >
              <Ionicons name="checkmark" size={64} color={Colors.text.inverse} />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.title}>Survey Completed!</Text>
            <Text style={styles.subtitle}>
              Thank you for your valuable feedback
            </Text>
          </Animated.View>

          {/* Coins Earned */}
          <Animated.View
            style={[
              styles.coinsContainer,
              {
                transform: [
                  { scale: coinScaleAnim },
                  { rotate: coinRotation },
                ] },
            ]}
          >
            <LinearGradient
              colors={[colors.brand.goldBright, '#FFA500']}
              style={styles.coinsGradient}
            >
              <Ionicons name="wallet" size={32} color={Colors.text.inverse} />
            </LinearGradient>
          </Animated.View>

          <Animated.View
            style={[
              styles.coinsTextContainer,
              { transform: [{ scale: coinScaleAnim }] },
            ]}
          >
            <Text style={styles.coinsLabel}>You earned</Text>
            <Text style={styles.coinsValue}>+{coins}</Text>
            <Text style={styles.coinsUnit}>{BRAND.COIN_NAME}</Text>
          </Animated.View>

          {/* Stats */}
          <Animated.View
            style={[
              styles.statsContainer,
              { transform: [{ translateY: statsSlideAnim }] },
            ]}
          >
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={24} color={Colors.info} />
              <Text style={styles.statValue}>{formatTime(time)}</Text>
              <Text style={styles.statLabel}>Time Spent</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color={Colors.warning} />
              <Text style={styles.statValue}>100%</Text>
              <Text style={styles.statLabel}>Completion</Text>
            </View>
          </Animated.View>

          {/* Message */}
          <Animated.View
            style={[
              styles.messageContainer,
              { transform: [{ translateY: statsSlideAnim }] },
            ]}
          >
            <LinearGradient
              colors={['rgba(255, 205, 87, 0.1)', 'rgba(26, 58, 82, 0.1)']}
              style={styles.messageGradient}
            >
              <Ionicons name="gift-outline" size={20} color={Colors.gold} />
              <Text style={styles.messageText}>
                Your coins have been added to your wallet!
              </Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Bottom Buttons */}
        <Animated.View
          style={[
            styles.bottomContainer,
            { transform: [{ translateY: buttonSlideAnim }] },
          ]}
        >
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/surveys')}
          >
            <LinearGradient
              colors={[Colors.info, Colors.brand.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>Browse More Surveys</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.secondaryButtonText}>Go to Home</Text>
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
  successIconContainer: {
    marginBottom: Spacing.xl },
  successIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16 },
      android: {
        elevation: 12 } }) },
  title: {
    fontSize: Typography.h1.fontSize,
    fontWeight: '700',
    color: colors.deepNavy,
    textAlign: 'center',
    marginBottom: Spacing.sm },
  subtitle: {
    fontSize: Typography.bodyLarge.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'] },
  coinsContainer: {
    marginBottom: Spacing.base },
  coinsGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.goldBright,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12 },
      android: {
        elevation: 8 } }) },
  coinsTextContainer: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'] },
  coinsLabel: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs },
  coinsValue: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.gold },
  coinsUnit: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: Colors.text.tertiary },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12 },
      android: {
        elevation: 4 } }) },
  statCard: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)' },
  statValue: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: colors.deepNavy,
    marginTop: Spacing.sm },
  statLabel: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs },
  messageContainer: {
    width: '100%' },
  messageGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)' },
  messageText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '500',
    color: Colors.gold },
  bottomContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 20 : 24 },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: Spacing.sm },
  primaryButtonText: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.base },
  secondaryButtonText: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: Colors.text.tertiary } });

export default withErrorBoundary(SurveyCompletePage, 'SurveyIdComplete');
