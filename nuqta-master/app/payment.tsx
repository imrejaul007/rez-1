import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Modern Payment Page
// Production-ready payment interface with Stripe integration

import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Elements } from '@stripe/react-stripe-js';
import { getStripePromise } from '@/utils/lazyImports';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { StripeCardForm } from '@/components/payment';
import paymentService, { PaymentMethod, PaymentResponse } from '@/services/paymentService';
import PaymentValidator from '@/services/paymentValidation';
import financialServicesApi, { FinancialService } from '@/services/financialServicesApi';
import { useGetCurrencySymbol, useGetCurrency, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { FormPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';

// Initialize Stripe lazily — SDK is only loaded when this promise is first awaited
const stripePromise = getStripePromise(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function PaymentPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getCurrency = useGetCurrency();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const regionCurrency = getCurrencySymbol();
  const params = useLocalSearchParams();
  const amount = Number(params.amount) || 5000;
  const currency = (params.currency as string) || 'INR';
  const fiatCurrency = (params.fiatCurrency as string) || getCurrency();

  // Use NC display for wallet recharges, region currency for financial services
  const isWalletRecharge = currency === BRAND.CURRENCY_CODE;
  const displayCurrency = isWalletRecharge ? BRAND.CURRENCY_CODE + ' ' : regionCurrency;

  // Financial service specific params
  const paymentType = params.type as string;
  const isFinancialService = paymentType === 'financial-service';
  const serviceId = params.serviceId as string;
  const serviceType = params.serviceType as string;

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'methods' | 'details' | 'processing' | 'failed'>('methods');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Financial service state
  const [financialService, setFinancialService] = useState<FinancialService | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(false);

  // Stripe state
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [showStripeCardModal, setShowStripeCardModal] = useState(false);

  // Recharge discount state
  const [discountInfo, setDiscountInfo] = useState<{ discount: number; payable: number; percentage: number } | null>(null);

  // Form states (UPI, wallet, netbanking)
  const [upiId, setUpiId] = useState('');
  const [walletType, setWalletType] = useState('paytm');
  const [bankCode, setBankCode] = useState('');
  const [processingStatus, setProcessingStatus] = useState('Initiating payment...');
  const lastPaymentRef = useRef<PaymentResponse | null>(null);
  const pollingAbortedRef = useRef(false);
  const isMounted = useIsMounted();

  useEffect(() => {
    return () => { pollingAbortedRef.current = true; };
  }, []);

  // Animation values
  const fadeAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);
  const progressAnim = useSharedValue(0);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadPaymentMethods();
    animateEntrance();

    if (isFinancialService && serviceId) {
      loadFinancialService();
    }

    // Fetch recharge discount for wallet topups
    if (isWalletRecharge && amount > 0) {
      paymentService.previewCashback(amount).then(res => {
        if (res.success && res.data && (res.data.discountAmount || res.data.cashback)) {
          setDiscountInfo({
            discount: res.data.discountAmount || res.data.cashback || 0,
            payable: res.data.payableAmount || (amount - (res.data.discountAmount || res.data.cashback || 0)),
            percentage: res.data.discountPercentage || res.data.cashbackPercentage || 0
          });
        }
      }).catch(() => {});
    }
  }, [isFinancialService, serviceId, isAuthenticated, authLoading]);

  const loadFinancialService = async () => {
    if (!serviceId) return;

    setIsLoadingService(true);
    try {
      const response = await financialServicesApi.getById(serviceId);
      if (response.success && response.data) {
        setFinancialService(response.data);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoadingService(false);
    }
  };

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
    progressAnim.value = 0;
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
      const response = await paymentService.getPaymentMethods(currency, fiatCurrency);
      if (response.success && response.data) {
        setPaymentMethods(response.data);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to load payment methods. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleBackPress = useCallback(() => {
    if (showStripeCardModal) {
      setShowStripeCardModal(false);
      setStripeClientSecret(null);
      return;
    }
    if (currentStep === 'details') {
      setCurrentStep('methods');
      setSelectedMethod(null);
    } else {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    }
  }, [currentStep, router, showStripeCardModal]);

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setCurrentStep('details');
  };

  const getSuccessMessage = () => {
    if (isFinancialService) {
      return `Your ${serviceType === 'bills' ? 'bill payment' :
               serviceType === 'recharge' ? 'recharge' :
               serviceType === 'ott' ? 'subscription' :
               serviceType === 'gold' ? 'gold purchase' :
               serviceType === 'insurance' ? 'insurance' : 'payment'} of ${displayCurrency}${amount.toLocaleString()} has been processed successfully.`;
    }
    if (isWalletRecharge) {
      return `${amount.toLocaleString()} ${BRAND.CURRENCY_CODE} has been added to your wallet successfully.`;
    }
    return `Your payment of ${displayCurrency}${amount.toLocaleString()} has been processed successfully.`;
  };

  const navigateAfterSuccess = () => {
    if (isFinancialService) {
      router.replace('/financial' as any);
    } else {
      router.replace('/wallet-screen');
    }
  };

  /**
   * Create PaymentIntent on backend and get clientSecret for Stripe
   */
  const createPaymentIntent = async (extraMetadata?: Record<string, any>): Promise<PaymentResponse | null> => {
    if (!selectedMethod) return null;

    const purpose = isFinancialService ? 'financial_service' as const : isWalletRecharge ? 'wallet_topup' as const : 'other' as const;

    const response = await paymentService.processPayment(
      amount,
      currency,
      selectedMethod,
      purpose,
      { ...(extraMetadata || {}), fiatCurrency }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Payment initiation failed');
    }

    return response.data;
  };

  /**
   * Handle Stripe card payment — opens Stripe Elements modal
   */
  const handleStripeCardPayment = async () => {
    if (!selectedMethod || isProcessing) return;

    setIsProcessing(true);
    try {
      const paymentData = await createPaymentIntent();
      if (!paymentData) throw new Error('Failed to create payment');

      lastPaymentRef.current = paymentData;
      const clientSecret = paymentData.gatewayResponse?.clientSecret;

      if (!clientSecret) {
        throw new Error('No client secret returned from payment gateway');
      }

      if (!isMounted()) return;
      setStripeClientSecret(clientSecret);
      if (!isMounted()) return;
      setShowStripeCardModal(true);
    } catch (error) {
      platformAlertSimple('Payment Failed', error instanceof Error ? error.message : 'Payment initiation failed');
    } finally {
      if (!isMounted()) return;
      setIsProcessing(false);
    }
  };

  /**
   * Called when Stripe card form confirms payment successfully.
   * Tells backend to verify and credit wallet.
   */
  const handleStripeCardSuccess = async (paymentIntentId: string) => {
    setShowStripeCardModal(false);
    setStripeClientSecret(null);

    // Tell backend to verify with Stripe and credit the wallet
    try {
      await paymentService.confirmPayment(paymentIntentId);
    } catch (e) {
      // Even if confirm call fails, payment succeeded on Stripe — backend webhook will catch it
    }

    platformAlertSimple('Payment Successful!', getSuccessMessage());
    navigateAfterSuccess();
  };

  const handleStripeCardError = (error: string) => {
    setShowStripeCardModal(false);
    setStripeClientSecret(null);
    setPaymentError(error);
    setCurrentStep('failed');
  };

  const handleStripeCardCancel = () => {
    setShowStripeCardModal(false);
    setStripeClientSecret(null);
  };

  /**
   * Non-card payment handler — creates intent, then polls for status
   * Used for UPI, wallet, netbanking (redirects/polling based)
   */
  const handleNonCardPayment = async (extraMetadata?: Record<string, any>) => {
    if (!selectedMethod || isProcessing) return;

    setCurrentStep('processing');
    setIsProcessing(true);
    setProcessingStatus('Initiating payment...');

    try {
      const paymentData = await createPaymentIntent(extraMetadata);
      if (!paymentData) throw new Error('Failed to create payment');

      lastPaymentRef.current = paymentData;
      if (!isMounted()) return;
      setProcessingStatus('Waiting for payment confirmation...');

      // Poll for real status from backend (aborts if component unmounts)
      const statusResponse = await paymentService.pollPaymentStatus(
        paymentData.paymentId,
        paymentData.gateway || selectedMethod.gateway,
        {
          maxAttempts: 40,
          intervalMs: 3000,
          onStatusChange: (status) => {
            if (pollingAbortedRef.current) return;
            if (status === 'processing') setProcessingStatus('Processing your payment...');
            if (status === 'completed') setProcessingStatus('Payment confirmed!');
          },
          shouldAbort: () => pollingAbortedRef.current}
      );

      // If component unmounted during polling, don't update state
      if (pollingAbortedRef.current) return;

      if (statusResponse.success && statusResponse.data?.status === 'completed') {
        platformAlertSimple('Payment Successful!', getSuccessMessage());
        navigateAfterSuccess();
      } else if (statusResponse.data?.status === 'failed') {
        throw new Error(statusResponse.data?.failureReason || 'Payment was declined');
      } else {
        platformAlertSimple(
          'Payment Pending',
          'Your payment is still being processed. Please check your wallet for updates.'
        );
        navigateAfterSuccess();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      if (!isMounted()) return;
      setPaymentError(errorMsg);
      if (!isMounted()) return;
      setCurrentStep('failed');
    } finally {
      if (!isMounted()) return;
      setIsProcessing(false);
    }
  };

  const handleUPIPayment = async () => {
    const validation = PaymentValidator.validateUPIId(upiId);
    if (!validation.isValid) {
      platformAlertSimple('Validation Error', validation.errors.join('\n'));
      return;
    }
    await handleNonCardPayment({ upiId, app: 'paytm' });
  };

  const handleWalletPayment = async () => {
    await handleNonCardPayment({ walletType });
  };

  const getMethodIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'card': return 'card-outline';
      case 'upi': return 'phone-portrait-outline';
      case 'wallet': return 'wallet-outline';
      case 'netbanking': return 'business-outline';
      case 'paypal': return 'globe-outline';
      default: return 'card-outline';
    }
  };

  const getMethodColor = (type: string) => {
    switch (type) {
      case 'upi': return Colors.nileBlue;
      case 'card': return Colors.info;
      case 'wallet': return Colors.gold;
      case 'netbanking': return Colors.success;
      case 'paypal': return '#0070BA';
      default: return Colors.text.tertiary;
    }
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
        Select your preferred payment method to continue
      </ThemedText>

      <View style={styles.methodsGrid}>
        {paymentMethods.map((method) => {
          const methodColor = getMethodColor(method.type);
          const hasFee = method.processingFee && method.processingFee > 0;

          return (
            <Pressable
              key={method.id}
              style={styles.methodCard}
              onPress={() => handleMethodSelect(method)}
              disabled={!method.isAvailable}
             
              accessibilityLabel={`${method.name}. ${hasFee ? `Fee: ${method.processingFee} percent` : 'No fee'}. ${method.processingTime}`}
              accessibilityRole="button"
            >
              <View style={[styles.methodIconContainer, { backgroundColor: methodColor }]}>
                <Ionicons name={getMethodIcon(method.type)} size={22} color={Colors.text.inverse} />
              </View>

              <View style={styles.methodInfo}>
                <ThemedText style={styles.methodName}>{method.name}</ThemedText>
                <View style={styles.methodDetails}>
                  <View style={[styles.feeBadge, hasFee ? styles.feeBadgeWarning : styles.feeBadgeFree]}>
                    <ThemedText style={[styles.feeText, hasFee ? styles.feeTextWarning : styles.feeTextFree]}>
                      {hasFee ? `Fee: ${method.processingFee}%` : 'No fee'}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.methodTime}>{method.processingTime}</ThemedText>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
            </Pressable>
          );
        })}
      </View>

      {/* Security Footer */}
      <View style={styles.securityRow}>
        <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
        <ThemedText style={styles.securityText}>
          256-bit SSL encrypted | Secure payment
        </ThemedText>
      </View>
    </Animated.View>
  );

  const renderPaymentDetails = () => {
    if (!selectedMethod) return null;

    return (
      <Animated.View
        style={[
          styles.stepContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]},
        ]}
      >
        <View style={styles.methodHeader}>
          <View style={[styles.methodIconContainer, { backgroundColor: getMethodColor(selectedMethod.type) }]}>
            <Ionicons name={getMethodIcon(selectedMethod.type)} size={22} color={Colors.text.inverse} />
          </View>
          <View style={styles.methodHeaderInfo}>
            <ThemedText style={styles.methodHeaderName}>{selectedMethod.name}</ThemedText>
            {selectedMethod.description && (
              <ThemedText style={styles.methodHeaderGateway}>{selectedMethod.description}</ThemedText>
            )}
          </View>
        </View>

        {/* UPI Payment */}
        {selectedMethod.type === 'upi' && (
          <View style={styles.formContainer}>
            <ThemedText style={styles.formLabel}>Enter UPI ID</ThemedText>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="user@paytm"
                value={upiId}
                onChangeText={setUpiId}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={Colors.text.tertiary}
                accessibilityLabel="UPI ID input"
              />
            </View>
            <Pressable
              style={[styles.payButton, !upiId && styles.disabledButton]}
              onPress={handleUPIPayment}
              disabled={!upiId || isProcessing}
            >
              <LinearGradient
                colors={[Colors.nileBlue, '#2A5577'] as const}
                style={styles.payButtonGradient}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.text.inverse} />
                <ThemedText style={styles.payButtonText}>
                  Pay {displayCurrency}{amount.toLocaleString()}
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Card Payment — uses Stripe Elements */}
        {selectedMethod.type === 'card' && (
          <View style={styles.formContainer}>
            <View style={styles.stripeInfo}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
              <ThemedText style={styles.stripeInfoText}>
                Card details are securely processed by Stripe. Your card info never touches our servers.
              </ThemedText>
            </View>

            <Pressable
              style={[styles.payButton, isProcessing && styles.disabledButton]}
              onPress={handleStripeCardPayment}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={[Colors.nileBlue, '#2A5577'] as const}
                style={styles.payButtonGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={Colors.text.inverse} />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={18} color={Colors.text.inverse} />
                    <ThemedText style={styles.payButtonText}>
                      Pay {displayCurrency}{amount.toLocaleString()} with Card
                    </ThemedText>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Digital Wallet */}
        {selectedMethod.type === 'wallet' && (
          <View style={styles.formContainer}>
            <ThemedText style={styles.formLabel}>Select Wallet</ThemedText>
            <View style={styles.walletGrid}>
              {['paytm', 'phonepe', 'gpay', 'amazonpay'].map((wallet) => (
                <Pressable
                  key={wallet}
                  style={[
                    styles.walletOption,
                    walletType === wallet && styles.selectedWalletOption,
                  ]}
                  onPress={() => setWalletType(wallet)}
                  accessibilityLabel={`${wallet.toUpperCase()}${walletType === wallet ? ', selected' : ''}`}
                  accessibilityRole="radio"
                >
                  <View style={[styles.walletIcon, { backgroundColor: getMethodColor('wallet') }]}>
                    <Ionicons name="wallet-outline" size={18} color={Colors.text.inverse} />
                  </View>
                  <ThemedText style={styles.walletText}>{wallet.toUpperCase()}</ThemedText>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={styles.payButton}
              onPress={handleWalletPayment}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={[Colors.nileBlue, '#2A5577'] as const}
                style={styles.payButtonGradient}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.text.inverse} />
                <ThemedText style={styles.payButtonText}>
                  Pay with {walletType.toUpperCase()}
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Net Banking */}
        {selectedMethod.type === 'netbanking' && (
          <View style={styles.formContainer}>
            <ThemedText style={styles.formLabel}>Select Bank</ThemedText>
            <View style={styles.walletGrid}>
              {[
                { code: 'sbi', name: 'SBI' },
                { code: 'hdfc', name: 'HDFC' },
                { code: 'icici', name: 'ICICI' },
                { code: 'axis', name: 'Axis' },
              ].map((bank) => (
                <Pressable
                  key={bank.code}
                  style={[
                    styles.walletOption,
                    bankCode === bank.code && styles.selectedWalletOption,
                  ]}
                  onPress={() => setBankCode(bank.code)}
                  accessibilityLabel={`${bank.name}${bankCode === bank.code ? ', selected' : ''}`}
                  accessibilityRole="radio"
                >
                  <View style={[styles.walletIcon, { backgroundColor: getMethodColor('netbanking') }]}>
                    <Ionicons name="business-outline" size={18} color={Colors.text.inverse} />
                  </View>
                  <ThemedText style={styles.walletText}>{bank.name}</ThemedText>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.payButton, !bankCode && styles.disabledButton]}
              onPress={() => handleNonCardPayment({ bankCode })}
              disabled={!bankCode || isProcessing}
            >
              <LinearGradient
                colors={[Colors.nileBlue, '#2A5577'] as const}
                style={styles.payButtonGradient}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.text.inverse} />
                <ThemedText style={styles.payButtonText}>
                  Pay {displayCurrency}{amount.toLocaleString()}
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <View style={styles.processingIcon}>
        <ActivityIndicator size="large" color={Colors.nileBlue} />
      </View>

      <ThemedText style={styles.processingTitle}>Processing Payment</ThemedText>
      <ThemedText style={styles.processingSubtitle}>
        Please wait while we process your payment...
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
        <ThemedText style={styles.progressText}>{processingStatus}</ThemedText>
      </View>
    </View>
  );

  const handleRetryPayment = () => {
    setPaymentError(null);
    setCurrentStep('details');
  };

  const renderPaymentFailed = () => (
    <View style={styles.failedContainer}>
      <View style={styles.failedIconCircle}>
        <Ionicons name="close-circle" size={56} color={Colors.error} />
      </View>

      <ThemedText style={styles.failedTitle}>Payment Failed</ThemedText>

      <View style={styles.failedErrorBox}>
        <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
        <ThemedText style={styles.failedErrorText}>
          {paymentError || 'Something went wrong. Please try again.'}
        </ThemedText>
      </View>

      <Pressable
        style={styles.retryButtonWrapper}
        onPress={handleRetryPayment}
       
      >
        <LinearGradient
          colors={[Colors.nileBlue, '#2A5577'] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.retryButton}
        >
          <Ionicons name="refresh" size={20} color={Colors.text.inverse} />
          <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
        </LinearGradient>
      </Pressable>

      <Pressable
        style={styles.changMethodButton}
        onPress={() => {
          setPaymentError(null);
          setSelectedMethod(null);
          setCurrentStep('methods');
        }}
      >
        <ThemedText style={styles.changeMethodText}>Change Payment Method</ThemedText>
      </Pressable>
    </View>
  );

  // Page header title based on context
  const headerLabel = isFinancialService
    ? 'Payment'
    : isWalletRecharge
      ? 'Add Money'
      : 'Payment';

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
        <LinearGradient colors={[Colors.nileBlue, '#2A5577'] as const} style={styles.headerBg}>
          <View style={styles.headerContainer}>
            <Pressable style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>{headerLabel}</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <FormPageSkeleton />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
      <LinearGradient colors={[Colors.nileBlue, '#2A5577'] as const} style={styles.headerBg}>
        <View style={styles.headerContainer}>
          <Pressable
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityLabel={currentStep === 'details' ? 'Back to payment methods' : 'Back'}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>{headerLabel}</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.amountSection}>
          {isFinancialService && financialService && (
            <View style={styles.serviceInfo}>
              <ThemedText style={styles.serviceName}>{financialService.name}</ThemedText>
              <ThemedText style={styles.serviceType}>
                {serviceType === 'bills' ? 'Bill Payment' :
                 serviceType === 'recharge' ? 'Mobile Recharge' :
                 serviceType === 'ott' ? 'OTT Subscription' :
                 serviceType === 'gold' ? 'Digital Gold' :
                 serviceType === 'insurance' ? 'Insurance' :
                 'Financial Service'}
              </ThemedText>
            </View>
          )}
          {isWalletRecharge && (
            <ThemedText style={styles.amountContextLabel}>Wallet Recharge</ThemedText>
          )}
          <ThemedText style={styles.amountLabel}>
            {isWalletRecharge ? 'Recharge Amount' : 'Amount to Pay'}
          </ThemedText>
          <ThemedText style={styles.amountValue}>
            {displayCurrency}{amount.toLocaleString()}
          </ThemedText>
          {isWalletRecharge && discountInfo && discountInfo.discount > 0 && (
            <View style={styles.discountBadge}>
              <Ionicons name="pricetag-outline" size={14} color={Colors.success} />
              <ThemedText style={styles.discountText}>
                {discountInfo.percentage}% off — You pay {regionCurrency}{discountInfo.payable.toLocaleString()}
              </ThemedText>
            </View>
          )}
          {isFinancialService && financialService?.cashback && (
            <ThemedText style={styles.cashbackInfo}>
              Get {financialService.cashback.percentage}% cashback
            </ThemedText>
          )}
          {isWalletRecharge && (
            <View style={styles.walletRechargeNote}>
              <Ionicons name="wallet-outline" size={14} color="rgba(255,255,255,0.7)" />
              <ThemedText style={styles.walletRechargeText}>
                {amount.toLocaleString()} {BRAND.CURRENCY_CODE} will be added to your wallet
              </ThemedText>
            </View>
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
        {currentStep === 'details' && renderPaymentDetails()}
        {currentStep === 'processing' && renderProcessing()}
        {currentStep === 'failed' && renderPaymentFailed()}
      </ScrollView>

      {/* Stripe Card Payment Modal */}
      <Modal
        visible={showStripeCardModal}
        transparent
        animationType="slide"
        onRequestClose={handleStripeCardCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Card Payment</ThemedText>
              <Pressable onPress={handleStripeCardCancel} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.text.tertiary} />
              </Pressable>
            </View>
            {stripeClientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: stripeClientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: Colors.nileBlue,
                      colorBackground: Colors.background.primary,
                      colorText: Colors.text.primary,
                      colorDanger: Colors.error,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      borderRadius: '12px'}}}}
              >
                <StripeCardForm
                  clientSecret={stripeClientSecret}
                  amount={discountInfo?.payable ?? amount}
                  onSuccess={handleStripeCardSuccess}
                  onError={handleStripeCardError}
                  onCancel={handleStripeCardCancel}
                />
              </Elements>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary},
  headerBg: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    shadowColor: Colors.nileBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8},
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base},
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'},
  headerTitle: {
    color: Colors.text.inverse,
    ...Typography.h4,
    fontWeight: '700'},
  placeholder: {
    width: 36},
  amountSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg},
  amountContextLabel: {
    color: 'rgba(255,255,255,0.7)',
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs},
  amountLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginBottom: Spacing.xs},
  amountValue: {
    color: Colors.text.inverse,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5},
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md},
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1},
  stepContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.base,
    ...Shadows.medium,
    borderWidth: 1,
    borderColor: Colors.border.light},
  stepTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs},
  stepSubtitle: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: Spacing.base},
  methodsGrid: {
    gap: 10},
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    ...Shadows.subtle},
  methodIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14},
  methodInfo: {
    flex: 1},
  methodName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs},
  methodDetails: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'},
  feeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6},
  feeBadgeFree: {
    backgroundColor: Colors.successScale[50]},
  feeBadgeWarning: {
    backgroundColor: Colors.warningScale[50]},
  feeText: {
    fontSize: 11,
    fontWeight: '600'},
  feeTextFree: {
    color: Colors.success},
  feeTextWarning: {
    color: colors.brand.amberDeep},
  methodTime: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500'},
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.base,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light},
  securityText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    fontWeight: '500'},
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light},
  methodHeaderInfo: {
    marginLeft: 14},
  methodHeaderName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2},
  methodHeaderGateway: {
    fontSize: 13,
    color: Colors.text.tertiary},
  formContainer: {
    gap: 14},
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 6},
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    paddingHorizontal: 14},
  inputIcon: {
    marginRight: 10},
  textInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text.primary},
  stripeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.successScale[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#A7F3D0'},
  stripeInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18},
  walletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10},
  walletOption: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border.default},
  selectedWalletOption: {
    borderColor: Colors.nileBlue,
    backgroundColor: '#F0F4F8'},
  walletIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6},
  walletText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.primary},
  payButton: {
    marginTop: 6},
  payButtonGradient: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center'},
  payButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '700'},
  disabledButton: {
    opacity: 0.5},
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 40},
  processingIcon: {
    marginBottom: Spacing.lg},
  processingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm},
  processingSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 30},
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl},
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.border.default,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.md},
  progressFill: {
    height: '100%',
    backgroundColor: Colors.nileBlue,
    borderRadius: 3},
  progressText: {
    fontSize: 13,
    color: Colors.text.tertiary},
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'},
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.text.tertiary},
  serviceInfo: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)'},
  serviceName: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4},
  serviceType: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5},
  discountBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm},
  discountText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '600'},
  cashbackInfo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: Spacing.sm,
    fontWeight: '500'},
  walletRechargeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm},
  walletRechargeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500'},
  // Stripe Card Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'},
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%'},
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light},
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary},
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center'},
  // Payment Failed
  failedContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl']},
  failedIconCircle: {
    marginBottom: Spacing.base},
  failedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.base},
  failedErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorScale[50],
    borderRadius: BorderRadius.md,
    padding: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.errorScale[200],
    width: '100%'},
  failedErrorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.error,
    lineHeight: 18},
  retryButtonWrapper: {
    width: '100%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: 14},
  retryButton: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center'},
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700'},
  changMethodButton: {
    paddingVertical: 10},
  changeMethodText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    fontWeight: '600'}});

export default withErrorBoundary(PaymentPage, 'Payment');
