// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Trial Management Page
// Complete trial period management system with beautiful UI and animations

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, StatusBar, ActivityIndicator, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSubscription } from '@/contexts/SubscriptionContext';
import TierBadge from '@/components/subscription/TierBadge';
import TrialCountdownCircle from '@/components/subscription/TrialCountdownCircle';
import BenefitShowcaseCard from '@/components/subscription/BenefitShowcaseCard';
import TrialStatCard from '@/components/subscription/TrialStatCard';
import PricingToggle from '@/components/subscription/PricingToggle';
import subscriptionAPI from '@/services/subscriptionApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { height: screenHeight } = Dimensions.get('window');

function TrialPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const { state, actions, computed } = useSubscription();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [expandedTerms, setExpandedTerms] = useState(false);
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(screenHeight);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideAnim.value }] }));

  // Get subscription data
  const subscription = state.currentSubscription;
  const isOnTrial = subscription?.status === 'trial';
  const daysRemaining = computed.daysRemaining;
  const isTrialEnding = daysRemaining < 3;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false });
  }, [navigation]);
  const isMounted = useIsMounted();

  // Fetch trial stats on mount
  useEffect(() => {
    if (isOnTrial) {
      fetchTrialStats();
      // Animate in
      fadeAnim.value = withTiming(1, { duration: 500 });
      slideAnim.value = withTiming(0, { duration: 600 });
    } else {
      // Not on trial, redirect
      router.replace('/subscription/manage');
    }
  }, [isOnTrial]);

  const fetchTrialStats = async () => {
    try {
      setIsLoading(true);
      const response = await subscriptionAPI.getSubscriptionUsage();
      if (response) {
        setStats(response);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleSubscribeNow = async (tier: 'premium' | 'vip' = 'premium') => {
    try {
      setIsSubscribing(true);
      platformAlertConfirm(
        'Confirm Subscription',
        `Subscribe to ${tier === 'vip' ? 'VIP' : 'Premium'} plan to continue after trial?\n\nBilling: ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}`,
        async () => {
          try {
            const result = await subscriptionAPI.subscribeToPlan(
              tier,
              billingCycle
            );

            if (result) {
              await actions.loadSubscription(true);
              platformAlertSimple('Welcome to Premium!', `You're all set! Your ${tier === 'vip' ? 'VIP' : 'Premium'} benefits are now active.`);
              router.replace('/');
            }
          } catch (error: any) {
            platformAlertSimple(
              'Subscription Failed',
              error.message || 'Payment processing failed. Please try again.'
            );
          } finally {
            if (!isMounted()) return;
            setIsSubscribing(false);
          }
        },
        'Subscribe'
      );
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'An error occurred. Please try again.');
      setIsSubscribing(false);
    }
  };

  const handleRemindLater = () => {
    platformAlertConfirm(
      'Remind Me Later',
      'We\'ll send you a notification when your trial is about to end.',
      () => {
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
      },
      'Set Reminder'
    );
  };

  // Trial Details Card
  const renderTrialDetails = () => (
    <View style={styles.detailsCard}>
      <View style={styles.detailsHeader}>
        <ThemedText style={styles.detailsTitle}>Trial Information</ThemedText>
        <View style={styles.autoRenewBadge}>
          <Ionicons name="auto-repeat" size={14} color={Colors.brand.purpleLight} />
          <ThemedText style={styles.autoRenewText}>Auto-renewal off</ThemedText>
        </View>
      </View>

      <View style={styles.detailsContent}>
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="calendar-outline" size={16} color={Colors.brand.purpleLight} />
          </View>
          <View style={styles.detailInfo}>
            <ThemedText style={styles.detailLabel}>Start Date</ThemedText>
            <ThemedText style={styles.detailValue}>
              {subscription?.startDate
                ? new Date(subscription.startDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric' })
                : 'N/A'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="calendar-outline" size={16} color={Colors.brand.purpleLight} />
          </View>
          <View style={styles.detailInfo}>
            <ThemedText style={styles.detailLabel}>End Date</ThemedText>
            <ThemedText style={styles.detailValue}>
              {subscription?.endDate
                ? new Date(subscription.endDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric' })
                : 'N/A'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="hourglass-outline" size={16} color={Colors.brand.purpleLight} />
          </View>
          <View style={styles.detailInfo}>
            <ThemedText style={styles.detailLabel}>Duration</ThemedText>
            <ThemedText style={styles.detailValue}>7 days</ThemedText>
          </View>
        </View>

        {subscription?.autoRenew && (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
            </View>
            <View style={styles.detailInfo}>
              <ThemedText style={styles.detailLabel}>Auto Renewal</ThemedText>
              <ThemedText style={[styles.detailValue, { color: Colors.success }]}>Enabled</ThemedText>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  // Benefits Showcase Section
  const renderBenefitsSection = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>What You're Getting</ThemedText>

      <BenefitShowcaseCard
        icon="cash"
        title="2x Cashback Multiplier"
        description="Earn double cashback on all your purchases during the trial"
        isActive
      />

      <BenefitShowcaseCard
        icon="bicycle"
        title="Free Delivery"
        description={`Free delivery on select stores and orders above ${currencySymbol}500`}
        isActive
      />

      <BenefitShowcaseCard
        icon="headset"
        title="Priority Support"
        description="Get instant support from our dedicated customer care team"
        isActive
      />

      <BenefitShowcaseCard
        icon="pricetag"
        title="Exclusive Deals"
        description="Access to exclusive offers and limited-time deals"
        isActive
      />

      <BenefitShowcaseCard
        icon="flash"
        title="Early Flash Sales"
        description="Get 1-hour early access to flash sales before others"
        isActive
      />
    </View>
  );

  // Usage Stats Section
  const renderUsageStats = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Your Trial So Far</ThemedText>

      <View style={styles.statsGrid}>
        <TrialStatCard
          icon="cart-outline"
          label="Orders Placed"
          value={stats?.usage?.ordersThisMonth || 0}
          change={8}
        />
        <TrialStatCard
          icon="wallet-outline"
          label="Cashback Earned"
          value={`${currencySymbol}${stats?.usage?.cashbackEarned || 0}`}
          change={12}
        />
      </View>

      <View style={styles.statsGrid}>
        <TrialStatCard
          icon="bicycle-outline"
          label="Delivery Fees Saved"
          value={`${currencySymbol}${stats?.usage?.deliveryFeesSaved || 0}`}
          change={15}
        />
        <TrialStatCard
          icon="trending-up-outline"
          label="ROI So Far"
          value={`+${currencySymbol}${(stats?.usage?.cashbackEarned || 0) + (stats?.usage?.deliveryFeesSaved || 0)}`}
          change={20}
        />
      </View>
    </View>
  );

  // Pricing Section
  const renderPricingSection = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Continue After Trial</ThemedText>

      <PricingToggle
        billingCycle={billingCycle}
        onChange={setBillingCycle}
        monthlyPrice={99}
        yearlyPrice={950}
        yearlySavings={20}
      />

      <View style={styles.ctaContainer}>
        <Pressable
          style={[styles.primaryButton, isSubscribing && styles.buttonDisabled]}
          onPress={() => handleSubscribeNow('premium')}
          disabled={isSubscribing}
         
          accessibilityLabel={isSubscribing ? 'Processing subscription' : 'Subscribe now'}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubscribing, busy: isSubscribing }}
          accessibilityHint="Double tap to subscribe to Premium plan and continue after trial"
        >
          {isSubscribing ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.text.inverse} />
              <ThemedText style={styles.primaryButtonText}>Subscribe Now</ThemedText>
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={handleRemindLater}
          disabled={isSubscribing}
         
          accessibilityLabel="Remind me later"
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubscribing }}
          accessibilityHint="Double tap to set a reminder before trial ends"
        >
          <Ionicons name="clock-outline" size={20} color={Colors.brand.purpleLight} />
          <ThemedText style={styles.secondaryButtonText}>Remind Me Later</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  // Trial Terms Section
  const renderTrialTerms = () => (
    <View style={styles.section}>
      <Pressable
        style={styles.termsHeader}
        onPress={() => setExpandedTerms(!expandedTerms)}
       
        accessibilityLabel={`What happens next. ${expandedTerms ? 'Expanded' : 'Collapsed'}`}
        accessibilityRole="button"
        accessibilityHint={`Double tap to ${expandedTerms ? 'collapse' : 'expand'} trial terms and conditions`}
      >
        <ThemedText style={styles.termsTitle}>What Happens Next?</ThemedText>
        <Ionicons
          name={expandedTerms ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.brand.purpleLight}
        />
      </Pressable>

      {expandedTerms && (
        <View style={styles.termsContent}>
          <View style={styles.termItem}>
            <View style={styles.termBullet}>
              <ThemedText style={styles.termBulletText}>1</ThemedText>
            </View>
            <View>
              <ThemedText style={styles.termTitle}>If you subscribe before trial ends</ThemedText>
              <ThemedText style={styles.termDescription}>
                Seamless transition to your chosen plan. Your benefits continue without interruption.
              </ThemedText>
            </View>
          </View>

          <View style={styles.termItem}>
            <View style={styles.termBullet}>
              <ThemedText style={styles.termBulletText}>2</ThemedText>
            </View>
            <View>
              <ThemedText style={styles.termTitle}>If you don't subscribe</ThemedText>
              <ThemedText style={styles.termDescription}>
                Automatic downgrade to Free tier on trial end date. You'll lose premium benefits.
              </ThemedText>
            </View>
          </View>

          <View style={styles.termItem}>
            <View style={styles.termBullet}>
              <ThemedText style={styles.termBulletText}>3</ThemedText>
            </View>
            <View>
              <ThemedText style={styles.termTitle}>Reactivation option</ThemedText>
              <ThemedText style={styles.termDescription}>
                Can reactivate your subscription anytime within 30 days of cancellation.
              </ThemedText>
            </View>
          </View>

          <View style={styles.termItem}>
            <View style={styles.termBullet}>
              <ThemedText style={styles.termBulletText}>4</ThemedText>
            </View>
            <View>
              <ThemedText style={styles.termTitle}>Billing details</ThemedText>
              <ThemedText style={styles.termDescription}>
                First charge will be applied on trial end date if you subscribe.
              </ThemedText>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  if (!isOnTrial) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />
        <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.header}>
          <View style={styles.headerContainer}>
            <Pressable
              onPress={handleGoBack}
              style={styles.backButton}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              accessibilityHint="Double tap to return to previous screen"
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Trial Period</ThemedText>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.loadingContainer}>
            <Ionicons name="information-circle-outline" size={48} color={Colors.brand.purpleLight} />
            <ThemedText style={styles.loadingText}>
              You are not on a trial period
            </ThemedText>
            <ThemedText style={styles.loadingSubtext}>
              Visit our plans page to start a trial
            </ThemedText>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push('/subscription/plans')}
              accessibilityLabel="View subscription plans"
              accessibilityRole="button"
              accessibilityHint="Double tap to explore available subscription plans"
            >
              <ThemedText style={styles.primaryButtonText}>View Plans</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <Animated.View style={[styles.container, fadeStyle]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />

      {/* Trial Ending Soon Banner */}
      {isTrialEnding && (
        <LinearGradient
          colors={[Colors.error, colors.error]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.urgentBanner}
        >
          <View style={styles.urgentBannerContent}>
            <Ionicons name="warning-outline" size={20} color={Colors.text.inverse} />
            <View style={styles.urgentBannerText}>
              <ThemedText style={styles.urgentTitle}>
                Your trial ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}!
              </ThemedText>
              <ThemedText style={styles.urgentSubtitle}>
                Subscribe now to keep your premium benefits
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={() => handleSubscribeNow('premium')}
            style={styles.urgentButton}
            accessibilityLabel="Subscribe now"
            accessibilityRole="button"
            accessibilityHint={`Double tap to subscribe. Trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}
          >
            <ThemedText style={styles.urgentButtonText}>Subscribe</ThemedText>
          </Pressable>
        </LinearGradient>
      )}

      {/* Header */}
      <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.header}>
        <View style={styles.headerContainer}>
          <Pressable
            onPress={handleGoBack}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Your Trial Period</ThemedText>
          <View style={styles.headerRight}>
            {subscription?.tier && <TierBadge tier={subscription.tier} size="small" />}
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={[styles.scrollView, slideStyle]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Trial Countdown Circle */}
        <View style={styles.countdownSection}>
          <TrialCountdownCircle
            endDate={subscription?.endDate || new Date()}
            size={280}
            strokeWidth={8}
          />
        </View>

        {/* Trial Details */}
        {renderTrialDetails()}

        {/* Benefits Showcase */}
        {renderBenefitsSection()}

        {/* Usage Stats */}
        {stats && renderUsageStats()}

        {/* Pricing Section */}
        {renderPricingSection()}

        {/* Trial Terms */}
        {renderTrialTerms()}

        {/* Footer Spacing */}
        <View style={styles.footerSpacing} />
      </Animated.ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },
  header: {
    paddingTop: StatusBar.currentHeight || 50,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.lg },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  backButton: {
    padding: Spacing.sm },
  headerTitle: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center' },
  headerRight: {
    width: 60,
    alignItems: 'flex-end' },
  scrollView: {
    flex: 1 },
  scrollContent: {
    paddingBottom: 120 },
  urgentBanner: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md },
  urgentBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  urgentBannerText: {
    flex: 1 },
  urgentTitle: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: 'bold' },
  urgentSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    ...Typography.bodySmall,
    marginTop: 2 },
  urgentButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)' },
  urgentButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '600' },
  countdownSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg },
  detailsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default },
  detailsTitle: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.primary },
  autoRenewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 6 },
  autoRenewText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.brand.purpleLight },
  detailsContent: {
    gap: Spacing.base },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center' },
  detailInfo: {
    flex: 1,
    justifyContent: 'center' },
  detailLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
    marginBottom: 3 },
  detailValue: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text.primary },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: 28 },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.base },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md },
  ctaContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.md },
  primaryButton: {
    backgroundColor: Colors.brand.purpleLight,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Shadows.purpleMedium },
  primaryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: 'bold' },
  secondaryButton: {
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    ...Shadows.subtle },
  secondaryButtonText: {
    color: Colors.brand.purpleLight,
    ...Typography.bodyLarge,
    fontWeight: 'bold' },
  buttonDisabled: {
    opacity: 0.6 },
  termsHeader: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.subtle },
  termsTitle: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.primary },
  termsContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginTop: Spacing.sm,
    gap: Spacing.base,
    ...Shadows.subtle },
  termItem: {
    flexDirection: 'row',
    gap: Spacing.md },
  termBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.brand.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 28 },
  termBulletText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: 'bold' },
  termTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.xs },
  termDescription: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
    lineHeight: 18 },
  footerSpacing: {
    height: Spacing.lg },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: Spacing.base },
  loadingText: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary },
  loadingSubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center' } });

export default withErrorBoundary(TrialPage, 'SubscriptionTrial');
