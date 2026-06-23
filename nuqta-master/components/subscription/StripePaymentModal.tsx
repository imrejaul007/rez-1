// Production-Ready Stripe Payment Modal
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { loadStripe } from '@stripe/stripe-js';
import * as authStorage from '@/utils/authStorage';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface StripePaymentModalProps {
  visible: boolean;
  tier: 'premium' | 'vip';
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  subscriptionId: string;
  onSuccess: () => void;
  onClose: () => void;
  onError: (error: Error) => void;
}

function StripePaymentModal({
  visible,
  tier,
  amount,
  billingCycle,
  subscriptionId,
  onSuccess,
  onClose,
  onError,
}: StripePaymentModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);

  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      loadStripeSDK();
    }
  }, [visible]);

  const loadStripeSDK = async () => {
    try {
      setLoading(true);
      const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      if (!publishableKey) {
        throw new Error('Stripe publishable key not configured');
      }

      const stripe = await loadStripe(publishableKey);
      if (stripe) {
        setStripeLoaded(true);
      } else {
        throw new Error('Failed to load Stripe');
      }
    } catch (error: any) {
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    // Guard: This function should only run on web
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      onError(new Error('Stripe web checkout is only available on web platform'));
      return;
    }

    try {
      setProcessingPayment(true);

      // Get token from authStorage (checks localStorage first on web, survives Stripe redirects)
      const token = await authStorage.getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Construct URLs safely (only on web)
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/subscription/payment-success`;
      const cancelUrl = `${baseUrl}/subscription/plans`;

      // Create checkout session via your API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/payment/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscriptionId,
          tier,
          amount,
          billingCycle,
          successUrl,
          cancelUrl,
        }),
      });

      const session = await response.json();

      if (!session.success || !session.data?.url) {
        throw new Error(session.message || 'Failed to create checkout session');
      }

      // Store upgradeId in sessionStorage so payment-success page can confirm upgrade
      if (subscriptionId) {
        sessionStorage.setItem('pendingUpgradeId', subscriptionId);
      }

      // Redirect to Stripe Checkout — onSuccess will be handled on return URL
      // Do NOT call onSuccess() here; the user hasn't paid yet
      window.location.href = session.data.url;
    } catch (error: any) {
      onError(error);
      setProcessingPayment(false);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <ThemedText style={styles.headerTitle}>Payment</ThemedText>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </Pressable>
            </View>

            <View style={styles.content}>
              <Ionicons name="information-circle" size={64} color={colors.brand.purpleLight} />
              <ThemedText style={styles.nativeMessage}>
                Native Stripe payments require the mobile app.
              </ThemedText>
              <ThemedText style={styles.nativeSubtext}>
                Please use the web version to complete payment.
              </ThemedText>
            </View>

            <Pressable style={styles.closeOnlyButton} onPress={onClose}>
              <ThemedText style={styles.closeButtonText}>Close</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Complete Payment</ThemedText>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              disabled={processingPayment}
            >
              <Ionicons name="close" size={24} color={colors.neutral[500]} />
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brand.purpleLight} />
                <ThemedText style={styles.loadingText}>Loading payment...</ThemedText>
              </View>
            ) : (
              <>
                {/* Plan Details */}
                <View style={styles.planDetails}>
                  <View style={styles.planRow}>
                    <ThemedText style={styles.planLabel}>Plan:</ThemedText>
                    <ThemedText style={styles.planValue}>
                      {tier === 'vip' ? 'VIP' : 'Premium'}
                    </ThemedText>
                  </View>
                  <View style={styles.planRow}>
                    <ThemedText style={styles.planLabel}>Billing:</ThemedText>
                    <ThemedText style={styles.planValue}>
                      {billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}
                    </ThemedText>
                  </View>
                  <View style={[styles.planRow, styles.totalRow]}>
                    <ThemedText style={styles.totalLabel}>Total:</ThemedText>
                    <ThemedText style={styles.totalValue}>{currencySymbol}{amount}</ThemedText>
                  </View>
                </View>

                {/* Payment Info */}
                <View style={styles.infoBox}>
                  <Ionicons name="shield-checkmark" size={24} color={colors.lightMustard} />
                  <ThemedText style={styles.infoText}>
                    Secure payment powered by Stripe
                  </ThemedText>
                </View>

                <View style={styles.benefitsBox}>
                  <ThemedText style={styles.benefitsTitle}>You'll get:</ThemedText>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.lightMustard} />
                    <ThemedText style={styles.benefitText}>7-day free trial</ThemedText>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.lightMustard} />
                    <ThemedText style={styles.benefitText}>Cancel anytime</ThemedText>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.lightMustard} />
                    <ThemedText style={styles.benefitText}>Full refund if cancelled within 24hrs</ThemedText>
                  </View>
                </View>

                {/* Action Buttons */}
                <Pressable
                  style={[styles.payButton, processingPayment && styles.payButtonDisabled]}
                  onPress={handlePayNow}
                  disabled={processingPayment || !stripeLoaded}
                >
                  {processingPayment ? (
                    <>
                      <ActivityIndicator size="small" color={colors.background.primary} />
                      <ThemedText style={styles.payButtonText}>Processing...</ThemedText>
                    </>
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={20} color={colors.background.primary} />
                      <ThemedText style={styles.payButtonText}>
                        Pay {currencySymbol}{amount} Securely
                      </ThemedText>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={processingPayment}
                >
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.neutral[500],
  },
  planDetails: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  planValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.brand.purpleLight,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.linen,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: colors.nileBlue,
    flex: 1,
  },
  benefitsBox: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.neutral[500],
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    color: colors.neutral[500],
    fontSize: 14,
    fontWeight: '600',
  },
  nativeMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  nativeSubtext: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  closeOnlyButton: {
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 12,
    padding: 16,
    margin: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default React.memo(StripePaymentModal);
