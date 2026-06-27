// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Coin Gift Page
// Gift coins with personalized message — server-driven config

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useAuthUser, useRezBalance, useRefreshWallet } from '@/stores/selectors';
import { useSecurity } from '@/contexts/SecurityContext';
import walletApi from '@/services/walletApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { generateIdempotencyKey } from '@/utils/idempotencyKey';
import { handleWalletError, parseWalletError } from '@/utils/walletErrorHandler';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const nuqtaCoinImage = BRAND.COIN_IMAGE;

// Fallback values used while config is loading or if fetch fails
const FALLBACK_THEMES = [
  { id: 'birthday', emoji: '🎂', label: 'Birthday', colors: ['#FF6B6B', '#FF8E8E'], tags: [] },
  { id: 'christmas', emoji: '🎄', label: 'Christmas', colors: [colors.success, '#27AE60'], tags: [] },
  { id: 'gift', emoji: '🎁', label: 'Gift', colors: ['#9B59B6', '#8E44AD'], tags: [] },
  { id: 'love', emoji: '💝', label: 'Love', colors: ['#E91E63', '#C2185B'], tags: [] },
  { id: 'thanks', emoji: '🙏', label: 'Thanks', colors: ['#00BCD4', '#0097A7'], tags: [] },
  { id: 'congrats', emoji: '🎉', label: 'Congrats', colors: ['#FFC107', '#FFA000'], tags: [] },
];
const FALLBACK_DENOMINATIONS = [100, 500, 1000, 2000];
const FALLBACK_LIMITS = { min: 10, max: 5000, dailyMax: 10000, maxPerDay: 20, otpAbove: 1000 };
const FALLBACK_FEATURES = { scheduledDelivery: false, messageMaxLength: 150 };

interface GiftTheme {
  id: string;
  emoji: string;
  label: string;
  colors: string[];
  tags: string[];
}

interface RecipientInfo {
  exists: boolean;
  name?: string;
  isSelf: boolean;
}

interface SuccessData {
  giftId: string;
  recipientName: string;
  amount: number;
  theme: GiftTheme;
  message?: string;
  newBalance: number;
}

function GiftPage() {
  const router = useRouter();
  const user = useAuthUser();
  const senderName = user?.fullName || user?.phoneNumber || 'You';

  // Server-driven config state
  const [themes, setThemes] = useState<GiftTheme[]>(FALLBACK_THEMES);
  const [denominations, setDenominations] = useState<number[]>(FALLBACK_DENOMINATIONS);
  const [limits, setLimits] = useState(FALLBACK_LIMITS);
  const [features, setFeatures] = useState(FALLBACK_FEATURES);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Form state
  const [selectedTheme, setSelectedTheme] = useState<GiftTheme>(FALLBACK_THEMES[0]);
  const [recipient, setRecipient] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null);
  const [validatingRecipient, setValidatingRecipient] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [deliveryType, setDeliveryType] = useState<'now' | 'scheduled'>('now');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey('gift'));
  const walletBalance = useRezBalance();
  const refreshWallet = useRefreshWallet();
  const { authenticateWithBiometric, biometricAvailable, biometricEnrolled } = useSecurity();
  const submittingRef = useRef(false);
  const validateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const isMounted = useIsMounted();

  // Fetch config on mount (balance comes from WalletContext)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const configRes = await walletApi.getGiftConfig();
        if (configRes.data) {
          if (!isMounted()) return;
          const cfg = configRes.data;
          if (cfg.themes?.length) {
            setThemes(cfg.themes);
            setSelectedTheme(cfg.themes[0]);
          }
          if (cfg.denominations?.length) setDenominations(cfg.denominations);
          if (cfg.limits) setLimits(cfg.limits);
          if (cfg.features) setFeatures(cfg.features);
        }
      } catch {
        // Use fallback config
      } finally {
        if (!isMounted()) return;
        setConfigLoaded(true);
      }
    };
    fetchData();
  }, []);

  // Debounced recipient validation
  const validateRecipientPhone = useCallback((phone: string) => {
    if (validateTimerRef.current) clearTimeout(validateTimerRef.current);
    setRecipientInfo(null);
    setRecipientError('');

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 7) return;

    validateTimerRef.current = setTimeout(async () => {
      setValidatingRecipient(true);
      try {
        const res = await walletApi.validateGiftRecipient(phone);
        if (res.data) {
          if (res.data.isSelf) {
            setRecipientError('You cannot send a gift to yourself');
            setRecipientInfo(null);
          } else if (!res.data.exists) {
            setRecipientError(`User not registered on ${BRAND.APP_NAME}`);
            setRecipientInfo(null);
          } else {
            setRecipientInfo(res.data);
            setRecipientError('');
          }
        }
      } catch {
        // Validation failed — allow sending anyway, backend will re-validate
      } finally {
        if (!isMounted()) return;
        setValidatingRecipient(false);
      }
    }, 600);
  }, []);

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const handleSendGift = async () => {
    if (!recipient.trim() || !amount) return;
    if (submittingRef.current) return;

    const digitsOnly = recipient.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setRecipientError('Please enter a valid phone number');
      return;
    }

    if (recipientInfo?.isSelf) {
      setRecipientError('You cannot send a gift to yourself');
      return;
    }

    const numAmount = Number(amount);
    if (numAmount < limits.min) {
      platformAlertSimple('Invalid Amount', `Minimum gift amount is ${limits.min} ${BRAND.CURRENCY_CODE}.`);
      return;
    }
    if (numAmount > limits.max) {
      platformAlertSimple('Invalid Amount', `Maximum gift amount is ${limits.max} ${BRAND.CURRENCY_CODE}.`);
      return;
    }
    if (numAmount > walletBalance) {
      platformAlertSimple('Insufficient Balance', `You only have ${walletBalance} ${BRAND.CURRENCY_CODE} available.`);
      return;
    }

    // Biometric authentication before gift send
    if (biometricAvailable && biometricEnrolled) {
      const authenticated = await authenticateWithBiometric();
      if (!authenticated) {
        platformAlertSimple('Authentication Required', 'Biometric authentication is required to send gifts.');
        return;
      }
    }

    submittingRef.current = true;
    if (!isMounted()) return;
    setLoading(true);
    try {
      const response = await walletApi.sendGift({
        recipientPhone: recipient,
        amount: Number(amount),
        theme: selectedTheme.id,
        message: message || undefined,
        deliveryType: deliveryType === 'now' ? 'instant' : 'scheduled',
        idempotencyKey,
      });

      if (response.data) {
        // Refresh wallet balance via context FIRST, then regenerate idempotency key
        await refreshWallet();
        const newBalance = response.data.newBalance ?? (walletBalance - Number(amount));
        if (!isMounted()) return;
        setSuccessData({
          giftId: response.data.giftId,
          recipientName: response.data.recipientName || recipientInfo?.name || recipient,
          amount: Number(amount),
          theme: selectedTheme,
          message: message || undefined,
          newBalance,
        });
        // Regenerate AFTER success is confirmed and balance refreshed
        if (!isMounted()) return;
        setIdempotencyKey(generateIdempotencyKey('gift'));
      }
    } catch (error: any) {
      // Only regenerate on non-retriable errors (not network failures)
      if (!isMounted()) return;
      setIdempotencyKey(generateIdempotencyKey('gift'));
      const parsed = parseWalletError(error);
      if (parsed.code === 'REAUTH_REQUIRED') {
        platformAlertSimple('Verification Required', `Gifts above ${limits.otpAbove} ${BRAND.CURRENCY_CODE} require OTP verification.`);
      } else {
        handleWalletError(error, 'Gift Failed');
      }
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // --- Success Screen ---
  if (successData) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />
        <LinearGradient
          colors={[Colors.primary[600], Colors.secondary[700]]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.backButton} />
            <ThemedText style={styles.headerTitle}>Gift Sent</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.successContainer}>
          {/* Animated gift card */}
          <View style={styles.successCardWrapper}>
            <LinearGradient
              colors={successData.theme.colors as any}
              style={styles.successGiftCard}
            >
              <ThemedText style={styles.successEmoji}>{successData.theme.emoji}</ThemedText>
              <View style={styles.successAmountRow}>
                <CachedImage source={nuqtaCoinImage} style={styles.successCoinIcon} />
                <ThemedText style={styles.successAmount}>
                  {successData.amount.toLocaleString()} {BRAND.CURRENCY_CODE}
                </ThemedText>
              </View>
              {successData.message ? (
                <ThemedText style={styles.successMessage}>{successData.message}</ThemedText>
              ) : null}
              <ThemedText style={styles.successFrom}>From {senderName}</ThemedText>
            </LinearGradient>
          </View>

          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={56} color={colors.successScale[400]} />
          </View>
          <ThemedText style={styles.successTitle}>Gift Sent Successfully!</ThemedText>
          <ThemedText style={styles.successSubtitle}>
            To {successData.recipientName}
          </ThemedText>

          {/* Transaction details */}
          <View style={styles.transactionCard}>
            <View style={styles.transactionRow}>
              <ThemedText style={styles.transactionLabel}>Gift ID</ThemedText>
              <ThemedText style={styles.transactionValue} numberOfLines={1}>
                {successData.giftId.slice(0, 16)}...
              </ThemedText>
            </View>
            <View style={styles.divider} />
            <View style={styles.transactionRow}>
              <ThemedText style={styles.transactionLabel}>Amount</ThemedText>
              <View style={styles.transactionAmountRow}>
                <CachedImage source={nuqtaCoinImage} style={styles.transactionCoinIcon} />
                <ThemedText style={styles.transactionValue}>{successData.amount.toLocaleString()} {BRAND.CURRENCY_CODE}</ThemedText>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.transactionRow}>
              <ThemedText style={styles.transactionLabel}>New Balance</ThemedText>
              <ThemedText style={styles.transactionValue}>{successData.newBalance.toLocaleString()} {BRAND.CURRENCY_CODE}</ThemedText>
            </View>
          </View>

          {/* Action buttons */}
          <Pressable
            style={styles.shareButton}
            onPress={async () => {
              try {
                await Share.share({
                  message: `I sent ${successData.amount} ${BRAND.CURRENCY_CODE} to ${successData.recipientName}${successData.message ? ` — "${successData.message}"` : ''} via ${BRAND.APP_NAME}!`,
                });
              } catch {}
            }}
          >
            <Ionicons name="share-outline" size={18} color={Colors.secondary[700]} />
            <ThemedText style={styles.shareButtonText}>Share Receipt</ThemedText>
          </Pressable>

          <Pressable
            style={styles.sendAnotherButton}
            onPress={() => {
              setSuccessData(null);
              setRecipient('');
              setRecipientInfo(null);
              setAmount('');
              setMessage('');
              setShowPreview(false);
            }}
          >
            <Ionicons name="gift-outline" size={18} color={Colors.primary[600]} />
            <ThemedText style={styles.sendAnotherText}>Send Another Gift</ThemedText>
          </Pressable>

          <Pressable style={styles.doneButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <ThemedText style={styles.doneButtonText}>Done</ThemedText>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // --- Gift Form ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Gift Coins</ThemedText>
          <View style={styles.placeholder} />
        </View>
        {/* Balance chip */}
        <View style={styles.balanceChip}>
          <CachedImage source={nuqtaCoinImage} style={styles.balanceCoinIcon} />
          <ThemedText style={styles.balanceChipAmount}>{walletBalance.toLocaleString()} {BRAND.CURRENCY_CODE}</ThemedText>
          <ThemedText style={styles.balanceChipLabel}>available</ThemedText>
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
          {/* Theme Selector */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Choose a gift card design</ThemedText>
            <View style={styles.themesGrid}>
              {themes.map(theme => (
                <Pressable
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    selectedTheme.id === theme.id && styles.themeCardSelected,
                  ]}
                  onPress={() => setSelectedTheme(theme)}
                >
                  <LinearGradient
                    colors={theme.colors as any}
                    style={styles.themeGradient}
                  >
                    <ThemedText style={styles.themeEmoji}>{theme.emoji}</ThemedText>
                  </LinearGradient>
                  <ThemedText style={styles.themeLabel}>{theme.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Recipient */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Recipient Phone Number</ThemedText>
            <View style={[styles.inputContainer, recipientError ? styles.inputContainerError : undefined]}>
              <Ionicons name="call" size={20} color={recipientError ? colors.error : Colors.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor={Colors.text.tertiary}
                value={recipient}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9+\- ]/g, '');
                  setRecipient(cleaned);
                  setRecipientError('');
                  validateRecipientPhone(cleaned);
                }}
                keyboardType="phone-pad"
              />
              {validatingRecipient && (
                <ActivityIndicator size="small" color={Colors.primary[600]} />
              )}
              {recipientInfo?.exists && !recipientInfo.isSelf && (
                <Ionicons name="checkmark-circle" size={20} color={colors.brand.greenDark} />
              )}
            </View>
            {recipientError ? (
              <ThemedText style={styles.errorText}>{recipientError}</ThemedText>
            ) : recipientInfo?.exists && recipientInfo.name ? (
              <ThemedText style={styles.recipientName}>{recipientInfo.name}</ThemedText>
            ) : null}
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Amount</ThemedText>
            <View style={styles.amountContainer}>
              <CachedImage source={nuqtaCoinImage} style={styles.amountCoinIcon} />
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>
            <View style={styles.quickAmounts}>
              {denominations.map(quickAmount => (
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
          </View>

          {/* Personal Message */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Personal Message</ThemedText>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Happy Birthday! 🎉"
              placeholderTextColor={Colors.text.tertiary}
              multiline
              maxLength={features.messageMaxLength}
            />
            <ThemedText style={styles.charCount}>{message.length}/{features.messageMaxLength}</ThemedText>
          </View>

          {/* Delivery Options */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Delivery</ThemedText>
            <View style={styles.deliveryOptions}>
              <Pressable
                style={[
                  styles.deliveryOption,
                  deliveryType === 'now' && styles.deliveryOptionSelected,
                ]}
                onPress={() => setDeliveryType('now')}
              >
                <Ionicons
                  name={deliveryType === 'now' ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={deliveryType === 'now' ? Colors.primary[600] : Colors.text.tertiary}
                />
                <ThemedText style={styles.deliveryOptionText}>Send Now</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.deliveryOption,
                  deliveryType === 'scheduled' && styles.deliveryOptionSelected,
                  !features.scheduledDelivery && styles.deliveryOptionDisabled,
                ]}
                onPress={() => {
                  if (!features.scheduledDelivery) {
                    platformAlertSimple('Coming Soon', 'Scheduled gift delivery will be available soon.');
                    return;
                  }
                  setDeliveryType('scheduled');
                }}
              >
                <Ionicons
                  name={deliveryType === 'scheduled' ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={deliveryType === 'scheduled' ? Colors.primary[600] : Colors.text.tertiary}
                />
                <ThemedText style={[styles.deliveryOptionText, !features.scheduledDelivery && styles.deliveryOptionTextDisabled]}>Schedule</ThemedText>
                <Ionicons name="calendar" size={20} color={Colors.text.tertiary} />
              </Pressable>
            </View>
          </View>

          {/* Preview Card */}
          <Pressable
            style={styles.previewButton}
            onPress={() => setShowPreview(!showPreview)}
          >
            <Ionicons name="eye-outline" size={20} color={Colors.primary[600]} />
            <ThemedText style={styles.previewButtonText}>Preview Gift Card</ThemedText>
          </Pressable>

          {showPreview && (
            <View style={styles.previewCard}>
              <LinearGradient
                colors={selectedTheme.colors as any}
                style={styles.previewGradient}
              >
                <ThemedText style={styles.previewEmoji}>{selectedTheme.emoji}</ThemedText>
                <ThemedText style={styles.previewAmount}>
                  {amount || '0'} {BRAND.CURRENCY_CODE}
                </ThemedText>
                <ThemedText style={styles.previewMessage}>
                  {message || 'Your gift message here...'}
                </ThemedText>
                <ThemedText style={styles.previewFrom}>From {senderName}</ThemedText>
              </LinearGradient>
            </View>
          )}
        </ScrollView>

        {/* Send Button */}
        <View style={styles.buttonContainer}>
          {amount && Number(amount) > walletBalance && (
            <View style={styles.balanceWarning}>
              <Ionicons name="warning" size={14} color={colors.error} />
              <ThemedText style={styles.balanceWarningText}>
                Insufficient balance ({walletBalance} {BRAND.CURRENCY_CODE} available)
              </ThemedText>
            </View>
          )}
          <Pressable
            style={[
              styles.sendButton,
              (!recipient || !amount || Number(amount) > walletBalance) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendGift}
            disabled={!recipient || !amount || Number(amount) > walletBalance || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background.primary} />
            ) : (
              <>
                <Ionicons name="gift" size={20} color={colors.background.primary} />
                <ThemedText style={styles.sendButtonText}>Send Gift</ThemedText>
              </>
            )}
          </Pressable>
        </View>
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
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  balanceChipLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  balanceChipAmount: {
    ...Typography.label,
    color: colors.background.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 100,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  themeCard: {
    width: '30%',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.subtle,
  },
  themeCardSelected: {
    borderColor: Colors.primary[600],
  },
  themeGradient: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  themeEmoji: {
    fontSize: 28,
  },
  themeLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.subtle,
  },
  inputContainerError: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    ...Typography.caption,
    color: colors.error,
    marginTop: Spacing.xs,
  },
  recipientName: {
    ...Typography.caption,
    color: colors.brand.greenDark,
    marginTop: Spacing.xs,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  amountCoinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  amountInput: {
    ...Typography.priceLarge,
    color: Colors.text.primary,
    minWidth: 100,
    textAlign: 'center',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickAmountButton: {
    minWidth: '22%',
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  quickAmountButtonSelected: {
    backgroundColor: Colors.primary[600],
  },
  quickAmountText: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  quickAmountTextSelected: {
    color: colors.background.primary,
  },
  messageInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
    ...Shadows.subtle,
  },
  charCount: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  deliveryOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  deliveryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.sm,
    ...Shadows.subtle,
  },
  deliveryOptionSelected: {
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  deliveryOptionDisabled: {
    opacity: 0.6,
  },
  deliveryOptionText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
  },
  deliveryOptionTextDisabled: {
    color: Colors.text.tertiary,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  previewButtonText: {
    ...Typography.button,
    color: Colors.primary[600],
  },
  previewCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  previewGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  previewEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  previewAmount: {
    ...Typography.h2,
    color: colors.background.primary,
    marginBottom: Spacing.sm,
  },
  previewMessage: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  previewFrom: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? Spacing['2xl'] : Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  balanceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  balanceWarningText: {
    ...Typography.caption,
    color: colors.error,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  sendButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
  // Balance coin icon
  balanceCoinIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  // Success screen
  successContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    paddingBottom: Spacing['3xl'],
  },
  successCardWrapper: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadows.medium,
  },
  successGiftCard: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  successAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  successCoinIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  successAmount: {
    ...Typography.h2,
    color: colors.background.primary,
  },
  successMessage: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successFrom: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  successIconContainer: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  successSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.xl,
  },
  transactionCard: {
    width: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    ...Shadows.subtle,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  transactionLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  transactionValue: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  transactionAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  transactionCoinIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.secondary[700],
    marginBottom: Spacing.md,
    width: '100%',
  },
  shareButtonText: {
    ...Typography.button,
    color: Colors.secondary[700],
  },
  sendAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  sendAnotherText: {
    ...Typography.button,
    color: Colors.primary[600],
  },
  doneButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    width: '100%',
  },
  doneButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
});

export default withErrorBoundary(GiftPage, 'WalletGift');
