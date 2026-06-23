import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Flash Sale Success Page
// Shows voucher code after successful Stripe payment

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming } from 'react-native-reanimated';
import { DetailPageSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { ThemedText } from '@/components/ThemedText';
import realOffersApi from '@/services/realOffersApi';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import logger from '@/utils/logger';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth } = Dimensions.get('window');

function FlashSaleSuccessPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const currencySymbol = getCurrencySymbol();
  const { purchaseId, session_id } = useLocalSearchParams<{
    purchaseId?: string;
    session_id?: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string | undefined>();
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
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
    if (purchaseId && session_id) {
      verifyPayment();
    } else {
      setError('Missing payment information');
      setIsLoading(false);
    }
  }, [purchaseId, session_id, isAuthenticated, authLoading]);

  const verifyPayment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await realOffersApi.verifyFlashSalePayment({
        purchaseId: purchaseId!,
        stripeSessionId: session_id! });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setVoucherCode(response.data.voucherCode);
        if (!isMounted()) return;
        setPromoCode(response.data.promoCode);
        if (!isMounted()) return;
        setExpiresAt(response.data.expiresAt);
        if (!isMounted()) return;
        setAmount(response.data.amount);

        // Animate success
        scaleAnim.value = withSpring(1, { damping: 7, stiffness: 50 });
        fadeAnim.value = withTiming(1, { duration: 300 });
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Payment verification failed');
      }
    } catch (err: any) {
      logger.error('Error verifying payment:', err);
      if (!isMounted()) return;
      setError(err.message || 'Failed to verify payment');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    if (!isMounted()) return;
    setCopiedCode(true);
    if (!isMounted()) return;
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailPageSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={80} color={Colors.error} />
          </View>
          <ThemedText style={styles.errorTitle}>Payment Verification Failed</ThemedText>
          <ThemedText style={styles.errorMessage}>{error}</ThemedText>
          <Pressable
            style={styles.retryButton}
            onPress={() => router.replace('/offers')}
          >
            <ThemedText style={styles.retryButtonText}>Back to Offers</ThemedText>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[colors.successScale[400], colors.successScale[700]]}
        style={styles.successGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Success Icon */}
          <Animated.View
            style={[
              styles.successIconContainer,
              scaleAnimStyle,
            ]}
          >
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={60} color={Colors.success} />
            </View>
          </Animated.View>

          {/* Success Message */}
          <Animated.View style={[styles.contentContainer, fadeAnimStyle]}>
            <ThemedText style={styles.successTitle}>Payment Successful!</ThemedText>
            <ThemedText style={styles.successSubtitle}>
              Your deal has been claimed
            </ThemedText>

            {/* Amount Paid */}
            <View style={styles.amountCard}>
              <ThemedText style={styles.amountLabel}>Amount Paid</ThemedText>
              <ThemedText style={styles.amountValue}>{currencySymbol}{amount}</ThemedText>
            </View>

            {/* Voucher Code Card */}
            <View style={styles.voucherCard}>
              <View style={styles.voucherHeader}>
                <Ionicons name="ticket" size={24} color={Colors.brand.purple} />
                <ThemedText style={styles.voucherLabel}>Your Voucher Code</ThemedText>
              </View>
              <Pressable
                style={styles.voucherCodeBox}
                onPress={() => handleCopyCode(voucherCode)}
               
              >
                <ThemedText style={styles.voucherCode}>{voucherCode}</ThemedText>
                <View style={styles.copyIcon}>
                  <Ionicons
                    name={copiedCode ? "checkmark" : "copy"}
                    size={20}
                    color={Colors.brand.purple}
                  />
                </View>
              </Pressable>
              {copiedCode && (
                <ThemedText style={styles.copiedText}>Copied to clipboard!</ThemedText>
              )}

              {/* Promo Code (if exists) */}
              {promoCode && (
                <View style={styles.promoCodeSection}>
                  <ThemedText style={styles.promoLabel}>Promo Code</ThemedText>
                  <Pressable
                    style={styles.promoCodeBox}
                    onPress={() => handleCopyCode(promoCode)}
                   
                  >
                    <ThemedText style={styles.promoCode}>{promoCode}</ThemedText>
                    <Ionicons name="copy-outline" size={18} color={Colors.text.tertiary} />
                  </Pressable>
                </View>
              )}

              {/* Expiry Date */}
              <View style={styles.expirySection}>
                <Ionicons name="calendar-outline" size={18} color={Colors.text.tertiary} />
                <ThemedText style={styles.expiryText}>
                  Valid until {formatDate(expiresAt)}
                </ThemedText>
              </View>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <ThemedText style={styles.instructionsTitle}>How to use</ThemedText>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <ThemedText style={styles.instructionNumberText}>1</ThemedText>
                </View>
                <ThemedText style={styles.instructionText}>
                  Visit the store and show this voucher code
                </ThemedText>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <ThemedText style={styles.instructionNumberText}>2</ThemedText>
                </View>
                <ThemedText style={styles.instructionText}>
                  The store will verify and apply your discount
                </ThemedText>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <ThemedText style={styles.instructionNumberText}>3</ThemedText>
                </View>
                <ThemedText style={styles.instructionText}>
                  Enjoy your deal before it expires!
                </ThemedText>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.replace('/offers')}
              >
                <LinearGradient
                  colors={[colors.brand.purpleLight, colors.brand.purple]}
                  style={styles.primaryButtonGradient}
                >
                  <ThemedText style={styles.primaryButtonText}>
                    Browse More Deals
                  </ThemedText>
                </LinearGradient>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.push('/my-vouchers' as any)}
              >
                <ThemedText style={styles.secondaryButtonText}>
                  View My Vouchers
                </ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center' },
  loadingText: {
    color: Colors.text.inverse,
    ...Typography.h4,
    marginTop: Spacing.base },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background.secondary },
  errorIcon: {
    marginBottom: Spacing.xl },
  errorTitle: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textAlign: 'center' },
  errorMessage: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'] },
  retryButton: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    borderRadius: BorderRadius.md },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600' },
  successGradient: {
    flex: 1 },
  safeArea: {
    flex: 1,
    padding: Spacing.xl },
  successIconContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8 },
  contentContainer: {
    flex: 1 },
  successTitle: {
    ...Typography.h1,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing.sm },
  successSubtitle: {
    ...Typography.bodyLarge,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: Spacing.xl },
  amountCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    marginBottom: Spacing.lg },
  amountLabel: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.xs },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text.inverse },
  voucherCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8 },
  voucherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base },
  voucherLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginLeft: Spacing.sm },
  voucherCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.tint.amberLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: colors.warningScale[400],
    borderStyle: 'dashed' },
  voucherCode: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: colors.brand.amberDark,
    letterSpacing: 2 },
  copyIcon: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm },
  copiedText: {
    ...Typography.bodySmall,
    color: Colors.success,
    textAlign: 'center',
    marginTop: Spacing.sm },
  promoCodeSection: {
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default },
  promoLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm },
  promoCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md },
  promoCode: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.secondary },
  expirySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.base },
  expiryText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginLeft: Spacing.sm },
  instructionsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.xl },
  instructionsTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
    marginBottom: Spacing.md },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md },
  instructionNumberText: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
    color: Colors.success },
  instructionText: {
    flex: 1,
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)' },
  buttonContainer: {
    marginTop: 'auto' },
  primaryButton: {
    marginBottom: Spacing.md },
  primaryButtonGradient: {
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center' },
  primaryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600' },
  secondaryButton: {
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: BorderRadius.md,
    padding: 14,
    alignItems: 'center' },
  secondaryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600' } });

export default withErrorBoundary(FlashSaleSuccessPage, 'FlashSaleSuccess');
