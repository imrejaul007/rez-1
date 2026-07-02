// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Deal Payment Page - Handles Stripe payment for paid deals
 * Route: /deal-payment
 * Uses Stripe Checkout via WebView for secure payment processing
 */

import React, { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthUser, useIsAuthenticated, useGetCurrencySymbol } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import walletApi from '@/services/walletApi';
import { getCurrencySymbol } from '@/config/payment';
import { showToast } from '@/components/common/ToastManager';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { BRAND } from '@/constants/brand';
const DealPaymentPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const webViewRef = useRef<WebView>(null);

  // Stripe checkout URL from navigation params
  const checkoutUrl = params.checkoutUrl as string;
  const sessionId = params.sessionId as string;
  const amount = parseFloat(params.amount as string) || 0;
  const currency = (params.currency as string) || 'INR';
  const campaignId = params.campaignId as string;
  const campaignSlug = params.campaignSlug as string;
  const dealIndex = parseInt(params.dealIndex as string, 10);
  const dealStore = params.dealStore as string;
  const dealImage = params.dealImage as string;
  const redemptionId = params.redemptionId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Load wallet balance
  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoadingWallet(true);
    walletApi.getBalance().then(res => {
      if (res.success && res.data) {
        const balance = res.data.balance?.total ?? res.data.balance ?? 0;
        setWalletBalance(typeof balance === 'number' ? balance : 0);
      }
    }).catch(() => {}).finally(() => setIsLoadingWallet(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!checkoutUrl || !sessionId) {
      setInlineError('Invalid payment details. Please try again.');
      setTimeout(() => {
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
      }, 2000);
    }
  }, []);

  const handleStartPayment = () => {
    setShowWebView(true);
    setPaymentStatus('processing');
  };

  // Handle WebView navigation state changes to detect success/cancel
  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;

    // Don't process Stripe's own checkout URLs
    if (url.includes('checkout.stripe.com')) {
      return;
    }

    // Check for success URL (payment completed)
    // Stripe adds session_id to success URLs, use that as primary indicator
    // Also check for our specific payment-success route
    const isSuccessUrl =
      (url.includes('payment-success') && url.includes('session_id=')) ||
      (url.includes('payment-success') && url.includes('campaignId=')) ||
      (url.includes('rez.app') && url.includes('/success'));

    if (isSuccessUrl) {
      setShowWebView(false);
      setPaymentStatus('processing');
      await verifyPayment();
      return;
    }

    // Check for cancel URL (user cancelled)
    // Be specific to avoid false matches on Stripe's internal pages
    const isCancelUrl =
      (url.includes('payment-cancel') && url.includes('campaignId=')) ||
      (url.includes('rez.app') && url.includes('/cancel'));

    if (isCancelUrl) {
      if (!isMounted()) return;
      setShowWebView(false);
      if (!isMounted()) return;
      setPaymentStatus('failed');
      showToast({ message: 'Payment cancelled', type: 'info', duration: 3000 });
      setTimeout(() => setPaymentStatus('pending'), 500);
    }
  };

  // Verify payment with backend (with retry logic)
  const verifyPayment = async (retryCount = 0): Promise<void> => {
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds

    try {

      const verifyResponse = await apiClient.post<{
        success: boolean;
        redemption?: {
          id: string;
          code: string;
          status: string;
          expiresAt: string;
          dealSnapshot: any;
          campaignSnapshot: any;
          purchaseAmount?: number;
          purchaseCurrency?: string;
        };
        message: string;
      }>('/campaigns/deals/verify-payment', {
        sessionId,
        redemptionId,
      });

      if (verifyResponse.success && verifyResponse.data?.redemption) {
        if (!isMounted()) return;
        setPaymentStatus('success');
        // Haptic feedback on successful deal payment
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        const redemptionCode = verifyResponse.data.redemption.code;

        showToast({ message: `Deal purchased! Code: ${redemptionCode}`, type: 'success', duration: 4000 });
        setTimeout(() => router.replace('/my-deals' as any), 1500);
      } else if (retryCount < maxRetries) {
        // Payment might still be processing, retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, retryCount)));
        return verifyPayment(retryCount + 1);
      } else {
        // Max retries reached, show pending message
        if (!isMounted()) return;
        setPaymentStatus('pending');
        showToast({ message: 'Payment is being processed. Check "My Deals" shortly.', type: 'warning', duration: 5000 });
      }
    } catch (error: any) {

      // Retry on network errors
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, retryCount)));
        return verifyPayment(retryCount + 1);
      }

      if (!isMounted()) return;
      setPaymentStatus('failed');
      showToast({ message: 'Could not verify payment. Check "My Deals" or contact support.', type: 'error', duration: 5000 });
    }
  };

  // Retry payment verification
  const handleRetryVerification = () => {
    setPaymentStatus('pending');
    verifyPayment();
  };

  // Render WebView for Stripe Checkout
  if (showWebView && checkoutUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.webViewHeader}>
          <Pressable
            style={styles.closeBtn}
            onPress={() => {
              platformAlertDestructive(
                'Cancel Payment?',
                'Are you sure you want to cancel this payment?',
                'Yes, Cancel',
                () => {
                  setShowWebView(false);
                  setPaymentStatus('pending');
                }
              );
            }}
          >
            <Ionicons name="close" size={24} color={Colors.nileBlue} />
          </Pressable>
          <Text style={styles.webViewTitle}>Secure Payment</Text>
          <View style={styles.closeBtn} />
        </View>
        <WebView
          ref={webViewRef}
          source={checkoutUrl}
          style={styles.webView}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color={Colors.warning} />
              <Text style={styles.loadingText}>Loading secure checkout...</Text>
            </View>
          )}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          androidLayerType="hardware"
        />
      </View>
    );
  }

  // Render payment summary and CTA
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
        </Pressable>
        <Text style={styles.headerTitle}>Complete Purchase</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Deal Preview */}
      <View style={styles.dealCard}>
        {dealImage ? (
          <CachedImage source={dealImage} style={styles.dealImage} contentFit="cover" />
        ) : (
          <View style={[styles.dealImage, styles.placeholderImage]}>
            <Ionicons name="pricetag" size={40} color={Colors.neutral[400]} />
          </View>
        )}
        <View style={styles.dealInfo}>
          <Text style={styles.dealStore}>{dealStore || 'Premium Deal'}</Text>
          <Text style={styles.dealLabel}>Campaign Deal</Text>
        </View>
      </View>

      {/* Inline Error Display */}
      {inlineError && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={20} color={Colors.error} />
          <Text style={styles.errorText}>{inlineError}</Text>
        </View>
      )}

      {/* Payment Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Payment Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Deal Price</Text>
          <Text style={styles.summaryValue}>{currencySymbol}{amount.toLocaleString()}</Text>
        </View>
        {/* Rewards Preview - HIGH: Add cashback preview */}
        <View style={styles.rewardsPreview}>
          <View style={styles.rewardsIconContainer}>
            <Ionicons name="gift" size={16} color={colors.warningScale[700]} />
          </View>
          <View style={styles.rewardsInfo}>
            <Text style={styles.rewardsLabel}>Earn Cashback</Text>
            <Text style={styles.rewardsSubtext}>5-15% back in wallet</Text>
          </View>
          <View style={styles.rewardsBadge}>
            <Text style={styles.rewardsAmount}>+{currencySymbol}{Math.floor(amount * 0.1)}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{currencySymbol}{amount.toLocaleString()}</Text>
        </View>
      </View>

      {/* Wallet Balance - MEDIUM: Add wallet balance */}
      {walletBalance !== null && (
        <Pressable style={styles.walletCard} onPress={() => router.push('/wallet-screen' as any)}>
          <View style={styles.walletRow}>
            <View style={styles.walletIconContainer}>
              <Ionicons name="wallet" size={18} color={Colors.nileBlue} />
            </View>
            <View style={styles.walletInfo}>
              <Text style={styles.walletLabel}>{BRAND.COIN_NAME} Balance</Text>
              {isLoadingWallet ? (
                <ActivityIndicator size="small" color={Colors.nileBlue} />
              ) : (
                <Text style={styles.walletBalance}>{currencySymbol}{walletBalance.toLocaleString()}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
          </View>
        </Pressable>
      )}

      {/* Payment Methods Info */}
      <View style={styles.paymentMethods}>
        <Text style={styles.methodsTitle}>Secure Payment via Stripe</Text>
        <View style={styles.methodsRow}>
          <View style={styles.methodIcon}>
            <Ionicons name="card" size={20} color={Colors.nileBlue} />
          </View>
          <View style={styles.methodIcon}>
            <Ionicons name="logo-apple" size={20} color={Colors.nileBlue} />
          </View>
          <View style={styles.methodIcon}>
            <Ionicons name="logo-google" size={20} color={Colors.nileBlue} />
          </View>
        </View>
        <Text style={styles.methodsSubtext}>Cards, Apple Pay, Google Pay & more</Text>
      </View>

      {/* CTA Button */}
      <View style={styles.ctaContainer}>
        {paymentStatus === 'processing' ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={Colors.warning} />
            <Text style={styles.processingText}>Processing payment...</Text>
          </View>
        ) : paymentStatus === 'failed' ? (
          <>
            <Pressable style={styles.retryButton} onPress={handleRetryVerification}>
              <Ionicons name="refresh" size={20} color={Colors.background.primary} />
              <Text style={styles.retryButtonText}>Retry Verification</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => router.replace('/(tabs)' as any)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={styles.payButton}
              onPress={handleStartPayment}
            >
              <LinearGradient
                colors={[Colors.warning, colors.warningScale[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.payButtonGradient}
              >
                <Ionicons name="lock-closed" size={20} color={Colors.background.primary} />
                <Text style={styles.payButtonText}>
                  Pay {currencySymbol}{amount.toLocaleString()}
                </Text>
              </LinearGradient>
            </Pressable>

            <Text style={styles.secureText}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.success} /> Secure Payment by Stripe
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: Spacing.base,
    paddingBottom: 16,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  dealCard: {
    margin: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dealImage: {
    width: '100%',
    height: 160,
  },
  placeholderImage: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealInfo: {
    padding: Spacing.base,
  },
  dealStore: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.xs,
  },
  dealLabel: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  summaryCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutral[100],
    marginVertical: Spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.warningScale[700],
  },
  paymentMethods: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    alignItems: 'center',
  },
  methodsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginBottom: Spacing.md,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodsSubtext: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  ctaContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 16,
    right: 16,
  },
  payButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: Spacing.md,
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: 10,
  },
  payButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  secureText: {
    fontSize: 12,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  processingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.neutral[500],
  },
  // Error card
  errorCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: Colors.errorScale[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.errorScale[200],
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.error,
  },
  // Rewards preview
  rewardsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  rewardsIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.warningScale[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  rewardsInfo: {
    flex: 1,
  },
  rewardsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  rewardsSubtext: {
    fontSize: 11,
    color: Colors.neutral[500],
  },
  rewardsBadge: {
    backgroundColor: colors.successScale[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  rewardsAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warningScale[700],
  },
  // Wallet card
  walletCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: colors.nileBlue + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: colors.nileBlue + '30',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  walletInfo: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  // Retry button
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.warning,
    borderRadius: 14,
    paddingVertical: Spacing.base,
    marginBottom: Spacing.sm,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background.primary,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  // WebView styles
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: Spacing.base,
    paddingBottom: 12,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.neutral[500],
  },
});

export default withErrorBoundary(DealPaymentPage, 'DealPayment');
