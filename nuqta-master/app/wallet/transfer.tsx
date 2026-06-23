import { withErrorBoundary } from '@/utils/withErrorBoundary';
// P2P Coin Transfer Page
// Send Nuqta Coins to other users

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSecurity } from '@/contexts/SecurityContext';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Share,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import { useRezBalance, useRefreshWallet } from '@/stores/selectors';
import walletApi from '@/services/walletApi';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { generateIdempotencyKey } from '@/utils/idempotencyKey';
import { handleWalletError, parseWalletError } from '@/utils/walletErrorHandler';
import { BRAND } from '@/constants/brand';

const nuqtaCoinImage = BRAND.COIN_IMAGE;

interface RecentRecipient {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
}

const QUICK_AMOUNTS = [50, 100, 250, 500];

function TransferPage() {
  const router = useRouter();

  const nuqtaBalance = useRezBalance();
  const refreshWallet = useRefreshWallet();
  const { authenticateWithBiometric, biometricAvailable, biometricEnrolled } = useSecurity();

  const [step, setStep] = useState<'recipient' | 'amount' | 'otp' | 'success'>('recipient');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<RecentRecipient | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [recipients, setRecipients] = useState<RecentRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingTransferId, setPendingTransferId] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey('transfer'));
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  // Fetch recent recipients (and re-fetch on search)
  const fetchRecipients = useCallback(async (search?: string) => {
    setRecipientsLoading(true);
    try {
      const res = await walletApi.getRecentRecipients(search || undefined);
      const list = res.data?.recipients || [];
      setRecipients(list.map((r: any) => ({
        id: r._id || r.id,
        name: r.fullName || r.name || r.phoneNumber || r.phone || 'User',
        phone: r.phoneNumber || r.phone || '',
        avatar: r.avatar,
      })));
    } catch (error) {
      setRecipients([]);
    } finally {
      setRecipientsLoading(false);
    }
  }, []);

  // Initial load of recent recipients
  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchRecipients(searchQuery);
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, fetchRecipients]);

  // Refresh wallet balance (after successful transfer)
  const refreshBalance = useCallback(async () => {
    await refreshWallet();
  }, [refreshWallet]);

  const handleSelectRecipient = (recipient: RecentRecipient) => {
    setSelectedRecipient(recipient);
    setStep('amount');
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const handleSend = () => {
    const numAmount = Number(amount);
    if (!selectedRecipient || !amount || isNaN(numAmount) || numAmount <= 0) return;
    if (submittingRef.current) return;
    if (numAmount > nuqtaBalance) {
      platformAlertSimple('Insufficient Balance', `You only have ${nuqtaBalance} ${BRAND.CURRENCY_CODE} available.`);
      return;
    }

    const recipientName = selectedRecipient.name || 'this user';
    platformAlertConfirm(
      'Confirm Transfer',
      `Send ${numAmount.toLocaleString()} ${BRAND.CURRENCY_CODE} to ${recipientName}?`,
      () => { executeTransfer(); },
      'Send',
      'Cancel',
    );
  };

  const executeTransfer = async () => {
    if (!selectedRecipient) return;
    const numAmount = Number(amount);

    // Biometric authentication before transfer
    if (biometricAvailable && biometricEnrolled) {
      const authenticated = await authenticateWithBiometric();
      if (!authenticated) {
        platformAlertSimple('Authentication Required', 'Biometric authentication is required to send coins.');
        return;
      }
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const res = await walletApi.initiateTransfer({
        recipientId: selectedRecipient.id,
        recipientPhone: selectedRecipient.phone,
        amount: numAmount,
        coinType: 'nuqta',
        note: note || undefined,
        idempotencyKey,
      });

      const data = res.data;
      if (!data) {
        platformAlertSimple('Transfer Failed', 'Unexpected response from server.');
        return;
      }

      if (!mountedRef.current) return;
      if (data.requiresOtp) {
        setPendingTransferId(data.transferId);
        setStep('otp');
      } else {
        setTransactionId(data.transferId);
        setIdempotencyKey(generateIdempotencyKey('transfer'));
        refreshBalance();
        setStep('success');
      }
    } catch (error: any) {
      if (!mountedRef.current) return;
      // Regenerate idempotency key on failure so retry creates a fresh transfer
      setIdempotencyKey(generateIdempotencyKey('transfer'));
      const parsed = parseWalletError(error);
      if (parsed.code === 'REAUTH_REQUIRED') {
        setPendingTransferId('');
        setStep('otp');
        platformAlertSimple('Verification Required', `Transfers above ${parsed.threshold || 5000} ${BRAND.CURRENCY_CODE} require OTP verification.`);
      } else {
        handleWalletError(error, 'Transfer Failed');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleConfirmOtp = async () => {
    if (!otp || otp.length < 6) {
      platformAlertSimple('Invalid OTP', 'Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      if (!pendingTransferId) {
        const res = await walletApi.initiateTransfer({
          recipientId: selectedRecipient!.id,
          recipientPhone: selectedRecipient!.phone,
          amount: Number(amount),
          coinType: 'nuqta',
          note: note || undefined,
          idempotencyKey,
        });
        const data = res.data;
        if (data?.requiresOtp) {
          const confirmRes = await walletApi.confirmTransfer({ transferId: data.transferId, otp });
          setTransactionId(confirmRes.data?.transferId || data.transferId);
        } else {
          setTransactionId(data?.transferId || '');
        }
        setIdempotencyKey(generateIdempotencyKey('transfer'));
        refreshBalance();
        setStep('success');
      } else {
        const res = await walletApi.confirmTransfer({
          transferId: pendingTransferId,
          otp,
        });
        const data = res.data;
        setTransactionId(data?.transferId || pendingTransferId);
        setIdempotencyKey(generateIdempotencyKey('transfer'));
        refreshBalance();
        setStep('success');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'OTP verification failed. Please try again.';
      platformAlertSimple('Verification Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const numAmount = Number(amount) || 0;
  const isAmountValid = numAmount > 0 && numAmount <= nuqtaBalance;

  const renderRecipientStep = () => (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by phone or name"
          placeholderTextColor={Colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
          </Pressable>
        )}
      </View>

      {/* Recent Recipients */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>
          {searchQuery ? 'Results' : 'Recent'}
        </ThemedText>
        {recipientsLoading ? (
          <ActivityIndicator color={Colors.primary[600]} style={{ marginVertical: Spacing.lg }} />
        ) : recipients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={Colors.text.tertiary} />
            <ThemedText style={styles.emptyText}>
              {searchQuery ? 'No users found' : 'No recent recipients'}
            </ThemedText>
          </View>
        ) : (
          recipients.map(recipient => (
            <Pressable
              key={recipient.id}
              style={styles.recipientCard}
              onPress={() => handleSelectRecipient(recipient)}
            >
              <View style={styles.recipientAvatar}>
                <ThemedText style={styles.avatarText}>
                  {(recipient.name || '?').charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.recipientInfo}>
                <ThemedText style={styles.recipientName}>{recipient.name}</ThemedText>
                {recipient.phone ? (
                  <ThemedText style={styles.recipientPhone}>{recipient.phone}</ThemedText>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </Pressable>
          ))
        )}
      </View>

      {/* Scan QR Code */}
      <Pressable
        style={styles.qrButton}
        onPress={() => platformAlertSimple('Coming Soon', 'QR code scanning will be available in a future update.')}
      >
        <Ionicons name="qr-code" size={22} color={Colors.nileBlue} />
        <ThemedText style={styles.qrButtonText}>Scan QR Code</ThemedText>
      </Pressable>
    </>
  );

  const renderAmountStep = () => (
    <>
      {/* Selected Recipient */}
      <View style={styles.selectedRecipient}>
        <View style={styles.recipientAvatarLarge}>
          <ThemedText style={styles.avatarTextLarge}>
            {(selectedRecipient?.name || '?').charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <ThemedText style={styles.selectedName}>{selectedRecipient?.name}</ThemedText>
        {selectedRecipient?.phone ? (
          <ThemedText style={styles.selectedPhone}>{selectedRecipient.phone}</ThemedText>
        ) : null}
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <CachedImage source={nuqtaCoinImage} style={styles.coinImage} />
        <View style={styles.balanceInfo}>
          <ThemedText style={styles.balanceLabel}>Available Balance</ThemedText>
          <ThemedText style={styles.balanceValue}>{nuqtaBalance.toLocaleString()} {BRAND.CURRENCY_CODE}</ThemedText>
        </View>
      </View>

      {/* Amount Input */}
      <View style={styles.section}>
        <View style={styles.amountInputContainer}>
          <ThemedText style={styles.currencySymbol}>{BRAND.CURRENCY_CODE}</ThemedText>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.text.tertiary}
            autoFocus
          />
        </View>
      </View>

      {/* Quick Amounts */}
      <View style={styles.quickAmounts}>
        {QUICK_AMOUNTS.map(quickAmount => (
          <Pressable
            key={quickAmount}
            style={[
              styles.quickAmountButton,
              amount === quickAmount.toString() && styles.quickAmountButtonSelected,
            ]}
            onPress={() => handleQuickAmount(quickAmount)}
          >
            <ThemedText style={[
              styles.quickAmountText,
              amount === quickAmount.toString() && styles.quickAmountTextSelected,
            ]}>
              {quickAmount}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Note Input */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Add a note (optional)</ThemedText>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Thanks for dinner!"
          placeholderTextColor={Colors.text.tertiary}
          multiline
        />
      </View>

      {/* Insufficient balance warning */}
      {numAmount > 0 && numAmount > nuqtaBalance && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={16} color={Colors.error} />
          <ThemedText style={styles.warningText}>
            Insufficient balance. You have {nuqtaBalance.toLocaleString()} {BRAND.CURRENCY_CODE} available.
          </ThemedText>
        </View>
      )}

      {/* Send Button */}
      <Pressable
        style={[styles.sendButton, !isAmountValid && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!isAmountValid || loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.background.primary} />
        ) : (
          <View style={styles.sendButtonContent}>
            <CachedImage source={nuqtaCoinImage} style={styles.sendButtonIcon} />
            <ThemedText style={styles.sendButtonText}>
              Send {numAmount > 0 ? `${numAmount.toLocaleString()} ${BRAND.CURRENCY_CODE}` : ''}
            </ThemedText>
          </View>
        )}
      </Pressable>
    </>
  );

  const renderOtpStep = () => (
    <View style={styles.otpContainer}>
      <View style={styles.otpIconContainer}>
        <Ionicons name="shield-checkmark" size={48} color={Colors.nileBlue} />
      </View>
      <ThemedText style={styles.otpTitle}>Verify Transfer</ThemedText>
      <ThemedText style={styles.otpSubtitle}>
        Enter the 6-digit code sent to your phone to confirm this transfer
      </ThemedText>
      <TextInput
        style={styles.otpInput}
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        placeholder="------"
        placeholderTextColor={Colors.text.tertiary}
        maxLength={6}
        autoFocus
      />
      <Pressable
        style={[styles.sendButton, (!otp || otp.length < 6) && styles.sendButtonDisabled]}
        onPress={handleConfirmOtp}
        disabled={!otp || otp.length < 6 || loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.background.primary} />
        ) : (
          <ThemedText style={styles.sendButtonText}>Verify & Send</ThemedText>
        )}
      </Pressable>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
      </View>
      <ThemedText style={styles.successTitle}>{Number(amount).toLocaleString()} {BRAND.CURRENCY_CODE} Sent!</ThemedText>
      <ThemedText style={styles.successSubtitle}>
        To {selectedRecipient?.name}
      </ThemedText>
      {selectedRecipient?.phone ? (
        <ThemedText style={styles.successPhone}>{selectedRecipient.phone}</ThemedText>
      ) : null}

      <View style={styles.transactionCard}>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Transaction ID</ThemedText>
          <ThemedText style={styles.transactionValue} numberOfLines={1}>
            {transactionId.slice(0, 16)}...
          </ThemedText>
        </View>
        <View style={styles.divider} />
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Amount</ThemedText>
          <View style={styles.transactionAmountRow}>
            <CachedImage source={nuqtaCoinImage} style={styles.transactionCoinIcon} />
            <ThemedText style={styles.transactionValue}>{Number(amount).toLocaleString()} {BRAND.CURRENCY_CODE}</ThemedText>
          </View>
        </View>
        {note ? (
          <>
            <View style={styles.divider} />
            <View style={styles.transactionRow}>
              <ThemedText style={styles.transactionLabel}>Note</ThemedText>
              <ThemedText style={[styles.transactionValue, { flex: 1, textAlign: 'right' }]}>{note}</ThemedText>
            </View>
          </>
        ) : null}
      </View>

      <Pressable
        style={styles.shareButton}
        onPress={async () => {
          try {
            await Share.share({
              message: `I sent ${amount} ${BRAND.CURRENCY_CODE} to ${selectedRecipient?.name}${note ? ` — "${note}"` : ''}. Transaction ID: ${transactionId}`,
            });
          } catch {
            // User cancelled or share failed
          }
        }}
      >
        <Ionicons name="share-outline" size={18} color={Colors.nileBlue} />
        <ThemedText style={styles.shareButtonText}>Share Receipt</ThemedText>
      </Pressable>

      <Pressable style={styles.doneButton} onPress={handleDone}>
        <ThemedText style={styles.doneButtonText}>Done</ThemedText>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

      {/* Header */}
      <LinearGradient
        colors={Gradients.nileBlue}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => step === 'amount' ? setStep('recipient') : step === 'otp' ? setStep('amount') : router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>
            {step === 'success' ? 'Transfer Complete' : step === 'otp' ? 'Verify Transfer' : 'Send Coins'}
          </ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 'recipient' && renderRecipientStep()}
          {step === 'amount' && renderAmountStep()}
          {step === 'otp' && renderOtpStep()}
          {step === 'success' && renderSuccessStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.base,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },
  section: {
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  recipientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  recipientPhone: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  qrButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  selectedRecipient: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  recipientAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarTextLarge: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  selectedName: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  selectedPhone: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  coinImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  balanceValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.subtle,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginRight: Spacing.sm,
  },
  amountInput: {
    ...Typography.display,
    fontWeight: '700',
    color: Colors.text.primary,
    minWidth: 80,
    textAlign: 'center',
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
  },
  quickAmountButtonSelected: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue,
  },
  quickAmountText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  quickAmountTextSelected: {
    color: Colors.text.inverse,
  },
  noteInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 72,
    textAlignVertical: 'top',
    ...Shadows.subtle,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  warningText: {
    ...Typography.bodySmall,
    color: Colors.error,
    flex: 1,
  },
  sendButton: {
    backgroundColor: Colors.nileBlue,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  sendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sendButtonIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  sendButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
  },
  successIconContainer: {
    marginBottom: Spacing.base,
  },
  successTitle: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  successPhone: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xl,
  },
  transactionCard: {
    width: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.subtle,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  transactionAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  transactionCoinIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray[100],
  },
  transactionLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  transactionValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondary[50],
    marginBottom: Spacing.base,
  },
  shareButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  doneButton: {
    width: '100%',
    backgroundColor: Colors.nileBlue,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  doneButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  otpContainer: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
  },
  otpIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  otpTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  otpSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  otpInput: {
    width: '80%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: Spacing.xl,
    ...Shadows.subtle,
  },
});

export default withErrorBoundary(TransferPage, 'WalletTransfer');
