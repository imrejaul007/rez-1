import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Upgrade Confirmation Screen
// Confirm subscription tier upgrade with prorated pricing

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, StatusBar, ActivityIndicator} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useGetCurrencySymbol } from '@/stores/selectors';
import subscriptionAPI from '@/services/subscriptionApi';
import ProratedPriceDisplay from '@/components/subscription/ProratedPriceDisplay';
import FeatureComparisonTable from '@/components/subscription/FeatureComparisonTable';
import StripePaymentModal from '@/components/subscription/StripePaymentModal';
import { SubscriptionTier, TIER_NAMES, TIER_COLORS } from '@/types/subscription.types';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type UpgradeTiming = 'immediate' | 'cycle_end';

function UpgradeConfirmationPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state, computed, actions } = useSubscription();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const currentTier = (params.currentTier as SubscriptionTier) || state.currentSubscription?.tier || 'free';
  const newTier = (params.newTier as SubscriptionTier) || 'premium';

  const [timing, setTiming] = useState<UpgradeTiming>('immediate');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [proratedAmount, setProratedAmount] = useState<number>(0);
  const [creditFromCurrent, setCreditFromCurrent] = useState<number>(0);
  const [upgradeId, setUpgradeId] = useState<string | null>(null);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const isMounted = useIsMounted();

  // Animated arrow
  const arrowAnim = useSharedValue(0);
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowAnim.value }]}));
  useEffect(() => {
    arrowAnim.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 800 }),
        withTiming(0, { duration: 800 })
      ),
      -1
    );
    return () => { arrowAnim.value = 0; };
  }, []);

  // Get tier price from available tiers (DB-driven, not hardcoded)
  const getTierPrice = (tier: SubscriptionTier) => {
    const billingCycle = state.currentSubscription?.billingCycle || 'monthly';
    const tierConfig = state.availableTiers?.find((t: any) => t.tier === tier);
    if (tierConfig?.pricing) {
      return billingCycle === 'yearly' ? tierConfig.pricing.yearly : tierConfig.pricing.monthly;
    }
    // Fallback only if tiers not loaded yet
    if (tier === 'vip') return 299;
    if (tier === 'premium') return 99;
    return 0;
  };

  // Calculate prorated pricing
  useEffect(() => {
    calculateProration();
  }, [timing, state.availableTiers]);

  const calculateProration = () => {
    if (timing === 'cycle_end') {
      setProratedAmount(0);
      setCreditFromCurrent(0);
      return;
    }

    const daysRemaining = computed.daysRemaining;
    const billingCycle = state.currentSubscription?.billingCycle || 'monthly';
    const totalDays = billingCycle === 'yearly' ? 365 : 30;
    const newPrice = getTierPrice(newTier);
    const currentPrice = getTierPrice(currentTier);

    const credit = Math.round((currentPrice * daysRemaining) / totalDays);
    const prorated = Math.max(0, Math.round((newPrice * daysRemaining) / totalDays) - credit);

    setCreditFromCurrent(credit);
    setProratedAmount(prorated);
  };

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true);

      if (timing === 'cycle_end') {
        platformAlertSimple('Upgrade Scheduled', `Your upgrade to ${TIER_NAMES[newTier]} will take effect at the end of your current billing cycle.`);
        router.push('/subscription/manage');
        return;
      }

      // Phase 1: Initiate upgrade (get payment details)
      const billingCycle = state.currentSubscription?.billingCycle || 'monthly';
      const result = await subscriptionAPI.initiateUpgrade(
        newTier as 'premium' | 'vip',
        billingCycle,
        'stripe'
      );

      if (result?.upgradeId) {
        if (!isMounted()) return;
        setUpgradeId(result.upgradeId);
        if (!isMounted()) return;
        setProratedAmount(result.proratedAmount);
        // Phase 2: Open payment modal
        if (!isMounted()) return;
        setShowStripeModal(true);
      }
    } catch (error: any) {
      platformAlertSimple('Upgrade Failed', error.message || 'Failed to process upgrade');
    } finally {
      if (!isMounted()) return;
      setIsUpgrading(false);
    }
  };

  const [isConfirming, setIsConfirming] = React.useState(false);

  const handlePaymentSuccess = async () => {
    setShowStripeModal(false);

    if (upgradeId && !isConfirming) {
      setIsConfirming(true);
      try {
        // Phase 2: Confirm upgrade after payment (idempotent on backend via SubscriptionUpgrade unique index)
        await subscriptionAPI.confirmUpgrade(upgradeId);
        await actions.loadSubscription(true);

        router.push({
          pathname: '/subscription/manage' });
        platformAlertSimple('Upgrade Complete', `You are now a ${TIER_NAMES[newTier]} member!`);
      } catch (error: any) {
        platformAlertSimple('Activation Failed', 'Payment received but upgrade activation failed. Please contact support.');
      } finally {
        if (!isMounted()) return;
        setIsConfirming(false);
      }
    }
  };

  const getUpgradeBenefits = () => {
    const benefits = [];

    if (newTier === 'vip') {
      benefits.push(
        { icon: 'cash', text: 'Upgrade from 2x to 3x cashback', color: Colors.success },
        { icon: 'bicycle', text: 'Free delivery on ALL orders', color: Colors.info },
        { icon: 'person', text: 'Personal shopper assistance', color: Colors.brand.purpleLight },
        { icon: 'calendar', text: 'Access to premium events', color: Colors.warning },
        { icon: 'shield-checkmark', text: 'Dedicated concierge service', color: colors.brand.pink }
      );
    } else if (newTier === 'premium') {
      benefits.push(
        { icon: 'cash', text: '2x cashback on all orders', color: Colors.success },
        { icon: 'bicycle', text: `Free delivery (orders above ${currencySymbol}500)`, color: Colors.info },
        { icon: 'headset', text: 'Priority customer support', color: Colors.brand.purpleLight },
        { icon: 'pricetag', text: 'Exclusive deals & early access', color: Colors.warning }
      );
    }

    return benefits;
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />

      {/* Header */}
      <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple] as any} style={styles.header}>
        <View style={styles.headerContainer}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to cancel and return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Confirm Upgrade</ThemedText>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Upgrade Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.tierContainer}>
              <View style={[styles.tierBox, { backgroundColor: TIER_COLORS[currentTier] + '20' }]}>
                <ThemedText style={[styles.tierLabel, { color: TIER_COLORS[currentTier] }]}>
                  Current
                </ThemedText>
                <ThemedText style={[styles.tierName, { color: TIER_COLORS[currentTier] }]}>
                  {TIER_NAMES[currentTier]}
                </ThemedText>
              </View>

              <Animated.View style={arrowStyle}>
                <Ionicons name="arrow-forward" size={32} color={Colors.brand.purpleLight} />
              </Animated.View>

              <View style={[styles.tierBox, { backgroundColor: TIER_COLORS[newTier] + '20' }]}>
                <ThemedText style={[styles.tierLabel, { color: TIER_COLORS[newTier] }]}>
                  Upgrade to
                </ThemedText>
                <ThemedText style={[styles.tierName, { color: TIER_COLORS[newTier] }]}>
                  {TIER_NAMES[newTier]}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* New Benefits */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>New Benefits You'll Get</ThemedText>
          <View style={styles.benefitsContainer}>
            {getUpgradeBenefits().map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <View style={[styles.benefitIcon, { backgroundColor: `${benefit.color}20` }]}>
                  <Ionicons name={benefit.icon as any} size={20} color={benefit.color} />
                </View>
                <ThemedText style={styles.benefitText}>{benefit.text}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Upgrade Timing */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>When to Upgrade?</ThemedText>

          <Pressable
            style={[styles.timingOption, timing === 'immediate' && styles.timingOptionSelected]}
            onPress={() => setTiming('immediate')}
            accessibilityLabel={`Upgrade immediately. ${proratedAmount > 0 ? `Pay ${proratedAmount} rupees today` : 'No additional charge'}. ${timing === 'immediate' ? 'Selected' : ''}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: timing === 'immediate' }}
            accessibilityHint="Double tap to upgrade immediately and enjoy benefits instantly"
          >
            <View style={styles.radioButton}>
              {timing === 'immediate' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.timingContent}>
              <ThemedText style={styles.timingTitle}>Upgrade Immediately</ThemedText>
              <ThemedText style={styles.timingDescription}>
                Pay prorated amount now and enjoy benefits instantly
              </ThemedText>
              {proratedAmount > 0 && (
                <ThemedText style={styles.timingPrice}>Pay {currencySymbol}{proratedAmount} today</ThemedText>
              )}
            </View>
            <Ionicons name="flash" size={24} color={Colors.warning} />
          </Pressable>

          <Pressable
            style={[styles.timingOption, timing === 'cycle_end' && styles.timingOptionSelected]}
            onPress={() => setTiming('cycle_end')}
            accessibilityLabel={`Upgrade at cycle end. Takes effect after ${computed.daysRemaining} days. ${getTierPrice(newTier)} rupees per month from next cycle. ${timing === 'cycle_end' ? 'Selected' : ''}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: timing === 'cycle_end' }}
            accessibilityHint="Double tap to schedule upgrade for the end of your current billing cycle"
          >
            <View style={styles.radioButton}>
              {timing === 'cycle_end' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.timingContent}>
              <ThemedText style={styles.timingTitle}>Upgrade at Cycle End</ThemedText>
              <ThemedText style={styles.timingDescription}>
                Upgrade takes effect after {computed.daysRemaining} days (no extra charge now)
              </ThemedText>
              <ThemedText style={styles.timingPrice}>{currencySymbol}{getTierPrice(newTier)}/month from next cycle</ThemedText>
            </View>
            <Ionicons name="calendar-outline" size={24} color={Colors.text.tertiary} />
          </Pressable>
        </View>

        {/* Prorated Price Display */}
        {timing === 'immediate' && proratedAmount > 0 && (
          <View style={styles.section}>
            <ProratedPriceDisplay
              originalPrice={getTierPrice(newTier)}
              creditFromCurrentPlan={getTierPrice(currentTier) * (computed.daysRemaining / 30)}
              finalAmount={proratedAmount}
              currentTier={TIER_NAMES[currentTier]}
              newTier={TIER_NAMES[newTier]}
              daysRemaining={computed.daysRemaining}
            />
          </View>
        )}

        {/* Feature Comparison */}
        <View style={styles.section}>
          <FeatureComparisonTable currentTier={currentTier} newTier={newTier} />
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={styles.confirmButton}
            onPress={handleUpgrade}
            disabled={isUpgrading}
            accessibilityLabel={isUpgrading ? 'Processing upgrade' : (timing === 'immediate' ? 'Confirm and pay' : 'Schedule upgrade')}
            accessibilityRole="button"
            accessibilityState={{ disabled: isUpgrading, busy: isUpgrading }}
            accessibilityHint={`Double tap to ${timing === 'immediate' ? 'proceed to payment' : 'schedule your upgrade'}`}
          >
            {isUpgrading ? (
              <ActivityIndicator color={Colors.text.inverse} />
            ) : (
              <>
                <ThemedText style={styles.confirmButtonText}>
                  {timing === 'immediate' ? 'Confirm & Pay' : 'Schedule Upgrade'}
                </ThemedText>
                <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            disabled={isUpgrading}
            accessibilityLabel="Cancel upgrade"
            accessibilityRole="button"
            accessibilityState={{ disabled: isUpgrading }}
            accessibilityHint="Double tap to cancel and return to previous screen"
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      {/* Stripe Payment Modal for upgrade */}
      {showStripeModal && upgradeId && (
        <StripePaymentModal
          visible={showStripeModal}
          tier={newTier as 'premium' | 'vip'}
          amount={proratedAmount}
          billingCycle={(state.currentSubscription?.billingCycle || 'monthly') as any}
          subscriptionId={upgradeId}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowStripeModal(false)}
          onError={(error: Error) => {
            setShowStripeModal(false);
            platformAlertSimple('Payment Failed', error?.message || 'Please try again.');
          }}
        />
      )}
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
  summaryCard: {
    margin: Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5 },
  summaryHeader: {
    alignItems: 'center' },
  tierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base },
  tierBox: {
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    minWidth: 100 },
  tierLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginBottom: Spacing.xs },
  tierName: {
    ...Typography.h3,
    fontWeight: 'bold' },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2 },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md },
  benefitText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.secondary },
  timingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border.default },
  timingOptionSelected: {
    borderColor: Colors.brand.purpleLight,
    backgroundColor: '#8B5CF605' },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.brand.purpleLight },
  timingContent: {
    flex: 1 },
  timingTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs },
  timingDescription: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    lineHeight: 18 },
  timingPrice: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
    marginTop: Spacing.xs },
  actionsContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 40 },
  confirmButton: {
    flexDirection: 'row',
    backgroundColor: Colors.brand.purpleLight,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm },
  confirmButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: 'bold' },
  cancelButton: {
    backgroundColor: Colors.background.secondary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center' },
  cancelButtonText: {
    color: Colors.text.tertiary,
    ...Typography.bodyLarge,
    fontWeight: '600' } });

export default withErrorBoundary(UpgradeConfirmationPage, 'SubscriptionUpgradeConfirmation');
