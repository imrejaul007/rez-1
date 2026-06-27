// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Flash Sale Detail Page
// Dynamic route for individual flash sale (Lightning Deal) details

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Share,
  Modal
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { ThemedText } from '@/components/ThemedText';
import realOffersApi from '@/services/realOffersApi';
import { useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import logger from '@/utils/logger';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth } = Dimensions.get('window');

interface FlashSale {
  _id: string;
  title: string;
  description: string;
  image: string;
  banner?: string;
  discountPercentage: number;
  originalPrice?: number;
  flashSalePrice?: number;
  startTime: string;
  endTime: string;
  maxQuantity: number;
  soldQuantity: number;
  limitPerUser: number;
  stores?: Array<{
    _id: string;
    name: string;
    logo?: string;
    location?: any;
  }>;
  promoCode?: string;
  termsAndConditions?: string[];
  minimumPurchase?: number;
  maximumDiscount?: number;
  status: 'scheduled' | 'active' | 'ending_soon' | 'ended' | 'sold_out';
  viewCount: number;
  clickCount: number;
  purchaseCount: number;
}

function FlashSaleDetailPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [flashSale, setFlashSale] = useState<FlashSale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const pulseAnim = useSharedValue(1);
  const pulseAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  // Pulse animation for urgency
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1
    );
    return () => { pulseAnim.value = 1; };
  }, []);

  useEffect(() => {
    loadFlashSaleDetails(id as string);
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (!flashSale) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const endTime = new Date(flashSale.endTime).getTime();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [flashSale]);

  const loadFlashSaleDetails = async (flashSaleId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await realOffersApi.getFlashSaleById(flashSaleId);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setFlashSale(response.data);
        if (!isMounted()) return;
        setImageError(false);
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Failed to load flash sale details');
      }
    } catch (error) {
      logger.error('Error loading flash sale details:', error);
      if (!isMounted()) return;
      setError('Failed to load flash sale details');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!flashSale?.promoCode) return;

    await Clipboard.setStringAsync(flashSale.promoCode);
    if (!isMounted()) return;
    setCopiedCode(true);
    if (!isMounted()) return;
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleGetOffer = async () => {
    if (!isAuthenticated) {
      platformAlertConfirm(
        'Sign In Required',
        'Please sign in to get this offer',
        () => router.push('/sign-in'),
        'Sign In'
      );
      return;
    }

    if (!flashSale) return;

    try {
      setIsProcessingPayment(true);

      // Get current URL for success/cancel redirects
      // - Web: use the actual origin (works correctly for browser-based Stripe checkout)
      // - Native: use the deep link scheme from env (configurable per deployment)
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME
            ? `${process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME}://`
            : 'rezapp://');

      // Initiate Stripe checkout
      const response = await realOffersApi.initiateFlashSalePurchase(
        flashSale._id,
        1,
        {
          successUrl: `${baseUrl}/flash-sale-success?purchaseId={purchaseId}`,
          cancelUrl: `${baseUrl}/flash-sales/${flashSale._id}?cancelled=true` }
      );

      if (response.success && response.data?.stripeCheckoutUrl) {
        // Redirect to Stripe Checkout
        if (typeof window !== 'undefined' && window.location) {
          // Web: Direct redirect
          window.location.href = response.data.stripeCheckoutUrl;
        } else {
          // Native: Use WebBrowser for in-app browser experience
          const result = await WebBrowser.openBrowserAsync(response.data.stripeCheckoutUrl, {
            dismissButtonStyle: 'cancel',
            showTitle: true,
            enableBarCollapsing: true });

          // If user dismissed or completed, check if we should navigate to success
          if (result.type === 'cancel' || result.type === 'dismiss') {
            // User cancelled - they might have completed payment or cancelled
            // Optionally redirect to check purchases or show message
            logger.info('WebBrowser closed with result:', result.type);
          }
        }
      } else {
        throw new Error(response.message || 'Failed to initiate payment');
      }
    } catch (error: any) {
      logger.error('Error initiating flash sale purchase:', error);
      platformAlertSimple(
        'Error',
        error.message || 'Failed to initiate payment. Please try again.'
      );
    } finally {
      if (!isMounted()) return;
      setIsProcessingPayment(false);
    }
  };

  const handleShare = async () => {
    if (!flashSale) return;

    try {
      await Share.share({
        message: `🔥 Flash Deal Alert!\n\n${flashSale.title}\n\n${flashSale.discountPercentage}% OFF - Only ${flashSale.maxQuantity - flashSale.soldQuantity} left!\n\nUse code: ${flashSale.promoCode || 'No code needed'}`,
        title: flashSale.title });
    } catch (error) {
      logger.error('Error sharing flash sale:', error);
    }
  };

  const handleStorePress = () => {
    if (flashSale?.stores?.[0]?._id) {
      router.push(`/MainStorePage?storeId=${flashSale.stores[0]._id}` as any);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return [colors.error, colors.error];
    if (percentage >= 50) return [colors.warningScale[400], colors.warningScale[700]];
    return [colors.successScale[400], colors.successScale[700]];
  };

  const getUrgencyText = (percentage: number) => {
    if (percentage >= 80) return { text: 'Almost Gone!', emoji: '🔥' };
    if (percentage >= 50) return { text: 'Selling Fast!', emoji: '⚡' };
    return { text: 'In Stock', emoji: '✓' };
  };

  const stockPercentage = flashSale
    ? (flashSale.soldQuantity / flashSale.maxQuantity) * 100
    : 0;
  const remainingStock = flashSale
    ? flashSale.maxQuantity - flashSale.soldQuantity
    : 0;
  const isEnded = flashSale?.status === 'ended' || flashSale?.status === 'sold_out' ||
    (timeRemaining.hours === 0 && timeRemaining.minutes === 0 && timeRemaining.seconds === 0);
  const urgency = getUrgencyText(stockPercentage);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <CardGridSkeleton />
        </View>
      </>
    );
  }

  if (error || !flashSale) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <SafeAreaView style={styles.errorSafeArea}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.errorBackButton}>
              <Ionicons name="chevron-back" size={28} color={colors.darkGray} />
            </Pressable>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={80} color={Colors.error} />
              <ThemedText style={styles.errorTitle}>Oops!</ThemedText>
              <ThemedText style={styles.errorText}>{error || 'Flash sale not found'}</ThemedText>
              <Pressable style={styles.retryButton} onPress={() => loadFlashSaleDetails(id as string)}>
                <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Hero Image Section */}
          <View style={styles.heroSection}>
            {imageError || !flashSale.image ? (
              <LinearGradient colors={[colors.error, colors.error]} style={styles.imagePlaceholder}>
                <Ionicons name="flash" size={80} color="white" />
              </LinearGradient>
            ) : (
              <CachedImage
                source={flashSale.image}
                style={styles.heroImage}
                contentFit="cover"
                onError={() => setImageError(true)}
              />
            )}

            {/* Gradient Overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
              style={styles.heroGradient}
            />

            {/* Header Buttons */}
            <SafeAreaView style={styles.headerOverlay} edges={['top']}>
              <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.headerButton}>
                <BlurView intensity={80} tint="light" style={styles.blurButton}>
                  <Ionicons name="chevron-back" size={24} color={colors.darkGray} />
                </BlurView>
              </Pressable>
              <Pressable onPress={handleShare} style={styles.headerButton}>
                <BlurView intensity={80} tint="light" style={styles.blurButton}>
                  <Ionicons name="share-social-outline" size={22} color={colors.darkGray} />
                </BlurView>
              </Pressable>
            </SafeAreaView>

            {/* Flash Deal Badge */}
            <View style={styles.flashBadgeContainer}>
              <LinearGradient colors={[colors.error, colors.error]} style={styles.flashBadge}>
                <Ionicons name="flash" size={14} color="white" />
                <ThemedText style={styles.flashBadgeText}>FLASH DEAL</ThemedText>
              </LinearGradient>
            </View>

            {/* Timer on Image */}
            <View style={styles.timerOnImage}>
              <View style={styles.timerBox}>
                <ThemedText style={styles.timerNumber}>{String(timeRemaining.hours).padStart(2, '0')}</ThemedText>
                <ThemedText style={styles.timerLabel}>HRS</ThemedText>
              </View>
              <ThemedText style={styles.timerSeparator}>:</ThemedText>
              <View style={styles.timerBox}>
                <ThemedText style={styles.timerNumber}>{String(timeRemaining.minutes).padStart(2, '0')}</ThemedText>
                <ThemedText style={styles.timerLabel}>MIN</ThemedText>
              </View>
              <ThemedText style={styles.timerSeparator}>:</ThemedText>
              <View style={styles.timerBox}>
                <ThemedText style={styles.timerNumber}>{String(timeRemaining.seconds).padStart(2, '0')}</ThemedText>
                <ThemedText style={styles.timerLabel}>SEC</ThemedText>
              </View>
            </View>
          </View>

          {/* Content Card */}
          <View style={styles.contentCard}>
            {/* Store Badge */}
            {flashSale.stores && flashSale.stores.length > 0 && (
              <Pressable style={styles.storeBadge} onPress={handleStorePress}>
                {flashSale.stores[0].logo ? (
                  <CachedImage source={flashSale.stores[0].logo} style={styles.storeLogoSmall} />
                ) : (
                  <View style={[styles.storeLogoSmall, styles.storeLogoPlaceholder]}>
                    <Ionicons name="storefront" size={16} color={Colors.brand.purple} />
                  </View>
                )}
                <ThemedText style={styles.storeBadgeText}>{flashSale.stores[0].name}</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={Colors.brand.purple} />
              </Pressable>
            )}

            {/* Title */}
            <ThemedText style={styles.title}>{flashSale.title}</ThemedText>

            {/* Description */}
            {flashSale.description && (
              <ThemedText style={styles.description}>{flashSale.description}</ThemedText>
            )}

            {/* Price Section */}
            <View style={styles.priceCard}>
              <View style={styles.priceLeft}>
                <ThemedText style={styles.priceLabel}>Deal Price</ThemedText>
                <View style={styles.priceRow}>
                  <ThemedText style={styles.discountedPrice}>
                    {currencySymbol}{flashSale.flashSalePrice || Math.round((flashSale.originalPrice || 0) * (1 - flashSale.discountPercentage / 100))}
                  </ThemedText>
                  {flashSale.originalPrice && (
                    <ThemedText style={styles.originalPrice}>{currencySymbol}{flashSale.originalPrice}</ThemedText>
                  )}
                </View>
              </View>
              <View style={styles.discountCircle}>
                <ThemedText style={styles.discountNumber}>{flashSale.discountPercentage}%</ThemedText>
                <ThemedText style={styles.discountOff}>OFF</ThemedText>
              </View>
            </View>

            {/* Stock Progress */}
            <View style={styles.stockCard}>
              <View style={styles.stockHeader}>
                <View style={styles.stockLeft}>
                  <ThemedText style={styles.stockEmoji}>{urgency.emoji}</ThemedText>
                  <ThemedText style={[styles.stockTitle, stockPercentage >= 80 && styles.stockTitleUrgent]}>
                    {urgency.text}
                  </ThemedText>
                </View>
                <ThemedText style={styles.stockCount}>
                  <ThemedText style={styles.stockCountBold}>{remainingStock}</ThemedText> left
                </ThemedText>
              </View>
              <View style={styles.progressBarContainer}>
                <LinearGradient
                  colors={getProgressColor(stockPercentage) as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBar, { width: `${stockPercentage}%` }]}
                />
              </View>
              <View style={styles.stockFooter}>
                <ThemedText style={styles.stockFooterText}>{flashSale.soldQuantity} claimed</ThemedText>
                <ThemedText style={styles.stockFooterText}>{flashSale.maxQuantity} total</ThemedText>
              </View>
            </View>

            {/* Promo Code */}
            {flashSale.promoCode && (
              <Animated.View style={[styles.promoCodeCard, pulseAnimStyle]}>
                <LinearGradient
                  colors={['#FEF9C3', '#FEF08A']}
                  style={styles.promoCodeGradient}
                >
                  <View style={styles.promoCodeLeft}>
                    <View style={styles.promoCodeIcon}>
                      <Ionicons name="ticket" size={24} color="#CA8A04" />
                    </View>
                    <View>
                      <ThemedText style={styles.promoCodeLabel}>Use Code</ThemedText>
                      <ThemedText style={styles.promoCode}>{flashSale.promoCode}</ThemedText>
                    </View>
                  </View>
                  <Pressable
                    style={[styles.copyButton, copiedCode && styles.copyButtonSuccess]}
                    onPress={handleCopyCode}
                   
                  >
                    <Ionicons
                      name={copiedCode ? "checkmark" : "copy-outline"}
                      size={18}
                      color={copiedCode ? "white" : "#CA8A04"}
                    />
                    <ThemedText style={[styles.copyButtonText, copiedCode && styles.copyButtonTextSuccess]}>
                      {copiedCode ? 'Copied!' : 'Copy'}
                    </ThemedText>
                  </Pressable>
                </LinearGradient>
              </Animated.View>
            )}

            {/* How to Use */}
            <View style={styles.howToUseCard}>
              <ThemedText style={styles.sectionTitle}>How to Use</ThemedText>
              <View style={styles.stepsContainer}>
                {[
                  { step: 1, icon: 'copy-outline', text: 'Copy the promo code above' },
                  { step: 2, icon: 'storefront-outline', text: 'Visit the store or order online' },
                  { step: 3, icon: 'cart-outline', text: 'Add items to your cart' },
                  { step: 4, icon: 'pricetag-outline', text: 'Apply code at checkout' },
                ].map((item, index) => (
                  <View key={item.step} style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <ThemedText style={styles.stepNumberText}>{item.step}</ThemedText>
                    </View>
                    <Ionicons name={item.icon as any} size={20} color={colors.midGray} style={styles.stepIcon} />
                    <ThemedText style={styles.stepText}>{item.text}</ThemedText>
                  </View>
                ))}
              </View>
            </View>

            {/* Terms & Conditions */}
            {((flashSale.termsAndConditions && flashSale.termsAndConditions.length > 0) || flashSale.minimumPurchase || flashSale.limitPerUser) && (
              <View style={styles.termsCard}>
                <View style={styles.termsHeader}>
                  <Ionicons name="document-text-outline" size={20} color={colors.midGray} />
                  <ThemedText style={styles.sectionTitle}>Terms & Conditions</ThemedText>
                </View>
                <View style={styles.termsList}>
                  {flashSale.termsAndConditions?.map((term, index) => (
                    <View key={index} style={styles.termItem}>
                      <View style={styles.termBullet} />
                      <ThemedText style={styles.termText}>{term}</ThemedText>
                    </View>
                  ))}
                  {flashSale.minimumPurchase && flashSale.minimumPurchase > 0 && (
                    <View style={styles.termItem}>
                      <View style={styles.termBullet} />
                      <ThemedText style={styles.termText}>
                        Minimum purchase: {currencySymbol}{flashSale.minimumPurchase}
                      </ThemedText>
                    </View>
                  )}
                  {flashSale.limitPerUser && (
                    <View style={styles.termItem}>
                      <View style={styles.termBullet} />
                      <ThemedText style={styles.termText}>
                        Limit {flashSale.limitPerUser} per customer
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="eye" size={20} color={Colors.brand.purple} />
                </View>
                <ThemedText style={styles.statNumber}>{flashSale.viewCount}</ThemedText>
                <ThemedText style={styles.statLabel}>Views</ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="cart" size={20} color={Colors.success} />
                </View>
                <ThemedText style={styles.statNumber}>{flashSale.purchaseCount}</ThemedText>
                <ThemedText style={styles.statLabel}>Claims</ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="people" size={20} color={Colors.warning} />
                </View>
                <ThemedText style={styles.statNumber}>{flashSale.limitPerUser}</ThemedText>
                <ThemedText style={styles.statLabel}>Per User</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
            <View style={styles.bottomContent}>
              <View style={styles.bottomLeft}>
                <ThemedText style={styles.bottomPriceLabel}>Deal Price</ThemedText>
                <ThemedText style={styles.bottomPrice}>
                  {currencySymbol}{flashSale.flashSalePrice || Math.round((flashSale.originalPrice || 0) * (1 - flashSale.discountPercentage / 100))}
                </ThemedText>
              </View>
              <Pressable
                style={[styles.getOfferButton, (isEnded || isProcessingPayment) && styles.getOfferButtonDisabled]}
                onPress={handleGetOffer}
                disabled={isEnded || isProcessingPayment}
               
              >
                <LinearGradient
                  colors={isEnded ? [Colors.text.tertiary, Colors.text.tertiary] : isProcessingPayment ? [Colors.brand.purple, Colors.brand.purple] : [Colors.error, colors.error]}
                  style={styles.getOfferButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isProcessingPayment ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name={isEnded ? "time-outline" : "flash"} size={22} color="white" />
                  )}
                  <ThemedText style={styles.getOfferButtonText}>
                    {isEnded ? 'Deal Ended' : isProcessingPayment ? 'Processing...' : 'Get This Deal'}
                  </ThemedText>
                </LinearGradient>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient colors={[colors.successScale[400], colors.successScale[700]]} style={styles.modalSuccessIcon}>
                <Ionicons name="checkmark" size={48} color="white" />
              </LinearGradient>

              <ThemedText style={styles.modalTitle}>Deal Claimed! 🎉</ThemedText>
              <ThemedText style={styles.modalMessage}>
                You're getting {flashSale.discountPercentage}% off!
              </ThemedText>

              {flashSale.promoCode && (
                <View style={styles.modalCodeContainer}>
                  <ThemedText style={styles.modalCodeLabel}>Your Promo Code</ThemedText>
                  <Pressable
                    style={styles.modalCodeBox}
                    onPress={handleCopyCode}
                   
                  >
                    <ThemedText style={styles.modalCode}>{flashSale.promoCode}</ThemedText>
                    <View style={styles.modalCopyIcon}>
                      <Ionicons name={copiedCode ? "checkmark" : "copy"} size={18} color={Colors.brand.purple} />
                    </View>
                  </Pressable>
                  {copiedCode && (
                    <ThemedText style={styles.modalCopiedText}>Copied to clipboard!</ThemedText>
                  )}
                </View>
              )}

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.modalButtonSecondary}
                  onPress={() => setShowSuccessModal(false)}
                >
                  <ThemedText style={styles.modalButtonTextSecondary}>Close</ThemedText>
                </Pressable>
                {flashSale.stores && flashSale.stores.length > 0 && (
                  <Pressable
                    style={styles.modalButtonPrimary}
                    onPress={() => {
                      setShowSuccessModal(false);
                      handleStorePress();
                    }}
                  >
                    <LinearGradient
                      colors={[colors.error, colors.error]}
                      style={styles.modalButtonPrimaryGradient}
                    >
                      <Ionicons name="storefront-outline" size={18} color="white" />
                      <ThemedText style={styles.modalButtonTextPrimary}>Visit Store</ThemedText>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.tint.warmGray },
  scrollView: {
    flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120 },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.base },
  loadingText: {
    ...Typography.bodyLarge,
    color: Colors.text.inverse,
    fontWeight: '500' },
  errorSafeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary },
  errorBackButton: {
    padding: Spacing.base },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['3xl'],
    gap: Spacing.base },
  errorTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: colors.darkGray },
  errorText: {
    ...Typography.bodyLarge,
    color: colors.midGray,
    textAlign: 'center' },
  retryButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600' },

  // Hero Section
  heroSection: {
    height: 320,
    position: 'relative' },
  heroImage: {
    width: '100%',
    height: '100%' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center' },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150 },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm },
  headerButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden' },
  blurButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)' },
  flashBadgeContainer: {
    position: 'absolute',
    top: 100,
    left: Spacing.base },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: Spacing.xs },
  flashBadgeText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '700',
    letterSpacing: 0.5 },
  timerOnImage: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.base,
    right: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm },
  timerBox: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    minWidth: 70 },
  timerNumber: {
    color: Colors.text.inverse,
    ...Typography.h2,
    fontWeight: '700' },
  timerLabel: {
    color: 'rgba(255,255,255,0.7)',
    ...Typography.caption,
    fontWeight: '600',
    letterSpacing: 1 },
  timerSeparator: {
    color: Colors.text.inverse,
    ...Typography.h2,
    fontWeight: '700' },

  // Content Card
  contentCard: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    marginTop: -24,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.lg },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.tint.pink,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm },
  storeLogoSmall: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md },
  storeLogoPlaceholder: {
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center' },
  storeBadgeText: {
    color: Colors.brand.purple,
    ...Typography.body,
    fontWeight: '600' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: 32 },
  description: {
    fontSize: 15,
    color: Colors.text.tertiary,
    lineHeight: 22 },

  // Price Card
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.errorScale[50],
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg },
  priceLeft: {
    gap: Spacing.xs },
  priceLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
    fontWeight: '500' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm },
  discountedPrice: {
    ...Typography.priceLarge,
    color: Colors.error },
  originalPrice: {
    ...Typography.h4,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through' },
  discountCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center' },
  discountNumber: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: '800' },
  discountOff: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600' },

  // Stock Card
  stockCard: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md },
  stockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  stockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  stockEmoji: {
    ...Typography.h4 },
  stockTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: colors.neutral[700] },
  stockTitleUrgent: {
    color: Colors.error },
  stockCount: {
    ...Typography.body,
    color: Colors.text.tertiary },
  stockCountBold: {
    fontWeight: '700',
    color: colors.neutral[700] },
  progressBarContainer: {
    height: 10,
    backgroundColor: Colors.border.default,
    borderRadius: 5,
    overflow: 'hidden' },
  progressBar: {
    height: '100%',
    borderRadius: 5 },
  stockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between' },
  stockFooterText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary },

  // Promo Code Card
  promoCodeCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden' },
  promoCodeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: '#FCD34D',
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg },
  promoCodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  promoCodeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center' },
  promoCodeLabel: {
    ...Typography.bodySmall,
    color: colors.brand.amberDark },
  promoCode: {
    ...Typography.h3,
    fontWeight: '800',
    color: colors.brand.amberDark,
    letterSpacing: 1 },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10 },
  copyButtonSuccess: {
    backgroundColor: Colors.success },
  copyButtonText: {
    color: '#CA8A04',
    fontWeight: '600',
    ...Typography.body },
  copyButtonTextSuccess: {
    color: Colors.text.inverse },

  // How to Use
  howToUseCard: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.base },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: colors.neutral[700] },
  stepsContainer: {
    gap: Spacing.md },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center' },
  stepNumberText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '700' },
  stepIcon: {
    width: 24 },
  stepText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.secondary },

  // Terms Card
  termsCard: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md },
  termsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  termsList: {
    gap: Spacing.sm },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10 },
  termBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.text.tertiary,
    marginTop: 7 },
  termText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20 },

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    justifyContent: 'space-around' },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xs },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs },
  statNumber: {
    ...Typography.h4,
    fontWeight: '700',
    color: colors.neutral[700] },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border.default },

  bottomSpacing: {
    height: 180 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 75,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    ...Shadows.strong },
  bottomSafeArea: {
    paddingBottom: Spacing.base },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md },
  bottomLeft: {
    gap: 2 },
  bottomPriceLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary },
  bottomPrice: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text.primary },
  getOfferButton: {
    flex: 1,
    marginLeft: Spacing.base,
    borderRadius: 14,
    overflow: 'hidden' },
  getOfferButtonDisabled: {},
  getOfferButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm },
  getOfferButtonText: {
    color: Colors.text.inverse,
    fontSize: 17,
    fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius['2xl'],
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360 },
  modalSuccessIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius['3xl'] + 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg },
  modalTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm },
  modalMessage: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl },
  modalCodeContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
    alignItems: 'center' },
  modalCodeLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: 10 },
  modalCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: '#FCD34D',
    borderStyle: 'dashed',
    gap: Spacing.md },
  modalCode: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brand.amberDark,
    letterSpacing: 2 },
  modalCopyIcon: {
    backgroundColor: Colors.background.primary,
    padding: 6,
    borderRadius: 6 },
  modalCopiedText: {
    marginTop: Spacing.sm,
    fontSize: 13,
    color: Colors.success,
    fontWeight: '500' },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%' },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    backgroundColor: Colors.background.secondary },
  modalButtonPrimary: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden' },
  modalButtonPrimaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6 },
  modalButtonTextSecondary: {
    color: Colors.text.secondary,
    ...Typography.bodyLarge,
    fontWeight: '600' },
  modalButtonTextPrimary: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600' } });

export default withErrorBoundary(FlashSaleDetailPage, 'FlashSalesId');
