// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Payment Page with Razorpay + Stripe Dual Gateway Support
// Supports multi-currency: INR (Razorpay/Stripe), AED/USD/EUR/GBP (Stripe only)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Dimensions} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FormPageSkeleton } from '@/components/skeletons';
import paymentService, { PaymentMethod, PaymentResponse } from '@/services/paymentService';
import PaymentValidator from '@/services/paymentValidation';
import apiClient from '@/services/apiClient';
import travelApi from '@/services/travelApi';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { getCurrencySymbol as getPaymentCurrencySymbol } from '@/config/payment';
import * as WebBrowser from 'expo-web-browser';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Import Razorpay for native support
let RazorpayCheckout: any = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (error) {
  // Not available in Expo Go
}

const { width, height } = Dimensions.get('window');

// Razorpay Key from environment
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';

// Currencies that require Stripe (Razorpay is INR-only)
const STRIPE_ONLY_CURRENCIES = ['AED', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];

type PaymentGateway = 'razorpay' | 'stripe';

function PaymentPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const getCurrencySymbol = useGetCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const currencySymbol = getCurrencySymbol();
  const amount = Number(params.amount) || 5000;
  const currency = ((params.currency as string) || 'INR').toUpperCase();
  const orderId = params.orderId as string;
  const bookingId = params.bookingId as string;
  const bookingType = params.bookingType as string;
  const gatewayParam = params.paymentGateway as PaymentGateway | undefined;
  const isTravelPayment = bookingType === 'travel';

  // Track navigation timeouts so they can be cancelled on unmount
  const navTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  useEffect(() => {
    return () => {
      navTimeoutsRef.current.forEach(t => clearTimeout(t));
      navTimeoutsRef.current.clear();
    };
  }, []);

  // Determine payment gateway based on currency and param
  const resolveGateway = (): PaymentGateway => {
    if (gatewayParam) return gatewayParam;
    if (STRIPE_ONLY_CURRENCIES.includes(currency)) return 'stripe';
    return 'stripe'; // Default to Stripe (matches DEFAULT_PAYMENT_PROVIDER config)
  };

  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway>(resolveGateway);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'methods' | 'processing'>('methods');
  const [paymentStartedAt, setPaymentStartedAt] = useState<number | null>(null);
  const [orderCreated, setOrderCreated] = useState(false);

  // Razorpay state
  const [razorpayOrderId, setRazorpayOrderId] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState(RAZORPAY_KEY_ID);

  // Stripe state
  const [stripeSessionId, setStripeSessionId] = useState('');

  // Payment timeout (5 minutes)
  useEffect(() => {
    if (!paymentStartedAt) return;
    const timeout = setTimeout(() => {
      if (isProcessing) {
        setIsProcessing(false);
        setCurrentStep('methods');
        platformAlertConfirm(
          'Payment Timeout',
          'Your payment session has expired. Please try again.',
          () => setPaymentStartedAt(null),
          'Retry'
        );
      }
    }, 5 * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [paymentStartedAt, isProcessing]);

  // Animation values
  const fadeAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);
  const progressAnim = useSharedValue(0);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadPaymentMethods();
    animateEntrance();
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (currentStep === 'processing') {
      animateProgress();
    }
  }, [currentStep]);

  const animateEntrance = () => {
    fadeAnim.value = 0.3;
    slideAnim.value = 20;
    fadeAnim.value = withTiming(1, { duration: 400 });
    slideAnim.value = withTiming(0, { duration: 400 });
  };

  const animateProgress = () => {
    progressAnim.value = withTiming(1, { duration: 2000 });
  };

  const stepContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }]}));

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progressAnim.value, [0, 1], [0, 100])}%`}));

  const loadPaymentMethods = async () => {
    setIsLoading(true);
    try {
      const response = await paymentService.getPaymentMethods();
      if (response.success && response.data) {
        const methods = response.data.map(method => ({
          ...method,
          gateway: paymentGateway}));
        if (!isMounted()) return;
        setPaymentMethods(methods);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to load payment methods. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleBackPress = useCallback(() => {
    if (isProcessing) {
      platformAlertDestructive(
        'Payment in Progress',
        'A payment is being processed. Are you sure you want to go back?',
        'Go Back',
        () => {
            setIsProcessing(false);
            setCurrentStep('methods');
            router.canGoBack() ? router.back() : router.replace('/(tabs)');
          }
      );
    } else {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    }
  }, [isProcessing, router]);

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);

    if (paymentGateway === 'stripe') {
      handleStripePayment();
    } else {
      handleRazorpayPayment();
    }
  };

  // ==================== STRIPE FLOW ====================

  const handleStripePayment = async () => {
    setCurrentStep('processing');
    setIsProcessing(true);
    setPaymentStartedAt(Date.now());

    try {
      // Build success/cancel URLs
      const baseUrl = Platform.OS === 'web'
        ? window.location.origin
        : 'https://rez.app'; // Deep link base

      let successUrl: string;
      let cancelUrl: string;

      if (isTravelPayment) {
        successUrl = `${baseUrl}/travel-booking-confirmation?bookingId=${bookingId}&stripeSuccess=true`;
        cancelUrl = `${baseUrl}/payment-razorpay?bookingId=${bookingId}&bookingType=travel&amount=${amount}&currency=${currency}&cancelled=true`;
      } else {
        successUrl = `${baseUrl}/order-confirmation?orderId=${orderId}&stripeSuccess=true`;
        cancelUrl = `${baseUrl}/payment-razorpay?orderId=${orderId}&amount=${amount}&currency=${currency}&cancelled=true`;
      }

      let response;

      if (isTravelPayment) {
        // Travel Stripe session
        response = await travelApi.createStripeSession(
          bookingId,
          amount,
          currency,
          successUrl,
          cancelUrl
        );
      } else {
        // Standard order Stripe session
        response = await apiClient.post('/payment/create-checkout-session', {
          orderId,
          amount,
          currency,
          successUrl,
          cancelUrl});
      }

      if (response.success && response.data) {
        const checkoutUrl = response.data.url;
        const sessionId = response.data.sessionId;

        if (!checkoutUrl) {
          throw new Error('No checkout URL received from Stripe');
        }

        if (!isMounted()) return;
        setStripeSessionId(sessionId);

        // Redirect to Stripe Checkout
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          // Web: Direct redirect
          window.location.href = checkoutUrl;
        } else {
          // Native: Open in-app browser
          const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
            dismissButtonStyle: 'cancel',
            showTitle: true,
            enableBarCollapsing: true});

          // Browser closed — verify payment
          if (result.type === 'cancel' || result.type === 'dismiss') {
            await verifyStripePaymentAfterReturn(sessionId);
          }
        }
      } else {
        throw new Error(response.error || 'Failed to create Stripe checkout session');
      }
    } catch (error: any) {
      if (!isMounted()) return;
      setCurrentStep('methods');
      if (!isMounted()) return;
      setIsProcessing(false);
      platformAlertSimple(
        'Payment Failed',
        error.message || 'Failed to initiate Stripe payment. Please try again.'
      );
    }
  };

  const verifyStripePaymentAfterReturn = async (sessionId: string) => {
    try {
      let response;

      if (isTravelPayment) {
        response = await travelApi.verifyStripeSession(sessionId, bookingId);
      } else {
        response = await apiClient.post('/payment/verify-stripe-session', {
          sessionId,
          orderId});
      }

      if (response.success && response.data?.verified) {
        if (!isMounted()) return;
        setIsProcessing(false);
        if (!isMounted()) return;
        const t = setTimeout(() => {
          navTimeoutsRef.current.delete(t);
          if (isTravelPayment) {
            router.replace(`/travel-booking-confirmation?bookingId=${bookingId}` as any);
          } else {
            router.replace(`/order-confirmation?orderId=${orderId}` as any);
          }
        }, 500);
        navTimeoutsRef.current.add(t);
      } else {
        // Payment might not be complete — show retry option
        if (!isMounted()) return;
        setIsProcessing(false);
        if (!isMounted()) return;
        setCurrentStep('methods');
        platformAlertConfirm(
          'Payment Incomplete',
          'Your payment may not have been completed. Would you like to try again?',
          () => handleStripePayment(),
          'Try Again'
        );
      }
    } catch (error) {
      if (!isMounted()) return;
      setIsProcessing(false);
      if (!isMounted()) return;
      setCurrentStep('methods');
    }
  };

  // ==================== RAZORPAY FLOW ====================

  const createRazorpayOrder = async (): Promise<any> => {
    // Double-payment prevention
    if (orderCreated && razorpayOrderId) {
      return { razorpayOrderId, razorpayKeyId };
    }

    try {
      setPaymentStartedAt(Date.now());
      let response;
      if (isTravelPayment) {
        response = await apiClient.post('/travel-payment/create-order', {
          bookingId,
          amount,
          currency});
      } else {
        response = await apiClient.post('/payment/create-order', {
          orderId,
          amount,
          currency});
      }

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create payment order');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const verifyRazorpayPaymentOnBackend = async (paymentData: any): Promise<boolean> => {
    try {
      let response;
      if (isTravelPayment) {
        response = await apiClient.post('/travel-payment/verify', {
          bookingId,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature});
      } else {
        response = await apiClient.post('/payment/verify', {
          orderId,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature});
      }

      return !!(response.success && response.data);
    } catch (error: any) {
      return false;
    }
  };

  const handleRazorpayPayment = async () => {
    setCurrentStep('processing');
    setIsProcessing(true);

    try {
      const orderData = await createRazorpayOrder();

      if (!isMounted()) return;
      setRazorpayOrderId(orderData.razorpayOrderId);
      if (!isMounted()) return;
      setRazorpayKeyId(orderData.razorpayKeyId);
      if (!isMounted()) return;
      setOrderCreated(true);

      if (RazorpayCheckout) {
        openNativeRazorpayCheckout(orderData);
      } else {
        openWebRazorpayCheckout(orderData);
      }
    } catch (error: any) {
      if (!isMounted()) return;
      setCurrentStep('methods');
      if (!isMounted()) return;
      setIsProcessing(false);
      platformAlertSimple(
        'Payment Failed',
        error.message || 'Failed to initiate payment. Please try again.'
      );
    }
  };

  const openNativeRazorpayCheckout = (orderData: any) => {
    const options = {
      description: isTravelPayment ? 'REZ - Travel Booking' : 'REZ App Payment',
      image: 'https://your-logo-url.com/logo.png',
      currency: orderData.currency,
      key: orderData.razorpayKeyId,
      amount: orderData.amount,
      order_id: orderData.razorpayOrderId,
      name: 'REZ App',
      prefill: {
        email: 'user@example.com',
        contact: '9876543210',
        name: 'User Name'},
      theme: { color: colors.brand.purpleLight },
      modal: {
        ondismiss: () => {
          setCurrentStep('methods');
          setIsProcessing(false);
          platformAlertSimple('Payment Cancelled', 'You cancelled the payment.');
        }}};

    RazorpayCheckout.open(options)
      .then((data: any) => {
        handlePaymentSuccess(data);
      })
      .catch((error: any) => {
        handlePaymentFailure(error);
      });
  };

  const openWebRazorpayCheckout = (orderData: any) => {
    if (__DEV__) {
      // Mock payment flow for development only
      platformAlertConfirm(
        'DEV: Mock Payment',
        'This mock payment only works in development mode.',
        () => {
          const t = setTimeout(() => {
            navTimeoutsRef.current.delete(t);
            const mockData = {
              razorpay_order_id: orderData.razorpayOrderId,
              razorpay_payment_id: 'pay_mock_' + Date.now(),
              razorpay_signature: 'mock_signature_' + Date.now()};
            handlePaymentSuccess(mockData);
          }, 2000);
          navTimeoutsRef.current.add(t);
        },
        'Continue (Dev Mock)'
      );
    } else {
      // Production: Web Razorpay not supported — inform user
      platformAlertSimple(
        'Payment Not Available',
        'Online payment is not available on web. Please use the mobile app to complete your purchase.'
      );
      setIsProcessing(false);
    }
  };

  // ==================== SHARED HANDLERS ====================

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      const isVerified = await verifyRazorpayPaymentOnBackend(paymentData);

      if (isVerified) {
        if (!isMounted()) return;
        setIsProcessing(false);
        if (!isMounted()) return;
        const t = setTimeout(() => {
          navTimeoutsRef.current.delete(t);
          if (isTravelPayment) {
            router.replace(`/travel-booking-confirmation?bookingId=${bookingId}` as any);
          } else {
            router.replace(`/order-confirmation?orderId=${orderId}` as any);
          }
        }, 500);
        navTimeoutsRef.current.add(t);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error: any) {
      if (!isMounted()) return;
      setCurrentStep('methods');
      if (!isMounted()) return;
      setIsProcessing(false);
      platformAlertConfirm(
        'Verification Failed',
        'Payment was received but verification failed. Please contact support.',
        () => router.push('/support' as any),
        'Contact Support'
      );
    }
  };

  const handlePaymentFailure = (error: any) => {
    setCurrentStep('methods');
    setIsProcessing(false);

    const errorMessage = error.description || error.message || 'Payment failed. Please try again.';

    platformAlertConfirm(
      'Payment Failed',
      errorMessage,
      () => setCurrentStep('methods'),
      'Try Again'
    );
  };

  // ==================== UI HELPERS ====================

  const displayCurrencySymbol = getPaymentCurrencySymbol(currency) || currencySymbol;
  const isStripe = paymentGateway === 'stripe';
  const gatewayLabel = isStripe ? 'Stripe' : 'Razorpay';

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'card': return 'card-outline';
      case 'upi': return 'phone-portrait-outline';
      case 'wallet': return 'wallet-outline';
      case 'netbanking': return 'business-outline';
      default: return 'card-outline';
    }
  };

  const getMethodColor = (type: string) => {
    switch (type) {
      case 'card': return Colors.info;
      case 'upi': return Colors.brand.purple;
      case 'wallet': return colors.brand.pink;
      case 'netbanking': return Colors.success;
      default: return Colors.text.tertiary;
    }
  };

  // ==================== RENDER ====================

  const renderGatewayToggle = () => {
    // Only show toggle if currency is INR (both gateways available)
    if (STRIPE_ONLY_CURRENCIES.includes(currency)) return null;

    return (
      <View style={styles.gatewayToggle}>
        <Pressable
          style={[styles.gatewayOption, paymentGateway === 'stripe' && styles.gatewayOptionActive]}
          onPress={() => setPaymentGateway('stripe')}
        >
          <Ionicons name="card" size={16} color={paymentGateway === 'stripe' ? Colors.text.inverse : Colors.text.tertiary} />
          <Text style={[styles.gatewayOptionText, paymentGateway === 'stripe' && styles.gatewayOptionTextActive]}>Stripe</Text>
        </Pressable>
        <Pressable
          style={[styles.gatewayOption, paymentGateway === 'razorpay' && styles.gatewayOptionActive]}
          onPress={() => setPaymentGateway('razorpay')}
        >
          <Ionicons name="shield-checkmark" size={16} color={paymentGateway === 'razorpay' ? Colors.text.inverse : Colors.text.tertiary} />
          <Text style={[styles.gatewayOptionText, paymentGateway === 'razorpay' && styles.gatewayOptionTextActive]}>Razorpay</Text>
        </Pressable>
      </View>
    );
  };

  const renderPaymentMethods = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        stepContainerStyle,
      ]}
    >
      <ThemedText style={styles.stepTitle}>Choose Payment Method</ThemedText>
      <ThemedText style={styles.stepSubtitle}>
        Secure payment powered by {gatewayLabel}
      </ThemedText>

      {renderGatewayToggle()}

      <View style={styles.securityBadge}>
        <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
        <ThemedText style={styles.securityBadgeText}>
          {isStripe ? 'Secured by Stripe - PCI Level 1' : 'Secured by Razorpay - PCI DSS Compliant'}
        </ThemedText>
      </View>

      {currency !== 'INR' && (
        <View style={styles.currencyBadge}>
          <Ionicons name="globe-outline" size={14} color={Colors.info} />
          <ThemedText style={styles.currencyBadgeText}>
            Paying in {currency} via Stripe
          </ThemedText>
        </View>
      )}

      {isStripe ? (
        // Stripe: Single "Pay with Stripe" button
        <Pressable
          style={styles.stripePayButton}
          onPress={() => handleStripePayment()}
          disabled={isProcessing}
         
        >
          <LinearGradient
            colors={['#635BFF', '#7B73FF']}
            style={styles.stripePayButtonGradient}
          >
            <Ionicons name="card" size={22} color={Colors.text.inverse} />
            <Text style={styles.stripePayButtonText}>
              Pay {displayCurrencySymbol}{amount.toLocaleString()} with Stripe
            </Text>
          </LinearGradient>
        </Pressable>
      ) : (
        // Razorpay: Show method cards
        <View style={styles.methodsGrid}>
          {paymentMethods.map((method) => (
            <Pressable
              key={method.id}
              style={[styles.methodCard, { borderColor: getMethodColor(method.type) }]}
              onPress={() => handleMethodSelect(method)}
              disabled={!method.isAvailable || isProcessing}
             
            >
              <View style={[styles.methodIconContainer, { backgroundColor: getMethodColor(method.type) }]}>
                <Ionicons name={getMethodIcon(method.type)} size={24} color={Colors.text.inverse} />
              </View>
              <View style={styles.methodInfo}>
                <ThemedText style={styles.methodName}>{method.name}</ThemedText>
                <ThemedText style={styles.methodGateway}>Razorpay Gateway</ThemedText>
                <View style={styles.methodDetails}>
                  <ThemedText style={styles.methodFee}>
                    {method.processingFee && method.processingFee > 0 ? `Fee: ${method.processingFee}%` : 'No fee'}
                  </ThemedText>
                  <ThemedText style={styles.methodTime}>{method.processingTime}</ThemedText>
                </View>
              </View>
              <View style={styles.methodArrow}>
                <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.supportedMethods}>
        <ThemedText style={styles.supportedTitle}>Supported Payment Options:</ThemedText>
        <ThemedText style={styles.supportedText}>
          {isStripe
            ? 'Cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and more'
            : 'UPI, Cards (Visa, Mastercard, Amex, RuPay), Net Banking, Wallets (Paytm, PhonePe, etc.)'
          }
        </ThemedText>
      </View>
    </Animated.View>
  );

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <View style={styles.processingIcon}>
        <ActivityIndicator size="large" color={Colors.brand.purple} />
      </View>

      <ThemedText style={styles.processingTitle}>Processing Payment</ThemedText>
      <ThemedText style={styles.processingSubtitle}>
        {isStripe
          ? 'Redirecting to Stripe secure checkout...'
          : 'Please wait while we securely process your payment...'}
      </ThemedText>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              progressFillStyle,
            ]}
          />
        </View>
        <ThemedText style={styles.progressText}>Processing...</ThemedText>
      </View>

      <View style={styles.securityInfo}>
        <Ionicons name="lock-closed" size={16} color={Colors.success} />
        <ThemedText style={styles.securityText}>256-bit SSL Encrypted</ThemedText>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />
        <LinearGradient colors={[Colors.brand.purple, Colors.brand.purpleLight]} style={styles.headerBg}>
          <View style={styles.headerContainer}>
            <Pressable style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Payment</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <FormPageSkeleton />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />
      <LinearGradient colors={[Colors.brand.purple, Colors.brand.purpleLight]} style={styles.headerBg}>
        <View style={styles.headerContainer}>
          <Pressable style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Payment</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.amountSection}>
          <ThemedText style={styles.amountLabel}>Amount to Pay</ThemedText>
          <ThemedText style={styles.amountValue}>
            {displayCurrencySymbol}{amount.toLocaleString()}
          </ThemedText>
          {currency !== 'INR' && (
            <ThemedText style={styles.currencyLabel}>{currency}</ThemedText>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        alwaysBounceVertical={false}
      >
        {currentStep === 'methods' && renderPaymentMethods()}
        {currentStep === 'processing' && renderProcessing()}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary},
  headerBg: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    ...Shadows.strong},
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg},
  backButton: {
    padding: 5},
  headerTitle: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: 'bold'},
  placeholder: {
    width: 34},
  amountSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg},
  amountLabel: {
    color: '#E0E7FF',
    ...Typography.body,
    marginBottom: 5},
  amountValue: {
    color: Colors.text.inverse,
    fontSize: 32,
    fontWeight: '900'},
  currencyLabel: {
    color: '#E0E7FF',
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
    fontWeight: '600'},
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg},
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1},
  stepContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    marginTop: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.strong,
    borderWidth: 1,
    borderColor: Colors.border.default},
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.sm},
  stepSubtitle: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    marginBottom: Spacing.base},
  gatewayToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.base},
  gatewayOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6},
  gatewayOptionActive: {
    backgroundColor: Colors.brand.purple},
  gatewayOptionText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary},
  gatewayOptionTextActive: {
    color: Colors.text.inverse},
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successScale[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    gap: 6},
  securityBadgeText: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: '600'},
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.infoScale[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    gap: 6},
  currencyBadgeText: {
    ...Typography.bodySmall,
    color: Colors.info,
    fontWeight: '600'},
  stripePayButton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#635BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6},
  stripePayButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    gap: 10},
  stripePayButtonText: {
    color: Colors.text.inverse,
    fontSize: 17,
    fontWeight: '700'},
  methodsGrid: {
    gap: Spacing.base,
    marginTop: Spacing.sm},
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border.default,
    ...Shadows.medium,
    marginHorizontal: Spacing.xs},
  methodIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
    ...Shadows.medium},
  methodInfo: {
    flex: 1},
  methodName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs},
  methodGateway: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: 6},
  methodDetails: {
    flexDirection: 'row',
    gap: Spacing.base,
    alignItems: 'center'},
  methodFee: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: '600',
    backgroundColor: Colors.successScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6},
  methodTime: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500'},
  methodArrow: {
    padding: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    marginLeft: Spacing.sm},
  supportedMethods: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default},
  supportedTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.sm},
  supportedText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    lineHeight: 20},
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 60},
  processingIcon: {
    marginBottom: Spacing.xl},
  processingTitle: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.sm},
  processingSubtitle: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: Spacing.lg},
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.xl},
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border.default,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.md},
  progressFill: {
    height: '100%',
    backgroundColor: Colors.brand.purpleLight,
    borderRadius: 4},
  progressText: {
    ...Typography.body,
    color: Colors.text.tertiary},
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successScale[50],
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm},
  securityText: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: '600'},
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'},
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary}});

export default withErrorBoundary(PaymentPage, 'PaymentRazorpay');
