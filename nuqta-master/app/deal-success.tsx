// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Deal Success Page - Handles Stripe deep link redirect after payment
 * Route: /deal-success?session_id=xxx&campaignId=xxx&dealIndex=xxx
 *
 * This page is used when:
 * 1. User completes Stripe payment in external browser and is redirected back
 * 2. App is opened via deep link with Stripe session info
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming } from 'react-native-reanimated';
import { DetailPageSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { ThemedText } from '@/components/ThemedText';
import apiClient from '@/services/apiClient';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
const { width: screenWidth } = Dimensions.get('window');

function DealSuccessPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  // Support multiple param naming conventions
  const params = useLocalSearchParams<{
    session_id?: string;
    sessionId?: string;
    campaignId?: string;
    dealIndex?: string;
    redemptionId?: string;
  }>();

  const sessionId = params.session_id || params.sessionId;
  const campaignId = params.campaignId;
  const dealIndex = params.dealIndex;
  const redemptionId = params.redemptionId;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redemptionCode, setRedemptionCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);
  const [purchaseCurrency, setPurchaseCurrency] = useState<string>('USD');
  const [dealStore, setDealStore] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Animation
  const scaleAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(0);
  const scaleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));
  const fadeAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (sessionId) {
      verifyPayment();
    } else {
      setError('Missing payment session information');
      setIsLoading(false);
    }
  }, [sessionId, isAuthenticated, authLoading]);

  const verifyPayment = async (retryCount = 0): Promise<void> => {
    const maxRetries = 3;
    const baseDelay = 2000;

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.post<{
        success: boolean;
        redemption?: {
          id: string;
          code: string;
          status: string;
          expiresAt: string;
          dealSnapshot?: {
            store?: string;
            image?: string;
          };
          campaignSnapshot?: {
            title?: string;
          };
          purchaseAmount?: number;
          purchaseCurrency?: string;
        };
        message: string;
      }>('/campaigns/deals/verify-payment', {
        sessionId,
        redemptionId });

      if (response.success && response.data?.redemption) {
        const redemption = response.data.redemption;
        if (!isMounted()) return;
        setRedemptionCode(redemption.code);
        if (!isMounted()) return;
        setExpiresAt(redemption.expiresAt);
        if (!isMounted()) return;
        setPurchaseAmount(redemption.purchaseAmount || 0);
        if (!isMounted()) return;
        setPurchaseCurrency(redemption.purchaseCurrency || 'USD');
        if (!isMounted()) return;
        setDealStore(redemption.dealSnapshot?.store || redemption.campaignSnapshot?.title || 'Deal');

        // Animate success
        scaleAnim.value = withSpring(1, { damping: 7, stiffness: 50 });
        fadeAnim.value = withTiming(1, { duration: 300 });
      } else if (retryCount < maxRetries) {
        // Payment might still be processing, retry
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, retryCount)));
        return verifyPayment(retryCount + 1);
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Payment verification failed. Please check My Deals.');
      }
    } catch (err: any) {

      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, retryCount)));
        return verifyPayment(retryCount + 1);
      }

      if (!isMounted()) return;
      setError(err.message || 'Failed to verify payment. Please check My Deals.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(redemptionCode);
    if (!isMounted()) return;
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric' });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailPageSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={64} color={Colors.warning} />
          </View>
          <ThemedText style={styles.errorTitle}>Verification Pending</ThemedText>
          <ThemedText style={styles.errorMessage}>{error}</ThemedText>
          <ThemedText style={styles.errorHint}>
            If you completed the payment, your deal should appear in My Deals shortly.
          </ThemedText>
          <Pressable style={styles.primaryBtn} onPress={() => verifyPayment()}>
            <LinearGradient
              colors={[Colors.warning, colors.warningScale[700]]}
              style={styles.primaryBtnGradient}
            >
              <ThemedText style={styles.primaryBtnText}>Try Again</ThemedText>
            </LinearGradient>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.replace('/my-deals' as any)}>
            <ThemedText style={styles.secondaryBtnText}>Check My Deals</ThemedText>
          </Pressable>
          <Pressable style={styles.backLink} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <ThemedText style={styles.backLinkText}>Go Back</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Success Animation */}
      <View style={styles.content}>
        <Animated.View style={[styles.successIcon, scaleAnimStyle]}>
          <LinearGradient
            colors={[Colors.success, colors.brand.greenDark]}
            style={styles.successGradient}
          >
            <Ionicons name="checkmark" size={48} color={Colors.background.primary} />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.textContainer, fadeAnimStyle]}>
          <ThemedText style={styles.successTitle}>Purchase Successful!</ThemedText>
          <ThemedText style={styles.successSubtitle}>
            {dealStore} deal purchased for {getCurrencySymbol(purchaseCurrency)}{purchaseAmount}
          </ThemedText>
        </Animated.View>

        {/* Redemption Code Card */}
        <Animated.View style={[styles.codeCard, fadeAnimStyle]}>
          <ThemedText style={styles.codeLabel}>Your Redemption Code</ThemedText>
          <View style={styles.codeContainer}>
            <ThemedText style={styles.codeText}>{redemptionCode}</ThemedText>
            <Pressable style={styles.copyButton} onPress={handleCopyCode}>
              <Ionicons
                name={copiedCode ? 'checkmark' : 'copy-outline'}
                size={20}
                color={copiedCode ? Colors.success : Colors.nileBlue}
              />
            </Pressable>
          </View>
          {copiedCode && (
            <ThemedText style={styles.copiedText}>Copied!</ThemedText>
          )}
          {expiresAt && (
            <View style={styles.expiryRow}>
              <Ionicons name="time-outline" size={16} color={Colors.neutral[500]} />
              <ThemedText style={styles.expiryText}>
                Valid until {formatDate(expiresAt)}
              </ThemedText>
            </View>
          )}
        </Animated.View>

        {/* Info Box */}
        <Animated.View style={[styles.infoBox, fadeAnimStyle]}>
          <Ionicons name="information-circle" size={20} color={colors.warningScale[700]} />
          <ThemedText style={styles.infoText}>
            Show this code at the store to redeem your deal. You can also find it in "My Deals".
          </ThemedText>
        </Animated.View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace('/my-deals' as any)}
        >
          <LinearGradient
            colors={[Colors.warning, colors.warningScale[700]]}
            style={styles.primaryButtonGradient}
          >
            <ThemedText style={styles.primaryButtonText}>View My Deals</ThemedText>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.replace('/' as any)}
        >
          <ThemedText style={styles.secondaryButtonText}>Back to Home</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginTop: Spacing.sm },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.neutral[500] },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl },
  errorIcon: {
    marginBottom: Spacing.base },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm },
  errorMessage: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: Spacing.sm },
  errorHint: {
    fontSize: 13,
    color: Colors.neutral[400],
    textAlign: 'center',
    marginBottom: Spacing.xl },
  primaryBtn: {
    width: '100%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md },
  primaryBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center' },
  primaryBtnText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    fontSize: 16 },
  secondaryBtn: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm },
  secondaryBtnText: {
    color: colors.warningScale[700],
    fontWeight: '600',
    fontSize: 14 },
  backLink: {
    paddingVertical: Spacing.md },
  backLinkText: {
    color: Colors.neutral[500],
    fontSize: 14 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl },
  successIcon: {
    marginBottom: Spacing.xl },
  successGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center' },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'] },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm },
  successSubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center' },
  codeCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: Spacing.base },
  codeLabel: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1 },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm },
  codeText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.nileBlue,
    letterSpacing: 2 },
  copyButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.sm },
  copiedText: {
    fontSize: 12,
    color: Colors.success,
    marginBottom: Spacing.sm },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm },
  expiryText: {
    fontSize: 13,
    color: Colors.neutral[500] },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.warning + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    width: '100%' },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.neutral[500],
    lineHeight: 18 },
  bottomButtons: {
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  primaryButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md },
  primaryButtonGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center' },
  primaryButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700' },
  secondaryButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center' },
  secondaryButtonText: {
    color: Colors.neutral[500],
    fontSize: 14 } });

export default withErrorBoundary(DealSuccessPage, 'DealSuccess');
