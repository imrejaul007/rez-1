// Send Money Modal
// Allows users to send money from their RezPay wallet to others

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
import { platformAlertSimple } from '@/utils/platformAlert';
import walletApi from '@/services/walletApi';
import { generateIdempotencyKey } from '@/utils/idempotencyKey';
import { useIsMounted } from '@/hooks/useIsMounted';

interface SendMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (amount: number, recipient: string) => void;
  currentBalance: number;
}

type RecipientType = 'phone' | 'upi' | 'email';

function SendMoneyModal({
  visible,
  onClose,
  onSuccess,
  currentBalance,
}: SendMoneyModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [recipientType, setRecipientType] = useState<RecipientType>('phone');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey('send-money'));
  const isMounted = useIsMounted();

  const handleAmountChange = (text: string) => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    setAmount(numericValue);
  };

  const getRecipientPlaceholder = () => {
    switch (recipientType) {
      case 'phone':
        return 'Enter phone number';
      case 'upi':
        return 'Enter UPI ID (e.g., user@bank)';
      case 'email':
        return 'Enter email address';
    }
  };

  const validateRecipient = (): boolean => {
    if (!recipient.trim()) {
      platformAlertSimple('Error', 'Please enter recipient details');
      return false;
    }

    switch (recipientType) {
      case 'phone':
        if (!/^\d{10}$/.test(recipient)) {
          platformAlertSimple('Invalid Phone', 'Please enter a valid 10-digit phone number');
          return false;
        }
        break;
      case 'upi':
        if (!/^[\w.-]+@[\w.-]+$/.test(recipient)) {
          platformAlertSimple('Invalid UPI', 'Please enter a valid UPI ID');
          return false;
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
          platformAlertSimple('Invalid Email', 'Please enter a valid email address');
          return false;
        }
        break;
    }

    return true;
  };

  const validateAmount = (): boolean => {
    const amountNum = parseInt(amount, 10);

    if (!amount || amountNum <= 0) {
      platformAlertSimple('Invalid Amount', 'Please enter a valid amount');
      return false;
    }

    if (amountNum < 1) {
      platformAlertSimple('Minimum Amount', `Minimum transfer amount is ${currencySymbol}1`);
      return false;
    }

    if (amountNum > currentBalance) {
      platformAlertSimple('Insufficient Balance', 'You don\'t have enough balance');
      return false;
    }

    if (amountNum > 50000) {
      platformAlertSimple('Maximum Amount', `Maximum transfer amount is ${currencySymbol}50,000 per transaction`);
      return false;
    }

    return true;
  };

  const handleProceed = () => {
    if (!validateRecipient() || !validateAmount()) {
      return;
    }

    setStep('confirm');
  };

  const handleConfirmSend = async () => {
    setLoading(true);
    try {
      const amountNum = parseInt(amount, 10);

      const res = await walletApi.initiateTransfer({
        recipientPhone: recipient,
        amount: amountNum,
        coinType: 'nuqta',
        note: note || undefined,
        idempotencyKey,
      });

      if (!res.data) {
        throw new Error(res.error || 'Transfer failed');
      }

      // Regenerate idempotency key for the next transfer
      if (!isMounted()) return;
      setIdempotencyKey(generateIdempotencyKey('send-money'));

      setLoading(false);
      handleClose();

      platformAlertSimple(
        'Money Sent!',
        `${currencySymbol}${amountNum.toLocaleString()} has been sent successfully`
      );
      onSuccess(amountNum, recipient);
    } catch (error: any) {
      if (!isMounted()) return;
      setLoading(false);
      platformAlertSimple(
        'Transfer Failed',
        error?.message || 'Unable to process transfer. Please try again.'
      );
    }
  };

  const handleClose = () => {
    if (!loading) {
      setRecipient('');
      setAmount('');
      setNote('');
      setStep('input');
      setIdempotencyKey(generateIdempotencyKey('send-money'));
      onClose();
    }
  };

  const handleBack = () => {
    setStep('input');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      accessibilityViewIsModal={true}
      accessibilityLabel="Send money from wallet"
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
              {step === 'confirm' && (
                <Pressable
                  onPress={handleBack}
                  disabled={loading}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  accessibilityHint="Double tap to go back to previous step"
                  accessibilityState={{ disabled: loading }}
                >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </Pressable>
              )}
              <ThemedText style={styles.modalTitle}>
                {step === 'input' ? 'Send Money' : 'Confirm Transfer'}
              </ThemedText>
              <Pressable
                onPress={handleClose}
                disabled={loading}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close send money dialog"
                accessibilityHint="Double tap to close this dialog"
                accessibilityState={{ disabled: loading }}
              >
                <Ionicons name="close" size={24} color="white" />
              </Pressable>
            </View>
            <ThemedText style={styles.currentBalanceText}>
              Available Balance: {currencySymbol}{(Number.isFinite(currentBalance) ? currentBalance : 0).toLocaleString()}
            </ThemedText>
          </LinearGradient>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'input' ? (
              <>
                {/* Recipient Type Selection */}
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Send To</ThemedText>
                  <View style={styles.recipientTypeButtons}>
                    <Pressable
                      style={[
                        styles.typeButton,
                        recipientType === 'phone' && styles.typeButtonSelected,
                      ]}
                      onPress={() => setRecipientType('phone')}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Send to phone number"
                      accessibilityHint="Double tap to select phone as recipient type"
                      accessibilityState={{ selected: recipientType === 'phone' }}
                    >
                      <Ionicons
                        name="phone-portrait"
                        size={20}
                        color={recipientType === 'phone' ? ACCOUNT_COLORS.primary : ACCOUNT_COLORS.textSecondary}
                      />
                      <ThemedText
                        style={[
                          styles.typeButtonText,
                          recipientType === 'phone' && styles.typeButtonTextSelected,
                        ]}
                      >
                        Phone
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.typeButton,
                        recipientType === 'upi' && styles.typeButtonSelected,
                      ]}
                      onPress={() => setRecipientType('upi')}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Send to UPI ID"
                      accessibilityHint="Double tap to select UPI as recipient type"
                      accessibilityState={{ selected: recipientType === 'upi' }}
                    >
                      <Ionicons
                        name="swap-horizontal"
                        size={20}
                        color={recipientType === 'upi' ? ACCOUNT_COLORS.primary : ACCOUNT_COLORS.textSecondary}
                      />
                      <ThemedText
                        style={[
                          styles.typeButtonText,
                          recipientType === 'upi' && styles.typeButtonTextSelected,
                        ]}
                      >
                        UPI
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.typeButton,
                        recipientType === 'email' && styles.typeButtonSelected,
                      ]}
                      onPress={() => setRecipientType('email')}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Send to email address"
                      accessibilityHint="Double tap to select email as recipient type"
                      accessibilityState={{ selected: recipientType === 'email' }}
                    >
                      <Ionicons
                        name="mail"
                        size={20}
                        color={recipientType === 'email' ? ACCOUNT_COLORS.primary : ACCOUNT_COLORS.textSecondary}
                      />
                      <ThemedText
                        style={[
                          styles.typeButtonText,
                          recipientType === 'email' && styles.typeButtonTextSelected,
                        ]}
                      >
                        Email
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>

                {/* Recipient Input */}
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Recipient</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={recipient}
                    onChangeText={setRecipient}
                    placeholder={getRecipientPlaceholder()}
                    placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                    keyboardType={recipientType === 'phone' ? 'phone-pad' : 'default'}
                    autoCapitalize="none"
                    accessible={true}
                    accessibilityLabel="Recipient information"
                    accessibilityHint={`Enter recipient ${recipientType}`}
                  />
                </View>

                {/* Amount Input */}
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Amount</ThemedText>
                  <View style={styles.amountContainer}>
                    <ThemedText style={styles.currencySymbol}>{currencySymbol}</ThemedText>
                    <TextInput
                      style={styles.amountInput}
                      value={amount}
                      onChangeText={handleAmountChange}
                      placeholder="0"
                      placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                      keyboardType="numeric"
                      maxLength={6}
                      accessible={true}
                      accessibilityLabel="Amount to send"
                      accessibilityHint="Enter the amount you want to send"
                    />
                  </View>
                  <ThemedText style={styles.helperText}>
                    Minimum: {currencySymbol}1 • Maximum: {currencySymbol}50,000
                  </ThemedText>
                </View>

                {/* Note (Optional) */}
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>
                    Add Note (Optional)
                  </ThemedText>
                  <TextInput
                    style={[styles.input, styles.noteInput]}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Add a message"
                    placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                    maxLength={100}
                    multiline
                    accessible={true}
                    accessibilityLabel="Add note"
                    accessibilityHint="Optionally add a message with your transfer"
                  />
                </View>
              </>
            ) : (
              <>
                {/* Confirmation View */}
                <View style={styles.confirmationCard}>
                  <View style={styles.confirmationHeader}>
                    <View style={styles.confirmationIconContainer}>
                      <Ionicons name="send" size={32} color={ACCOUNT_COLORS.primary} />
                    </View>
                    <ThemedText style={styles.confirmationAmount}>
                      {currencySymbol}{parseInt(amount, 10).toLocaleString()}
                    </ThemedText>
                  </View>

                  <View style={styles.confirmationDivider} />

                  <View style={styles.confirmationDetail}>
                    <ThemedText style={styles.confirmationLabel}>Sending to</ThemedText>
                    <ThemedText style={styles.confirmationValue}>{recipient}</ThemedText>
                  </View>

                  <View style={styles.confirmationDetail}>
                    <ThemedText style={styles.confirmationLabel}>Via</ThemedText>
                    <ThemedText style={styles.confirmationValue}>
                      {recipientType.toUpperCase()}
                    </ThemedText>
                  </View>

                  {note && (
                    <View style={styles.confirmationDetail}>
                      <ThemedText style={styles.confirmationLabel}>Note</ThemedText>
                      <ThemedText style={styles.confirmationValue}>{note}</ThemedText>
                    </View>
                  )}

                  <View style={styles.confirmationDivider} />

                  <View style={styles.confirmationDetail}>
                    <ThemedText style={styles.confirmationLabel}>
                      New Balance
                    </ThemedText>
                    <ThemedText style={styles.confirmationNewBalance}>
                      {currencySymbol}{(currentBalance - parseInt(amount, 10)).toLocaleString()}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.warningCard}>
                  <Ionicons name="information-circle" size={20} color={ACCOUNT_COLORS.warning} />
                  <ThemedText style={styles.warningText}>
                    Please verify recipient details carefully. This transaction cannot be reversed.
                  </ThemedText>
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer with Action Button */}
          <View style={styles.modalFooter}>
            {step === 'input' ? (
              <Pressable
                style={[
                  styles.proceedButton,
                  (!recipient || !amount || loading) && styles.proceedButtonDisabled,
                ]}
                onPress={handleProceed}
                disabled={!recipient || !amount || loading}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Continue to confirm transfer"
                accessibilityHint="Double tap to proceed to confirmation screen"
                accessibilityState={{ disabled: !recipient || !amount || loading }}
              >
                <ThemedText style={styles.proceedButtonText}>Continue</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.proceedButton, loading && styles.proceedButtonDisabled]}
                onPress={handleConfirmSend}
                disabled={loading}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={loading ? "Processing transfer" : `Confirm and send ${amount} rupees to ${recipient}`}
                accessibilityHint="Double tap to confirm and send money"
                accessibilityState={{
                  disabled: loading,
                  busy: loading
                }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <ThemedText style={styles.proceedButtonText}>
                      Confirm & Send
                    </ThemedText>
                  </>
                )}
              </Pressable>
            )}
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
    flex: 1,
    textAlign: 'center',
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
  recipientTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ACCOUNT_COLORS.border,
  },
  typeButtonSelected: {
    borderColor: ACCOUNT_COLORS.primary,
    backgroundColor: ACCOUNT_COLORS.primary + '10',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCOUNT_COLORS.textSecondary,
  },
  typeButtonTextSelected: {
    color: ACCOUNT_COLORS.primary,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ACCOUNT_COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: ACCOUNT_COLORS.text,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ACCOUNT_COLORS.border,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    color: ACCOUNT_COLORS.text,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '600',
    color: ACCOUNT_COLORS.text,
    paddingVertical: 16,
  },
  helperText: {
    fontSize: 12,
    color: ACCOUNT_COLORS.textSecondary,
    marginTop: 8,
  },
  confirmationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: ACCOUNT_COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmationHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmationIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ACCOUNT_COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmationAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: ACCOUNT_COLORS.text,
  },
  confirmationDivider: {
    height: 1,
    backgroundColor: ACCOUNT_COLORS.border,
    marginVertical: 16,
  },
  confirmationDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmationLabel: {
    fontSize: 14,
    color: ACCOUNT_COLORS.textSecondary,
  },
  confirmationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCOUNT_COLORS.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
  confirmationNewBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCOUNT_COLORS.success,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: ACCOUNT_COLORS.warning + '15',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: ACCOUNT_COLORS.text,
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

export default React.memo(SendMoneyModal);
