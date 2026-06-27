// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Pay In Store - Premium Payment Screen
 *
 * Redesigned payment screen with:
 * - Auto-optimized coin application with toggles
 * - Store membership display
 * - Multiple coin types (ReZ, Promo, Branded/Store Coins)
 * - Expiring coins badges
 * - Bank-specific offers on payment methods
 * - Wallet integrations (Paytm, Amazon Pay, Mobikwik)
 * - "You saved today" summary
 * - Rewards preview
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Elements } from '@stripe/react-stripe-js';
import { getStripePromise } from '@/utils/lazyImports';
import { PaymentScreenParams, StorePaymentInitResponse } from '@/types/storePayment.types';
import apiClient from '@/services/apiClient';
import { useAuthUser, useGetCurrencySymbol } from '@/stores/selectors';
import { useGamification } from '@/contexts/GamificationContext';
import usePaymentFlow from '@/hooks/usePaymentFlow';
import { showToast } from '@/components/common/ToastManager';

// Import new components
import {
  SecurePaymentHeader,
  StoreInfoCard,
  OrderSummaryCard,
  ApplyCoinsSection,
  AmountToPayCard,
  EnhancedPaymentMethodCard,
  WalletPaymentOption,
  SavingsSummaryCard,
  PayButtonWithRewards,
  StripeCardForm,
} from '@/components/payment';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Initialize Stripe lazily — SDK is only loaded when this promise is first awaited
const stripePromise = getStripePromise(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function PaymentScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams<PaymentScreenParams>();
  const { storeId, storeName, storeLogo, amount, selectedOffers: selectedOffersParam } = params;
  const user = useAuthUser();
  const { actions: gamificationActions } = useGamification();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const billAmount = parseFloat(amount || '0');
  let selectedOfferIds: string[] = [];
  if (selectedOffersParam) {
    try { selectedOfferIds = JSON.parse(selectedOffersParam); } catch { selectedOfferIds = []; }
  }

  // Use the payment flow hook
  const paymentFlow = usePaymentFlow({
    storeId: storeId || '',
    storeName: storeName || '',
    amount: billAmount,
    selectedOfferIds,
  });

  // Idempotency key — unique per mount, prevents duplicate payments on double-tap or network retry
  const idempotencyKeyRef = useRef(`PAY-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // Local state for modals
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [currentPaymentData, setCurrentPaymentData] = useState<StorePaymentInitResponse | null>(null);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [upiProcessing, setUpiProcessing] = useState(false);
  const [upiError, setUpiError] = useState<string | null>(null);

  // Handle payment initiation
  const handlePayment = async () => {
    paymentFlow.clearError();
    
    const paymentData = await paymentFlow.initiatePayment(idempotencyKeyRef.current);

    if (!paymentData) return;

    const amountToPay = paymentFlow.amountToPay;

    // If payment amount is 0 (full coin payment), auto-confirm
    if (amountToPay === 0) {
      try {
        const confirmResponse = await apiClient.post('/store-payment/confirm', {
          paymentId: paymentData.paymentId,
          idempotencyKey: idempotencyKeyRef.current,
        });

        if (confirmResponse.success && confirmResponse.data) {
          navigateToSuccess(confirmResponse.data);
        } else {
          showToast({
            message: confirmResponse.error || 'Payment failed. Please try again.',
            type: 'error',
            duration: 4000,
          });
        }
      } catch (err: any) {
        showToast({
          message: err.message || 'Payment failed. Please try again.',
          type: 'error',
          duration: 4000,
        });
      }
    } else {
      // Navigate to appropriate payment flow based on method
      handlePaymentRedirect(paymentData);
    }
  };

  const handlePaymentRedirect = (paymentData: StorePaymentInitResponse) => {
    const selectedType = paymentFlow.selectedPaymentMethod?.type;
    const isCardMethod = selectedType?.includes('card');

    if (isCardMethod) {
      if (paymentData.clientSecret) {
        setStripeClientSecret(paymentData.clientSecret);
        setCurrentPaymentData(paymentData);
        setShowStripeModal(true);
      } else {
        // Card selected but Stripe not configured / clientSecret missing
        showToast({
          message: 'Card payments are temporarily unavailable. Please try UPI.',
          type: 'warning',
          duration: 4000,
        });
      }
    } else if (paymentData.paymentMethod === 'upi' || selectedType === 'upi') {
      setCurrentPaymentData(paymentData);
      setUpiId('');
      setShowUpiModal(true);
    } else {
      // Net banking, pay later, etc. — not yet integrated
      showToast({
        message: 'This payment method is not yet available. Please select UPI or Card.',
        type: 'warning',
        duration: 4000,
      });
    }
  };

  const handleUpiPayment = async () => {
    setUpiError(null);
    
    if (!upiId.trim()) {
      setUpiError('Please enter your UPI ID');
      return;
    }
    
    if (!currentPaymentData) {
      setUpiError('Payment data not found. Please try again.');
      return;
    }

    // UPI ID: min 3 chars before @, known provider suffix (2+ chars)
    const upiRegex = /^[\w.-]{3,}@[a-zA-Z]{2,}$/;
    if (!upiRegex.test(upiId.trim())) {
      setUpiError('Please enter a valid UPI ID (e.g., name@paytm, name@oksbi)');
      return;
    }

    try {
      setUpiProcessing(true);

      const confirmResponse = await apiClient.post('/store-payment/confirm', {
        paymentId: currentPaymentData.paymentId,
        transactionId: `UPI_${Date.now()}`,
        upiId: upiId.trim(),
      });

      if (confirmResponse.success && confirmResponse.data) {
        if (!isMounted()) return;
        setShowUpiModal(false);
        if (!isMounted()) return;
        setUpiId('');
        setUpiError(null);
        navigateToSuccess(confirmResponse.data);
      } else {
        if (!isMounted()) return;
        setUpiError(confirmResponse.error || 'Payment failed. Please try again.');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setUpiError(err.message || 'Payment failed. Please try again.');
    } finally {
      if (!isMounted()) return;
      setUpiProcessing(false);
    }
  };

  const handleStripePaymentSuccess = async (paymentIntentId: string) => {
    setShowStripeModal(false);

    if (!currentPaymentData) return;

    try {
      const confirmResponse = await apiClient.post('/store-payment/confirm', {
        paymentId: currentPaymentData.paymentId,
        transactionId: paymentIntentId,
      });

      if (confirmResponse.success && confirmResponse.data) {
        navigateToSuccess(confirmResponse.data);
      } else {
        showToast({
          message: confirmResponse.error || 'Payment confirmation failed. Please contact support.',
          type: 'error',
          duration: 5000,
        });
      }
    } catch (err: any) {
      showToast({
        message: 'Payment was processed but confirmation failed. Please check your transaction history.',
        type: 'warning',
        duration: 5000,
      });
    } finally {
      if (!isMounted()) return;
      setStripeClientSecret(null);
      if (!isMounted()) return;
      setCurrentPaymentData(null);
    }
  };

  const handleStripePaymentError = (errorMessage: string) => {
    setShowStripeModal(false);
    // Show error to user via toast
    if (errorMessage) {
      showToast({
        message: errorMessage || 'Payment failed. Please try again.',
        type: 'error',
        duration: 4000,
      });
    }
  };

  const handleStripePaymentCancel = async () => {
    setShowStripeModal(false);

    if (currentPaymentData?.paymentId) {
      try {
        await apiClient.post('/store-payment/cancel', {
          paymentId: currentPaymentData.paymentId,
          reason: 'user_cancelled',
        });
      } catch (err: any) {
        // Inform user if cancellation failed (payment may still be pending)
        showToast({
          message: 'Payment cancellation may not have completed. Please check your payment status.',
          type: 'warning',
          duration: 5000,
        });
      }
    }

    if (!isMounted()) return;
    setStripeClientSecret(null);
    if (!isMounted()) return;
    setCurrentPaymentData(null);
  };

  const navigateToSuccess = async (paymentResult: any) => {
    if (paymentFlow.appliedCoins.totalApplied > 0) {
      try {
        await gamificationActions.syncCoinsFromWallet();
      } catch (err) {
        // Show non-blocking notification - payment succeeded, but balance may be stale
        showToast({
          message: 'Payment successful! Wallet balance will update shortly.',
          type: 'info',
          duration: 3000,
        });
      }
    }

    router.replace({
      pathname: '/pay-in-store/success',
      params: {
        paymentId: paymentResult.paymentId,
        storeId,
        storeName,
        storeLogo: storeLogo || paymentFlow.store?.logo || '',
        amount: billAmount.toString(),
        coinsUsed: paymentFlow.appliedCoins.totalApplied.toString(),
        rewards: JSON.stringify(paymentResult.rewards || {
          cashback: paymentFlow.rewardsPreview.cashback,
          coinsEarned: paymentFlow.rewardsPreview.coinsToEarn,
          bonusCoins: 0,
        }),
      },
    });
  };

  // Loading state
  if (paymentFlow.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Preparing payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <SecurePaymentHeader storeName={storeName} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Store Info with Membership */}
        <StoreInfoCard
          storeName={storeName || ''}
          storeLogo={paymentFlow.store?.logo}
          storeCategory={paymentFlow.store?.category?.name}
          membership={paymentFlow.membership}
        />

        {/* Order Summary */}
        <OrderSummaryCard
          billAmount={billAmount}
          taxesAndFees={paymentFlow.taxesAndFees}
          discountAmount={paymentFlow.discountAmount}
          coinsApplied={paymentFlow.appliedCoins.totalApplied}
          showSmartSavingsHint={paymentFlow.appliedCoins.totalApplied === 0}
        />

        {/* Apply Coins Section */}
        <ApplyCoinsSection
          appliedCoins={paymentFlow.appliedCoins}
          maxCoinRedemptionPercent={paymentFlow.maxCoinRedemptionPercent}
          billAmount={billAmount - paymentFlow.discountAmount}
          isAutoOptimized={paymentFlow.isAutoOptimized}
          category={paymentFlow.store?.mainCategorySlug}
          onCoinToggle={paymentFlow.toggleCoin}
          onCoinAmountChange={paymentFlow.setCoinAmount}
          onAutoOptimize={paymentFlow.autoOptimize}
        />

        {/* Amount to Pay */}
        <AmountToPayCard
          originalAmount={billAmount}
          amountToPay={paymentFlow.amountToPay}
          coinsApplied={paymentFlow.appliedCoins.totalApplied}
          showOptimizedBadge={paymentFlow.isAutoOptimized}
        />

        {/* Payment Methods */}
        {paymentFlow.amountToPay > 0 && (
          <View style={styles.paymentMethodsCard}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            
            {paymentFlow.paymentMethods.map((method) => (
              <EnhancedPaymentMethodCard
                key={method.id}
                method={method}
                isSelected={paymentFlow.selectedPaymentMethod?.id === method.id}
                onSelect={() => paymentFlow.selectPaymentMethod(method)}
              />
            ))}

            {/* External Wallets */}
            {paymentFlow.externalWallets.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Third-Party Wallets</Text>
                {paymentFlow.externalWallets.map((wallet) => (
                  <WalletPaymentOption
                    key={wallet.id}
                    wallet={wallet}
                    isSelected={false}
                    onSelect={() => {
                      showToast({
                        message: wallet.isLinked
                          ? `${wallet.name} payments coming soon!`
                          : `Please link your ${wallet.name} account first`,
                        type: 'info',
                        duration: 3000,
                      });
                    }}
                    disabled={!wallet.isLinked}
                  />
                ))}
              </>
            )}
          </View>
        )}

        {/* Savings Summary */}
        {paymentFlow.savingsSummary.totalSaved > 0 && (
          <SavingsSummaryCard savings={paymentFlow.savingsSummary} />
        )}

        {/* Error Display */}
        {paymentFlow.error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={colors.errorScale[500]} />
            <Text style={styles.errorText}>{paymentFlow.error}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action */}
      <PayButtonWithRewards
        amountToPay={paymentFlow.amountToPay}
        rewardsPreview={paymentFlow.rewardsPreview}
        isProcessing={paymentFlow.isProcessing}
        disabled={paymentFlow.amountToPay > 0 && !paymentFlow.selectedPaymentMethod}
        onPress={handlePayment}
      />

      {/* Stripe Card Payment Modal */}
      <Modal
        visible={showStripeModal}
        transparent
        animationType="slide"
        onRequestClose={handleStripePaymentCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {stripeClientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: stripeClientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: colors.primary[500],
                      colorBackground: colors.background.primary,
                      colorText: colors.neutral[900],
                      colorDanger: colors.error,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      borderRadius: '12px',
                    },
                  },
                }}
              >
                <StripeCardForm
                  clientSecret={stripeClientSecret}
                  amount={currentPaymentData?.remainingAmount || 0}
                  onSuccess={handleStripePaymentSuccess}
                  onError={handleStripePaymentError}
                  onCancel={handleStripePaymentCancel}
                />
              </Elements>
            )}
          </View>
        </View>
      </Modal>

      {/* UPI Payment Modal */}
      <Modal
        visible={showUpiModal}
        transparent
        animationType="slide"
        onRequestClose={async () => {
          // Cancel the in-progress payment before closing
          if (currentPaymentData?.paymentId) {
            try {
              await apiClient.post('/store-payment/cancel', {
                paymentId: currentPaymentData.paymentId,
                reason: 'user_cancelled',
              });
            } catch (err: any) {
              // silently handle
            }
          }
          if (!isMounted()) return;
          setShowUpiModal(false);
          if (!isMounted()) return;
          setUpiId('');
          setUpiError(null);
          if (!isMounted()) return;
          setCurrentPaymentData(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.upiModalContent}>
            <View style={styles.upiHeader}>
              <View>
                <Text style={styles.upiTitle}>Pay via UPI</Text>
                <Text style={styles.upiSubtitle}>{storeName}</Text>
              </View>
            </View>

            <View style={styles.upiAmountContainer}>
              <Text style={styles.upiAmountLabel}>Amount to Pay</Text>
              <Text style={styles.upiAmount}>
                {currencySymbol}{currentPaymentData?.remainingAmount || paymentFlow.amountToPay}
              </Text>
            </View>

            <View style={styles.upiInputContainer}>
              <Text style={styles.upiInputLabel}>Enter your UPI ID</Text>
              <View style={[styles.upiInputWrapper, upiError && styles.upiInputError]}>
                <Ionicons name="phone-portrait-outline" size={20} color={upiError ? colors.error : colors.neutral[500]} />
                <TextInput
                  value={upiId}
                  onChangeText={(text) => {
                    setUpiId(text);
                    if (upiError) setUpiError(null);
                  }}
                  placeholder="yourname@upi"
                  placeholderTextColor={colors.neutral[400]}
                  style={styles.upiTextInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
              {upiError ? (
                <View style={styles.upiErrorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={styles.upiErrorText}>{upiError}</Text>
                </View>
              ) : (
                <Text style={styles.upiHint}>
                  Example: name@paytm, name@oksbi, name@ybl
                </Text>
              )}
            </View>

            <View style={styles.upiButtonContainer}>
              <View style={styles.upiCancelButton}>
                <Text
                  style={styles.upiCancelButtonText}
                  onPress={async () => {
                    if (currentPaymentData?.paymentId) {
                      try {
                        await apiClient.post('/store-payment/cancel', {
                          paymentId: currentPaymentData.paymentId,
                          reason: 'user_cancelled',
                        });
                      } catch (err: any) {
                        // silently handle
                      }
                    }
                    if (!isMounted()) return;
                    setShowUpiModal(false);
                    if (!isMounted()) return;
                    setUpiId('');
                    setUpiError(null);
                    if (!isMounted()) return;
                    setCurrentPaymentData(null);
                  }}
                >
                  Cancel
                </Text>
              </View>
              <View
                style={[
                  styles.upiPayButton,
                  (!upiId.trim() || upiProcessing) && styles.upiPayButtonDisabled,
                ]}
              >
                {upiProcessing ? (
                  <ActivityIndicator size="small" color={colors.background.primary} />
                ) : (
                  <Text
                    style={styles.upiPayButtonText}
                    onPress={handleUpiPayment}
                  >
                    Pay {currencySymbol}{currentPaymentData?.remainingAmount || paymentFlow.amountToPay}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  paymentMethodsCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorScale[50],
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.errorScale[700],
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  upiModalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 24,
    ...shadows.lg,
  },
  upiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  upiTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  upiSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  upiAmountContainer: {
    backgroundColor: colors.successScale[50],
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  upiAmountLabel: {
    fontSize: 13,
    color: colors.nileBlue,
    marginBottom: 4,
  },
  upiAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.nileBlue,
  },
  upiInputContainer: {
    marginBottom: 16,
  },
  upiInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 8,
  },
  upiInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.background.primary,
    gap: 10,
  },
  upiInputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorScale[50],
  },
  upiErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  upiErrorText: {
    fontSize: 12,
    color: colors.error,
  },
  upiTextInput: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[900],
    padding: 0,
    margin: 0,
  },
  upiHint: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 6,
  },
  upiButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  upiCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  upiCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  upiPayButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.lightMustard,
    alignItems: 'center',
  },
  upiPayButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  upiPayButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
});

export default withErrorBoundary(PaymentScreen, 'PayInStorePayment');
