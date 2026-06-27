// @ts-nocheck
// Subscription Plans Page - Premium ReZ Design System
// Display all subscription tiers with glassmorphism and premium styling

import React, { useState, useEffect, useLayoutEffect} from 'react';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { View, StyleSheet, ScrollView, Pressable, StatusBar, ActivityIndicator, TextInput, Platform, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useNavigation } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSubscription } from '@/contexts/SubscriptionContext';
import subscriptionAPI from '@/services/subscriptionApi';
import stripeApi from '@/services/stripeApi';
import type { SubscriptionTier as TierType, BillingCycle } from '@/types/subscription.types';
import PaymentSuccessModal from '@/components/subscription/PaymentSuccessModal';
import StripePaymentModal from '@/components/subscription/StripePaymentModal';
import { useAuthUser, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { showToast } from '@/components/common/ToastManager';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
const { width } = Dimensions.get('window');

function SubscriptionPlansPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const { state, actions } = useSubscription();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const isMounted = useIsMounted();
  const currencySymbol = getCurrencySymbol();
  const currentTier = state.currentSubscription?.tier || 'free';

  // Get DB-driven pricing from availableTiers with hardcoded fallbacks
  const getTierPricing = (tier: string) => {
    const config = state.availableTiers?.find((t: any) => t.tier === tier);
    if (config?.pricing) return { monthly: config.pricing.monthly, yearly: config.pricing.yearly };
    if (tier === 'vip') return { monthly: 299, yearly: 2850 };
    if (tier === 'premium') return { monthly: 99, yearly: 950 };
    return { monthly: 0, yearly: 0 };
  };
  const getTierFeatures = (tier: string, fallback: string[]): string[] => {
    const config = state.availableTiers?.find((t: any) => t.tier === tier);
    return config?.features?.length > 0 ? config.features : fallback;
  };

  const [selectedBilling, setSelectedBilling] = useState<BillingCycle>('monthly');
  const [selectedTier, setSelectedTier] = useState<'premium' | 'vip' | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Animations
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  // Stripe payment states
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    subscriptionId: string;
    amount: number;
    tier: 'premium' | 'vip';
    billingCycle: BillingCycle;
  } | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Hide the default navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false });
  }, [navigation]);

  // Entrance animation
  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 500 });
    slideAnim.value = withSpring(0, { damping: 8, stiffness: 50 });
  }, []);

  // Safe navigation function for web compatibility
  const handleGoBack = () => {
    try {
      if (navigation && navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else if (router && router.push) {
        router.push('/');
      } else {
        router.replace('/');
      }
    } catch (error) {
      if (router) {
        router.replace('/');
      }
    }
  };

  useEffect(() => {
    actions.loadSubscription();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoValid, setPromoValid] = useState(false);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);

  // Handle subscription purchase with Stripe payment flow
  const handleSubscribe = async (tier: 'premium' | 'vip') => {
    try {
      setIsSubscribing(true);
      setSelectedTier(tier);

      if (!stripeApi.isConfigured()) {
        if (Platform.OS === 'web') {
          showToast({ message: 'Payment not available. Stripe is not configured properly.', type: 'error' });
        } else {
          platformAlertSimple('Payment Not Available', 'Stripe is not configured properly.');
        }
        setIsSubscribing(false);
        setSelectedTier(null);
        return;
      }

      // Get prices from backend (available tiers from SubscriptionContext)
      const pricing = getTierPricing(tier);
      const amount = selectedBilling === 'monthly' ? pricing.monthly : pricing.yearly;

      const confirmMessage = `Subscribe to ${tier === 'vip' ? 'VIP' : 'Premium'} plan for ${selectedBilling === 'monthly' ? 'monthly' : 'yearly'} billing?\n\nAmount: ${currencySymbol}${amount}`;

      if (Platform.OS === 'web') {
        const confirmed = window.confirm(confirmMessage);

        if (!confirmed) {
          setIsSubscribing(false);
          setSelectedTier(null);
          return;
        }

        try {
          setProcessingPayment(true);
          showToast({ message: 'Creating your subscription...', type: 'info' });

          const result = await subscriptionAPI.subscribeToPlan(
            tier,
            selectedBilling,
            'stripe',
            promoCode || undefined
          );

          if (result && result.subscription) {
            showToast({ message: 'Subscription created! Opening payment...', type: 'success' });
            if (!isMounted()) return;
            setPaymentData({
              subscriptionId: result.subscription._id,
              amount,
              tier,
              billingCycle: selectedBilling });
            if (!isMounted()) return;
            setShowStripeModal(true);
            if (!isMounted()) return;
            setIsSubscribing(false);
            if (!isMounted()) return;
            setProcessingPayment(false);
          } else {
            throw new Error('Failed to create subscription');
          }
        } catch (error: any) {
          showToast({ message: error.message || 'Failed to create subscription.', type: 'error' });
          if (!isMounted()) return;
          setIsSubscribing(false);
          if (!isMounted()) return;
          setSelectedTier(null);
          if (!isMounted()) return;
          setProcessingPayment(false);
        }
      } else {
        platformAlertConfirm('Confirm Subscription', confirmMessage, async () => {
          try {
            setProcessingPayment(true);
            const result = await subscriptionAPI.subscribeToPlan(
              tier,
              selectedBilling,
              'stripe',
              promoCode || undefined
            );

            if (result && result.subscription) {
              if (!isMounted()) return;
              setPaymentData({
                subscriptionId: result.subscription._id,
                amount,
                tier,
                billingCycle: selectedBilling });
              if (!isMounted()) return;
              setShowStripeModal(true);
              if (!isMounted()) return;
              setIsSubscribing(false);
              if (!isMounted()) return;
              setProcessingPayment(false);
            } else {
              throw new Error('Failed to create subscription');
            }
          } catch (error: any) {
            platformAlertSimple('Subscription Failed', error.message || 'Please try again.');
            if (!isMounted()) return;
            setIsSubscribing(false);
            if (!isMounted()) return;
            setSelectedTier(null);
            if (!isMounted()) return;
            setProcessingPayment(false);
          }
        }, 'Proceed to Payment');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred.';
      if (Platform.OS === 'web') {
        showToast({ message: errorMessage, type: 'error' });
      } else {
        platformAlertSimple('Error', errorMessage);
      }
      if (!isMounted()) return;
      setIsSubscribing(false);
      if (!isMounted()) return;
      setSelectedTier(null);
      if (!isMounted()) return;
      setProcessingPayment(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setPaymentData(null);
  };

  const handlePaymentSuccess = () => {
    setShowStripeModal(false);
    setSelectedTier(null);
    setPaymentData(null);

    if (Platform.OS === 'web') {
      showToast({ message: 'Payment successful! Your subscription is now active.', type: 'success', duration: 5000 });
    }

    actions.loadSubscription(true);

    if (paymentData) {
      setShowSuccessModal(true);
    }
  };

  const handlePaymentClose = () => {
    setShowStripeModal(false);
    setSelectedTier(null);
    setIsSubscribing(false);
    setProcessingPayment(false);
  };

  const handlePaymentError = (error: Error) => {
    setShowStripeModal(false);
    setSelectedTier(null);
    setIsSubscribing(false);
    setProcessingPayment(false);

    if (Platform.OS === 'web') {
      showToast({ message: `Payment failed: ${error.message}`, type: 'error', duration: 5000 });
    } else {
      platformAlertSimple('Payment Failed', error.message);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      if (Platform.OS === 'web') {
        showToast({ message: 'Please enter a promo code', type: 'error' });
      } else {
        platformAlertSimple('Error', 'Please enter a promo code');
      }
      return;
    }

    const tierToValidate: 'premium' | 'vip' = selectedTier || 'premium';
    setValidatingPromo(true);

    if (Platform.OS === 'web') {
      showToast({ message: 'Validating promo code...', type: 'info' });
    }

    try {
      const response = await subscriptionAPI.validatePromoCode(
        promoCode,
        tierToValidate,
        selectedBilling
      );

      if (response.success && response.data) {
        if (!isMounted()) return;
        setPromoValid(true);
        if (!isMounted()) return;
        setPromoDiscount(response.data.discount);
        if (!isMounted()) return;
        setFinalPrice(response.data.finalPrice);
        const successMsg = response.data.message || `Promo applied! You saved ${currencySymbol}${response.data.discount}`;
        if (Platform.OS === 'web') {
          showToast({ message: successMsg, type: 'success' });
        } else {
          platformAlertSimple('Success!', successMsg);
        }
      } else {
        if (!isMounted()) return;
        setPromoValid(false);
        if (!isMounted()) return;
        setPromoDiscount(0);
        if (!isMounted()) return;
        setFinalPrice(null);
        const errorMsg = response.message || 'This promo code is not valid';
        if (Platform.OS === 'web') {
          showToast({ message: errorMsg, type: 'error' });
        } else {
          platformAlertSimple('Invalid Code', errorMsg);
        }
      }
    } catch (error: any) {
      if (!isMounted()) return;
      setPromoValid(false);
      if (!isMounted()) return;
      setPromoDiscount(0);
      if (!isMounted()) return;
      setFinalPrice(null);
      if (Platform.OS === 'web') {
        showToast({ message: 'Failed to validate promo code.', type: 'error' });
      } else {
        platformAlertSimple('Error', 'Failed to validate promo code.');
      }
    } finally {
      if (!isMounted()) return;
      setValidatingPromo(false);
    }
  };

  // Render feature item
  const renderFeature = (feature: string, included: boolean) => (
    <View style={styles.featureRow} key={feature}>
      <View style={[styles.featureIcon, included && styles.featureIconActive]}>
        <Ionicons
          name={included ? 'checkmark' : 'close'}
          size={14}
          color={included ? Colors.background.primary : Colors.text.tertiary}
        />
      </View>
      <ThemedText style={[styles.featureText, !included && styles.featureTextDisabled]}>
        {feature}
      </ThemedText>
    </View>
  );

  // Render plan card with premium glassmorphism
  const renderPlanCard = (
    tier: TierType,
    name: string,
    price: number,
    yearlyPrice: number,
    features: string[],
    gradientColors: string[],
    icon: string,
    popular?: boolean
  ) => {
    const isCurrentTier = currentTier === tier;
    const displayPrice = selectedBilling === 'monthly' ? price : Math.floor(yearlyPrice / 12);
    const isUpgrade = tier === 'premium' || tier === 'vip';
    const isVIP = tier === 'vip';
    const isPremium = tier === 'premium';

    return (
      <Animated.View
        style={[
          styles.planCardWrapper,
          contentAnimStyle,
        ]}
      >
        {popular && (
          <LinearGradient
            colors={[Colors.gold, Colors.goldDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.popularBadge}
          >
            <Ionicons name="star" size={12} color={Colors.nileBlue} />
            <ThemedText style={styles.popularText}>MOST POPULAR</ThemedText>
          </LinearGradient>
        )}

        <View style={[styles.planCard, popular && styles.planCardPopular]}>
          {/* Card Shine Effect */}
          <View style={styles.cardShine} />

          {/* Plan Header */}
          <LinearGradient
            colors={gradientColors as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.planHeader}
          >
            <View style={styles.planIconContainer}>
              <Ionicons name={icon as any} size={28} color={Colors.background.primary} />
            </View>
            <ThemedText style={styles.planName}>{name}</ThemedText>
            {isCurrentTier && (
              <View style={styles.currentBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.background.primary} />
                <ThemedText style={styles.currentBadgeText}>Current</ThemedText>
              </View>
            )}
          </LinearGradient>

          {/* Plan Body */}
          <View style={styles.planBody}>
            {/* Price */}
            <View style={styles.priceContainer}>
              <ThemedText style={styles.currency}>{currencySymbol}</ThemedText>
              <ThemedText style={styles.price}>{displayPrice}</ThemedText>
              <ThemedText style={styles.period}>/month</ThemedText>
            </View>

            {selectedBilling === 'yearly' && yearlyPrice > 0 && (
              <View style={styles.savingsContainer}>
                <Ionicons name="pricetag" size={14} color={Colors.gold} />
                <ThemedText style={styles.yearlyNote}>
                  Save {Math.round(((price * 12 - yearlyPrice) / (price * 12)) * 100)}% — {currencySymbol}{yearlyPrice}/year
                </ThemedText>
              </View>
            )}

            {/* Features */}
            <View style={styles.featuresContainer}>
              {features.map((feature) => renderFeature(feature, true))}
            </View>

            {/* CTA Button */}
            {tier === 'free' ? (
              <View style={styles.freeButton}>
                <ThemedText style={styles.freeButtonText}>Current Plan</ThemedText>
              </View>
            ) : isCurrentTier ? (
              <View style={styles.activeButton}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
                <ThemedText style={styles.activeButtonText}>Active</ThemedText>
              </View>
            ) : (
              <Pressable
                onPress={() => handleSubscribe(tier as 'premium' | 'vip')}
                disabled={isSubscribing}
               
              >
                <LinearGradient
                  colors={isVIP ? [Colors.gold, Colors.goldDark] : [Colors.gold, Colors.nileBlue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.upgradeButton}
                >
                  {isSubscribing && selectedTier === tier ? (
                    <ActivityIndicator color={isVIP ? Colors.nileBlue : Colors.background.primary} />
                  ) : (
                    <>
                      <ThemedText style={[styles.upgradeButtonText, isVIP && styles.vipButtonText]}>
                        {isUpgrade ? 'Upgrade Now' : 'Downgrade'}
                      </ThemedText>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color={isVIP ? Colors.nileBlue : Colors.background.primary}
                      />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />

      {/* Premium Glassmorphism Background */}
      <LinearGradient
        colors={[Colors.background.secondary, colors.greenMist, Colors.background.secondary]}
        style={styles.backgroundGradient}
      />

      {/* Decorative Orbs */}
      <View style={[styles.decorativeOrb, styles.orbPrimary]} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.gold, Colors.nileBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContainer}>
          <Pressable onPress={handleGoBack} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color={Colors.background.primary} />
            </View>
          </Pressable>
          <ThemedText style={styles.headerTitle}>Choose Your Plan</ThemedText>
          <View style={styles.headerRight} />
        </View>

        {/* Header Subtitle */}
        <ThemedText style={styles.headerSubtitle}>
          Unlock premium rewards and exclusive benefits
        </ThemedText>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Billing Toggle */}
        <View style={styles.billingToggleWrapper}>
          <View style={styles.billingToggleContainer}>
            <Pressable
              style={[
                styles.billingOption,
                selectedBilling === 'monthly' && styles.billingOptionActive,
              ]}
              onPress={() => setSelectedBilling('monthly')}
            >
              {selectedBilling === 'monthly' && (
                <LinearGradient
                  colors={[Colors.gold, Colors.nileBlue]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              )}
              <ThemedText
                style={[
                  styles.billingOptionText,
                  selectedBilling === 'monthly' && styles.billingOptionTextActive,
                ]}
              >
                Monthly
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.billingOption,
                selectedBilling === 'yearly' && styles.billingOptionActive,
              ]}
              onPress={() => setSelectedBilling('yearly')}
            >
              {selectedBilling === 'yearly' && (
                <LinearGradient
                  colors={[Colors.gold, Colors.nileBlue]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              )}
              <ThemedText
                style={[
                  styles.billingOptionText,
                  selectedBilling === 'yearly' && styles.billingOptionTextActive,
                ]}
              >
                Yearly
              </ThemedText>
              <View style={styles.saveBadge}>
                <ThemedText style={styles.saveText}>-20%</ThemedText>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Promo Code Section */}
        <View style={styles.promoSection}>
          <Pressable
            style={styles.promoToggle}
            onPress={() => setShowPromoInput(!showPromoInput)}
          >
            <View style={styles.promoIconContainer}>
              <Ionicons name="pricetag" size={18} color={Colors.gold} />
            </View>
            <ThemedText style={styles.promoToggleText}>
              {showPromoInput ? 'Hide Promo Code' : 'Have a Promo Code?'}
            </ThemedText>
            <Ionicons
              name={showPromoInput ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.gold}
            />
          </Pressable>

          {showPromoInput && (
            <View style={styles.promoInputContainer}>
              <TextInput
                style={styles.promoInput}
                value={promoCode}
                onChangeText={setPromoCode}
                placeholder="Enter promo code"
                placeholderTextColor={Colors.text.tertiary}
                autoCapitalize="characters"
              />
              <Pressable
                onPress={handleApplyPromo}
                disabled={validatingPromo}
              >
                <LinearGradient
                  colors={[Colors.gold, Colors.nileBlue]}
                  style={styles.promoApplyButton}
                >
                  {validatingPromo ? (
                    <ActivityIndicator color={Colors.background.primary} size="small" />
                  ) : (
                    <ThemedText style={styles.promoApplyText}>Apply</ThemedText>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {promoValid && promoDiscount > 0 && (
            <View style={styles.promoApplied}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <ThemedText style={styles.promoAppliedText}>
                Promo applied! You saved {currencySymbol}{promoDiscount}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {/* Free Tier */}
          {renderPlanCard(
            'free',
            'Free',
            0,
            0,
            getTierFeatures('free', [
              'Basic cashback',
              'Access to all stores',
              'Email support',
              'Basic wishlist',
            ]),
            [colors.neutral[400], colors.neutral[500]],
            'person-outline'
          )}

          {/* Premium Tier */}
          {renderPlanCard(
            'premium',
            'Premium',
            getTierPricing('premium').monthly,
            getTierPricing('premium').yearly,
            getTierFeatures('premium', [
              '2x cashback on all orders',
              `Free delivery on ${currencySymbol}500+ orders`,
              'Priority customer support',
              'Exclusive deals & early access',
              'Unlimited wishlists',
              'Birthday & anniversary offers',
            ]),
            [Colors.gold, Colors.nileBlue],
            'star',
            true
          )}

          {/* VIP Tier */}
          {renderPlanCard(
            'vip',
            'VIP',
            getTierPricing('vip').monthly,
            getTierPricing('vip').yearly,
            getTierFeatures('vip', [
              '3x cashback on all orders',
              'Free delivery on all orders',
              'Dedicated concierge service',
              'Premium events access',
              'Personal shopper assistance',
              'Early flash sale access (1 hour)',
              'All Premium benefits',
            ]),
            [Colors.gold, Colors.goldDark],
            'diamond'
          )}
        </View>

        {/* Comparison Table */}
        <View style={styles.comparisonSection}>
          <View style={styles.comparisonHeader}>
            <Ionicons name="grid-outline" size={20} color={Colors.gold} />
            <ThemedText style={styles.comparisonTitle}>Feature Comparison</ThemedText>
          </View>

          <View style={styles.comparisonTable}>
            <View style={styles.comparisonTableHeader}>
              <ThemedText style={styles.comparisonHeaderText}>Feature</ThemedText>
              <ThemedText style={styles.comparisonHeaderText}>Free</ThemedText>
              <ThemedText style={[styles.comparisonHeaderText, { color: Colors.gold }]}>
                Premium
              </ThemedText>
              <ThemedText style={[styles.comparisonHeaderText, { color: Colors.gold }]}>
                VIP
              </ThemedText>
            </View>

            {[
              { name: 'Cashback Rate', values: ['1x', '2x', '3x'] },
              { name: 'Free Delivery', values: [false, true, true] },
              { name: 'Priority Support', values: [false, true, true] },
              { name: 'Personal Shopper', values: [false, false, true] },
            ].map((row, index) => (
              <View key={row.name} style={[styles.comparisonRow, index % 2 === 0 && styles.comparisonRowAlt]}>
                <ThemedText style={styles.comparisonFeature}>{row.name}</ThemedText>
                {row.values.map((value, i) => (
                  <View key={i} style={styles.comparisonCell}>
                    {typeof value === 'string' ? (
                      <ThemedText style={styles.comparisonValue}>{value}</ThemedText>
                    ) : value ? (
                      <View style={styles.checkIcon}>
                        <Ionicons name="checkmark" size={14} color={Colors.background.primary} />
                      </View>
                    ) : (
                      <Ionicons name="close" size={18} color={Colors.error} />
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Stripe Payment Modal */}
      {showStripeModal && paymentData && (
        <StripePaymentModal
          visible={showStripeModal}
          tier={paymentData.tier}
          amount={paymentData.amount}
          billingCycle={paymentData.billingCycle}
          subscriptionId={paymentData.subscriptionId}
          onSuccess={handlePaymentSuccess}
          onClose={handlePaymentClose}
          onError={handlePaymentError}
        />
      )}

      {/* Payment Success Modal */}
      {showSuccessModal && paymentData && (
        <PaymentSuccessModal
          visible={showSuccessModal}
          tier={paymentData.tier}
          price={paymentData.amount}
          billingCycle={paymentData.billingCycle}
          onClose={handleSuccessClose}
        />
      )}

      {/* Toast handled by global ToastManager */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    overflow: 'hidden' },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject },
  decorativeOrb: {
    position: 'absolute',
    borderRadius: 200,
    opacity: 0.3 },
  orbPrimary: {
    width: 300,
    height: 300,
    backgroundColor: Colors.goldGlow,
    top: -100,
    right: -100 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 50,
    paddingBottom: 24,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  backButton: {
    padding: Spacing.xs },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center' },
  headerTitle: {
    color: Colors.text.inverse,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    flex: 1,
    textAlign: 'center' },
  headerRight: {
    width: 48 },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontFamily: 'Inter-Regular' },
  scrollView: {
    flex: 1 },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 120 },
  billingToggleWrapper: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.base },
  billingToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: Colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12 },
      android: {
        elevation: 4 },
      web: {
        boxShadow: '0 4px 12px rgba(11, 34, 64, 0.08)' } }) },
  billingOption: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    position: 'relative',
    overflow: 'hidden' },
  billingOptionActive: {
    // Gradient applied via LinearGradient
  },
  billingOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.secondary,
    fontFamily: 'Inter-SemiBold' },
  billingOptionTextActive: {
    color: Colors.text.inverse },
  saveBadge: {
    position: 'absolute',
    top: 2,
    right: 8,
    backgroundColor: Colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm },
  saveText: {
    color: Colors.nileBlue,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Inter-SemiBold' },
  promoSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: Colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12 },
      android: {
        elevation: 4 },
      web: {
        boxShadow: '0 4px 12px rgba(11, 34, 64, 0.08)' } }) },
  promoToggle: {
    flexDirection: 'row',
    alignItems: 'center' },
  promoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 },
  promoToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gold,
    fontFamily: 'Inter-SemiBold' },
  promoInputContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.base },
  promoInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 192, 106, 0.2)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: 14,
    color: Colors.nileBlue,
    backgroundColor: Colors.background.primary,
    fontFamily: 'Inter-Regular' },
  promoApplyButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: 'center' },
  promoApplyText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold' },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)' },
  promoAppliedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    fontFamily: 'Inter-SemiBold' },
  plansContainer: {
    paddingHorizontal: Spacing.lg },
  planCardWrapper: {
    marginBottom: Spacing.lg },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: Colors.nileBlue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20 },
      android: {
        elevation: 8 },
      web: {
        boxShadow: '0 8px 24px rgba(11, 34, 64, 0.12)' } }) },
  planCardPopular: {
    borderColor: 'rgba(255, 200, 87, 0.5)',
    borderWidth: 2 },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewY: '-5deg' }],
    opacity: 0.5 },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20 },
  popularText: {
    color: Colors.nileBlue,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'Inter-SemiBold' },
  planHeader: {
    padding: Spacing.xl,
    alignItems: 'center' },
  planIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md },
  planName: {
    color: Colors.text.inverse,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold' },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: Spacing.xs },
  currentBadgeText: {
    color: Colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold' },
  planBody: {
    padding: Spacing.xl },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: Spacing.sm },
  currency: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginTop: Spacing.sm,
    fontFamily: 'Poppins-Bold' },
  price: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.nileBlue,
    fontFamily: 'Poppins-Bold' },
  period: {
    fontSize: 16,
    color: Colors.text.tertiary,
    marginTop: Spacing.xl,
    fontFamily: 'Inter-Regular' },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.base,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    alignSelf: 'center' },
  yearlyNote: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold' },
  featuresContainer: {
    marginVertical: Spacing.lg },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14 },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.text.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 },
  featureIconActive: {
    backgroundColor: Colors.gold },
  featureText: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
    fontFamily: 'Inter-Regular' },
  featureTextDisabled: {
    color: Colors.text.tertiary },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    borderRadius: 14,
    gap: Spacing.sm },
  upgradeButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold' },
  vipButtonText: {
    color: Colors.nileBlue },
  activeButton: {
    flexDirection: 'row',
    backgroundColor: Colors.goldLight,
    paddingVertical: Spacing.base,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 192, 106, 0.2)' },
  activeButtonText: {
    color: Colors.gold,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold' },
  freeButton: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    paddingVertical: Spacing.base,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.2)' },
  freeButtonText: {
    color: Colors.text.tertiary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold' },
  comparisonSection: {
    margin: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: Colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12 },
      android: {
        elevation: 4 },
      web: {
        boxShadow: '0 4px 12px rgba(11, 34, 64, 0.08)' } }) },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.lg },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.nileBlue,
    fontFamily: 'Poppins-Bold' },
  comparisonTable: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden' },
  comparisonTableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.goldLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm },
  comparisonHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.nileBlue,
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold' },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)' },
  comparisonRowAlt: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)' },
  comparisonFeature: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    fontFamily: 'Inter-Regular' },
  comparisonCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center' },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.nileBlue,
    fontFamily: 'Inter-SemiBold' },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center' } });

export default withErrorBoundary(SubscriptionPlansPage, 'SubscriptionPlans');
