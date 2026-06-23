import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Payment Confirmation Page
// Success/failure screen after subscription payment

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, StatusBar} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { TIER_COLORS, TIER_GRADIENTS, TIER_NAMES } from '@/types/subscription.types';
import { platformAlertSimple } from '@/utils/platformAlert';

function PaymentConfirmationPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state } = useSubscription();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const tier = (params.tier as 'premium' | 'vip') || 'premium';
  const amount = params.amount ? Number(params.amount) : 0;
  const status = (params.status as string) || 'success';
  const billingCycle = (params.billingCycle as 'monthly' | 'yearly') || 'monthly';
  const transactionId = (params.transactionId as string) || `TXN${Date.now()}`;

  const scaleAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(0);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleAnim.value }] }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));
  const benefitSlideStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateX: interpolate(fadeAnim.value, [0, 1], [-50, 0]) }],
  }));

  useEffect(() => {
    // Haptic feedback on payment confirmation
    if (status === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    // Animate success icon
    scaleAnim.value = withSpring(1, { damping: 7, stiffness: 50 });
    fadeAnim.value = withTiming(1, { duration: 500 });
  }, []);

  const getNextBillingDate = () => {
    const date = new Date();
    if (billingCycle === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getBenefits = () => {
    if (tier === 'vip') {
      return [
        { icon: 'cash', text: '3x Cashback on all orders' },
        { icon: 'bicycle', text: 'Free delivery on all orders' },
        { icon: 'headset', text: 'Dedicated concierge service' },
        { icon: 'calendar', text: 'Premium events access' },
        { icon: 'person', text: 'Personal shopper assistance' },
        { icon: 'flash', text: 'Early flash sale access (1 hour)' },
      ];
    } else {
      return [
        { icon: 'cash', text: '2x Cashback on all orders' },
        { icon: 'bicycle', text: `Free delivery (orders above ${currencySymbol}500)` },
        { icon: 'headset', text: 'Priority customer support' },
        { icon: 'pricetag', text: 'Exclusive deals & early access' },
        { icon: 'heart', text: 'Unlimited wishlists' },
        { icon: 'gift', text: 'Birthday & anniversary offers' },
      ];
    }
  };

  if (status === 'failed') {
    return (
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.error} />

        <LinearGradient colors={[Colors.error, Colors.errorScale[700]] as any} style={styles.header}>
          <View style={styles.headerContainer}>
            <Pressable
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              style={styles.backButton}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              accessibilityHint="Double tap to return to previous screen"
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Payment Failed</ThemedText>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.failureContainer}>
            <Ionicons name="close-circle" size={120} color={Colors.error} />
            <ThemedText style={styles.failureTitle}>Payment Failed</ThemedText>
            <ThemedText style={styles.failureMessage}>
              We couldn't process your payment. Please try again or use a different payment method.
            </ThemedText>

            <View style={styles.errorDetails}>
              <ThemedText style={styles.errorTitle}>What happened?</ThemedText>
              <ThemedText style={styles.errorText}>
                Your payment for the {TIER_NAMES[tier]} plan was not successful. Your account has not been charged.
              </ThemedText>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={styles.retryButton}
                onPress={() => router.push('/subscription/plans')}
                accessibilityLabel="Try again"
                accessibilityRole="button"
                accessibilityHint="Double tap to retry subscription payment"
              >
                <Ionicons name="refresh" size={20} color={Colors.text.inverse} />
                <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
              </Pressable>

              <Pressable
                style={styles.supportButton}
                onPress={() => router.push('/support')}
                accessibilityLabel="Contact support"
                accessibilityRole="button"
                accessibilityHint="Double tap to get help with your payment issue"
              >
                <ThemedText style={styles.supportButtonText}>Contact Support</ThemedText>
              </Pressable>

              <Pressable
                style={styles.homeButton}
                onPress={() => router.push('/')}
                accessibilityLabel="Back to home"
                accessibilityRole="button"
                accessibilityHint="Double tap to return to home page"
              >
                <ThemedText style={styles.homeButtonText}>Back to Home</ThemedText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  const tierColor = TIER_COLORS[tier];
  const tierGradient = TIER_GRADIENTS[tier];

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={tierColor} />

      <LinearGradient colors={tierGradient as any} style={styles.header}>
        <View style={styles.headerContainer}>
          <View style={styles.backButton} />
          <ThemedText style={styles.headerTitle}>Payment Successful</ThemedText>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Success Animation */}
        <View
          style={styles.successContainer}
          accessible={true}
          accessibilityLabel={`Payment successful! Welcome to ${TIER_NAMES[tier]}. Your subscription has been activated successfully.`}
          accessibilityRole="text"
        >
          <Animated.View style={scaleStyle}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={80} color={Colors.text.inverse} />
            </View>
          </Animated.View>

          <Animated.View style={fadeStyle}>
            <ThemedText
              style={styles.successTitle}
              accessibilityRole="header"
            >
              Welcome to {TIER_NAMES[tier]}!
            </ThemedText>
            <ThemedText style={styles.successMessage}>
              Your subscription has been activated successfully
            </ThemedText>
          </Animated.View>
        </View>

        {/* Subscription Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.tierBadge}>
            <LinearGradient colors={tierGradient as any} style={styles.tierBadgeGradient}>
              <Ionicons name={tier === 'vip' ? 'diamond' : 'star'} size={24} color={Colors.text.inverse} />
              <ThemedText style={styles.tierBadgeText}>{TIER_NAMES[tier]} Member</ThemedText>
            </LinearGradient>
          </View>

          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Amount Paid</ThemedText>
            <ThemedText style={styles.detailValue}>{currencySymbol}{amount}</ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Billing Cycle</ThemedText>
            <ThemedText style={styles.detailValue}>
              {billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Next Billing Date</ThemedText>
            <ThemedText style={styles.detailValue}>{getNextBillingDate()}</ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Transaction ID</ThemedText>
            <ThemedText style={[styles.detailValue, styles.transactionId]}>
              {transactionId}
            </ThemedText>
          </View>

          <Pressable
            style={styles.receiptButton}
            onPress={() => {
              platformAlertSimple('Receipt Download', 'Receipt will be sent to your email shortly.');
            }}
            accessibilityLabel="Download payment receipt"
            accessibilityRole="button"
            accessibilityHint="Double tap to download your payment receipt"
          >
            <Ionicons name="download-outline" size={20} color={Colors.brand.purpleLight} />
            <ThemedText style={styles.receiptButtonText}>Download Receipt</ThemedText>
          </Pressable>
        </View>

        {/* Benefits Unlocked */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Benefits Unlocked</ThemedText>
          <View style={styles.benefitsContainer}>
            {getBenefits().map((benefit, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.benefitRow,
                  benefitSlideStyle,
                ]}
              >
                <View style={styles.benefitIcon}>
                  <Ionicons name={benefit.icon as any} size={20} color={Colors.brand.purpleLight} />
                </View>
                <ThemedText style={styles.benefitText}>{benefit.text}</ThemedText>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/subscription/manage')}
            accessibilityLabel="View my subscription"
            accessibilityRole="button"
            accessibilityHint="Double tap to manage your subscription details"
          >
            <ThemedText style={styles.primaryButtonText}>View My Subscription</ThemedText>
            <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push('/')}
            accessibilityLabel="Start shopping"
            accessibilityRole="button"
            accessibilityHint="Double tap to begin shopping with your new benefits"
          >
            <ThemedText style={styles.secondaryButtonText}>Start Shopping</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },
  header: {
    paddingTop: StatusBar.currentHeight || 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  backButton: {
    width: 40,
    padding: Spacing.sm },
  headerTitle: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center' },
  headerRight: {
    width: 40 },
  scrollView: {
    flex: 1 },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg },
  successCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.strong },
  successTitle: {
    ...Typography.h1,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm },
  successMessage: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center' },
  detailsCard: {
    margin: Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium },
  tierBadge: {
    marginBottom: Spacing.lg,
    marginHorizontal: -Spacing.lg,
    marginTop: -Spacing.lg },
  tierBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
    gap: Spacing.sm },
  tierBadgeText: {
    color: Colors.text.inverse,
    ...Typography.h4,
    fontWeight: 'bold' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default },
  detailLabel: {
    ...Typography.body,
    color: Colors.text.tertiary },
  detailValue: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary },
  transactionId: {
    ...Typography.bodySmall,
    fontFamily: 'monospace',
    color: Colors.text.tertiary },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.base,
    gap: Spacing.sm },
  receiptButtonText: {
    color: Colors.brand.purpleLight,
    ...Typography.body,
    fontWeight: '600' },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.base },
  benefitsContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    ...Shadows.subtle },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.brand.purpleLight + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md },
  benefitText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.secondary },
  actionsContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing['3xl'] },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.brand.purpleLight,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm },
  primaryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: 'bold' },
  secondaryButton: {
    backgroundColor: Colors.background.secondary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center' },
  secondaryButtonText: {
    color: Colors.text.tertiary,
    ...Typography.bodyLarge,
    fontWeight: '600' },
  // Failure styles
  failureContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: Spacing['3xl'] },
  failureTitle: {
    ...Typography.h1,
    fontWeight: 'bold',
    color: Colors.error,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm },
  failureMessage: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing['2xl'] },
  errorDetails: {
    backgroundColor: Colors.errorScale[50],
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing['2xl'],
    width: '100%' },
  errorTitle: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: Spacing.sm },
  errorText: {
    ...Typography.body,
    color: Colors.errorScale[700],
    lineHeight: 20 },
  actions: {
    width: '100%',
    gap: Spacing.md },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.error,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: 'bold' },
  supportButton: {
    backgroundColor: Colors.background.secondary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center' },
  supportButtonText: {
    color: Colors.text.tertiary,
    ...Typography.bodyLarge,
    fontWeight: '600' },
  homeButton: {
    paddingVertical: Spacing.base,
    alignItems: 'center' },
  homeButtonText: {
    color: Colors.text.tertiary,
    ...Typography.body,
    fontWeight: '600' } });

export default withErrorBoundary(PaymentConfirmationPage, 'SubscriptionPaymentConfirmation');
