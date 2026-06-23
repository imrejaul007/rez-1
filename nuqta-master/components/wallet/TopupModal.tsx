// Topup Wallet Modal
// Allows users to add money to their RezPay wallet

import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ACCOUNT_COLORS } from '@/types/account.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import walletApi from '@/services/walletApi';
import analytics from '@/services/analytics/AnalyticsService';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';
import { useIsMounted } from '@/hooks/useIsMounted';

interface TopupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (amount: number) => void;
  currentBalance: number;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

function TopupModal({
  visible,
  onClose,
  onSuccess,
  currentBalance,
}: TopupModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const isMounted = useIsMounted();

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text: string) => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    setCustomAmount(numericValue);
    setSelectedAmount(null);
  };

  const getFinalAmount = (): number => {
    if (selectedAmount) return selectedAmount;
    if (customAmount) return parseInt(customAmount, 10);
    return 0;
  };

  const handleProceedToPayment = async () => {
    const amount = getFinalAmount();

    if (!amount || amount <= 0) {
      platformAlertSimple('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (amount < 10) {
      platformAlertSimple('Minimum Amount', `Minimum topup amount is ${currencySymbol}10`);
      return;
    }

    if (amount > 100000) {
      platformAlertSimple('Maximum Amount', `Maximum topup amount is ${currencySymbol}1,00,000`);
      return;
    }

    platformAlertConfirm(
      'Confirm Topup',
      `Add ${currencySymbol}${amount.toLocaleString()} to your wallet?`,
      () => processTopup(amount),
      'Proceed'
    );
  };

  const processTopup = async (amount: number) => {
    setLoading(true);
    try {
      // Uses the direct topup endpoint (POST /wallet/topup)
      const res = await walletApi.topup({
        amount,
        paymentMethod: 'wallet_topup',
        paymentId: `TOPUP_${Date.now()}`,
      });

      if (!res.data) {
        throw new Error(res.error || 'Topup failed');
      }

      const newBalance = res.data.wallet?.balance?.total;

      if (!isMounted()) return;
      setLoading(false);
      setSelectedAmount(null);
      setCustomAmount('');
      onSuccess(amount);
      onClose();

      // Track wallet_topup event
      try { analytics.trackEvent(ANALYTICS_EVENTS.WALLET_TOPPED_UP, { amount, currency: currencySymbol, payment_method: 'wallet_topup' }); } catch {}

      platformAlertSimple(
        'Topup Successful!',
        newBalance != null
          ? `${currencySymbol}${amount.toLocaleString()} has been added. New balance: ${currencySymbol}${newBalance.toLocaleString()}`
          : `${currencySymbol}${amount.toLocaleString()} has been added to your wallet`
      );
    } catch (error: any) {
      if (!isMounted()) return;
      setLoading(false);
      platformAlertSimple(
        'Topup Failed',
        error?.message || 'Unable to process payment. Please try again.'
      );
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedAmount(null);
      setCustomAmount('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      accessibilityViewIsModal={true}
      accessibilityLabel="Add money to wallet"
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <LinearGradient
            colors={[ACCOUNT_COLORS.primary, ACCOUNT_COLORS.primaryLight]}
            style={styles.modalHeader}
          >
            <View style={styles.modalHeaderContent}>
              <ThemedText style={styles.modalTitle}>Add Money</ThemedText>
              <Pressable
                onPress={handleClose}
                disabled={loading}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close add money dialog"
                accessibilityHint="Double tap to close this dialog"
                accessibilityState={{ disabled: loading }}
              >
                <Ionicons name="close" size={24} color="white" />
              </Pressable>
            </View>
            <ThemedText style={styles.currentBalanceText}>
              Current Balance: {currencySymbol}{(Number.isFinite(currentBalance) ? currentBalance : 0).toLocaleString()}
            </ThemedText>
          </LinearGradient>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Quick Amount Buttons */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Quick Amount</ThemedText>
              <View style={styles.quickAmountsGrid}>
                {QUICK_AMOUNTS.map((amount) => (
                  <Pressable
                    key={amount}
                    style={[
                      styles.quickAmountButton,
                      selectedAmount === amount && styles.quickAmountButtonSelected,
                    ]}
                    onPress={() => handleAmountSelect(amount)}
                    disabled={loading}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${amount} rupees`}
                    accessibilityHint="Double tap to select this amount"
                    accessibilityState={{
                      disabled: loading,
                      selected: selectedAmount === amount
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.quickAmountText,
                        selectedAmount === amount && styles.quickAmountTextSelected,
                      ]}
                    >
                      {currencySymbol}{amount.toLocaleString()}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Custom Amount */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Or Enter Amount</ThemedText>
              <View style={styles.customAmountContainer}>
                <ThemedText style={styles.currencySymbol}>{currencySymbol}</ThemedText>
                <TextInput
                  style={styles.customAmountInput}
                  value={customAmount}
                  onChangeText={handleCustomAmountChange}
                  placeholder="Enter amount"
                  placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                  keyboardType="numeric"
                  maxLength={6}
                  editable={!loading}
                  accessible={true}
                  accessibilityLabel="Enter custom amount"
                  accessibilityHint="Enter the amount you want to add to your wallet"
                />
              </View>
              <ThemedText style={styles.helperText}>
                Minimum: {currencySymbol}10 • Maximum: {currencySymbol}1,00,000
              </ThemedText>
            </View>

            {/* Summary */}
            {getFinalAmount() > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Amount to Add</ThemedText>
                  <ThemedText style={styles.summaryAmount}>
                    {currencySymbol}{getFinalAmount().toLocaleString()}
                  </ThemedText>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>New Balance</ThemedText>
                  <ThemedText style={styles.summaryNewBalance}>
                    {currencySymbol}{(currentBalance + getFinalAmount()).toLocaleString()}
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Payment Info */}
            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark" size={20} color={ACCOUNT_COLORS.success} />
              <View style={styles.infoText}>
                <ThemedText style={styles.infoTitle}>Secure Payment</ThemedText>
                <ThemedText style={styles.infoDescription}>
                  Your payment is processed securely via Stripe. We never store your card details.
                </ThemedText>
              </View>
            </View>
          </ScrollView>

          {/* Footer with Action Button */}
          <View style={styles.modalFooter}>
            <Pressable
              style={[
                styles.proceedButton,
                (getFinalAmount() <= 0 || loading) && styles.proceedButtonDisabled,
              ]}
              onPress={handleProceedToPayment}
              disabled={getFinalAmount() <= 0 || loading}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={loading ? "Processing payment" : `Proceed to payment for ${getFinalAmount()} rupees`}
              accessibilityHint="Double tap to proceed with payment"
              accessibilityState={{
                disabled: getFinalAmount() <= 0 || loading,
                busy: loading
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="card" size={20} color="white" />
                  <ThemedText style={styles.proceedButtonText}>
                    Proceed to Payment
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: ACCOUNT_COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    paddingTop: 24,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  currentBalanceText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCOUNT_COLORS.text,
    marginBottom: 12,
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAmountButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ACCOUNT_COLORS.border,
    minWidth: 100,
    alignItems: 'center',
  },
  quickAmountButtonSelected: {
    borderColor: ACCOUNT_COLORS.primary,
    backgroundColor: ACCOUNT_COLORS.primary + '10',
  },
  quickAmountText: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCOUNT_COLORS.text,
  },
  quickAmountTextSelected: {
    color: ACCOUNT_COLORS.primary,
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ACCOUNT_COLORS.border,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: ACCOUNT_COLORS.text,
    marginRight: 8,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: ACCOUNT_COLORS.text,
    paddingVertical: 16,
  },
  helperText: {
    fontSize: 12,
    color: ACCOUNT_COLORS.textSecondary,
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: ACCOUNT_COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: ACCOUNT_COLORS.border,
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: ACCOUNT_COLORS.textSecondary,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCOUNT_COLORS.text,
  },
  summaryNewBalance: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCOUNT_COLORS.success,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: ACCOUNT_COLORS.success + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCOUNT_COLORS.text,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    color: ACCOUNT_COLORS.textSecondary,
    lineHeight: 18,
  },
  modalFooter: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: ACCOUNT_COLORS.border,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCOUNT_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  proceedButtonDisabled: {
    backgroundColor: ACCOUNT_COLORS.border,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

export default React.memo(TopupModal);
