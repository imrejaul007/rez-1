// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Voucher Brand Detail Page
 *
 * Shows gift card brand details with denomination selection and purchase flow.
 * Supports wallet and Stripe card payment.
 * Data source: realVouchersApi.getVoucherBrandById(id)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Elements } from '@stripe/react-stripe-js';
import { getStripePromise } from '@/utils/lazyImports';
import realVouchersApi from '@/services/realVouchersApi';
import apiClient from '@/services/apiClient';
import { useGetCurrencySymbol, useRefreshWallet } from '@/stores/selectors';
import { StripeCardForm } from '@/components/payment';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Initialize Stripe lazily — only if key is configured
const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (__DEV__ && !stripeKey) console.warn('[Vouchers] EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY missing — card payments disabled');
const stripePromise = stripeKey ? getStripePromise(stripeKey) : null;

interface VoucherBrand {
  _id: string;
  name: string;
  logo: string;
  backgroundColor?: string;
  description?: string;
  cashbackRate: number;
  rating?: number;
  ratingCount?: number;
  category: string;
  isNewlyAdded: boolean;
  isFeatured: boolean;
  denominations: number[];
  termsAndConditions: string[];
  purchaseCount: number;
}

type PaymentMethod = 'card' | 'wallet';

const COLORS = {
  white: Colors.background.primary,
  navy: Colors.nileBlue,
  peach: colors.brand.sand,
  peachLight: colors.lightPeach,
  warmBg: '#F4F1ED',
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray500: Colors.text.tertiary,
  gray600: Colors.text.tertiary,
  gold: Colors.gold,
  green: Colors.success,
  purple: Colors.brand.purpleLight,
};

function VoucherBrandDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const refreshWallet = useRefreshWallet();

  const [brand, setBrand] = useState<VoucherBrand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(stripeKey ? 'card' : 'wallet');
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stripe payment state
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);

  // Cross-platform confirm/result modal
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'success' | 'error';
    onConfirm?: () => void;
  }>({ visible: false, title: '', message: '', type: 'confirm' });

  const fetchBrand = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const response = await realVouchersApi.getVoucherBrandById(id);
      if (response.success && response.data) {
        setBrand(response.data as unknown as VoucherBrand);
        if ((response.data as any).denominations?.length > 0 && !selectedDenomination) {
          setSelectedDenomination((response.data as any).denominations[0]);
        }
      } else {
        if (!isMounted()) return;
        setError('Brand not found');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load brand details');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [id]);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchBrand();
    if (id) {
      realVouchersApi.trackBrandView(id).catch(() => {});
    }
  }, [fetchBrand, id]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchBrand();
  }, [fetchBrand]);

  const executeWalletPurchase = useCallback(async () => {
    if (!brand || !selectedDenomination) return;

    setConfirmModal(prev => ({ ...prev, visible: false }));
    setIsPurchasing(true);

    try {
      const response = await realVouchersApi.purchaseVoucher({
        brandId: brand._id,
        denomination: selectedDenomination,
        paymentMethod: 'wallet',
      });

      if (response.success) {
        if (!isMounted()) return;
        refreshWallet().catch(() => {});
        setConfirmModal({
          visible: true,
          title: 'Purchase Successful!',
          message: `Your ${brand.name} gift card has been purchased. Check your vouchers in Account.`,
          type: 'success',
        });
      } else {
        if (!isMounted()) return;
        setConfirmModal({
          visible: true,
          title: 'Purchase Failed',
          message: (response as any).error || 'Failed to purchase voucher. Please try again.',
          type: 'error',
        });
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setConfirmModal({
        visible: true,
        title: 'Purchase Failed',
        message: err?.message || 'Failed to purchase voucher. Please try again.',
        type: 'error',
      });
    } finally {
      if (!isMounted()) return;
      setIsPurchasing(false);
    }
  }, [brand, selectedDenomination]);

  const handlePurchase = useCallback(async () => {
    if (!brand || !selectedDenomination) {
      setConfirmModal({
        visible: true,
        title: 'Select Amount',
        message: 'Please select a gift card denomination first.',
        type: 'error',
      });
      return;
    }

    if (paymentMethod === 'card') {
      // Card payment: create PaymentIntent, show Stripe form
      setIsPurchasing(true);
      try {
        const response = await realVouchersApi.purchaseVoucher({
          brandId: brand._id,
          denomination: selectedDenomination,
          paymentMethod: 'card',
        });

        if (response.success && response.data?.clientSecret) {
          if (!isMounted()) return;
          setStripeClientSecret(response.data.clientSecret);
          if (!isMounted()) return;
          setShowStripeModal(true);
        } else {
          if (!isMounted()) return;
          setConfirmModal({
            visible: true,
            title: 'Payment Error',
            message: (response as any).error || 'Failed to initiate card payment.',
            type: 'error',
          });
        }
      } catch (err: any) {
        if (!isMounted()) return;
        setConfirmModal({
          visible: true,
          title: 'Payment Error',
          message: err?.message || 'Failed to initiate card payment.',
          type: 'error',
        });
      } finally {
        if (!isMounted()) return;
        setIsPurchasing(false);
      }
    } else {
      // Wallet payment: show confirm modal
      if (!isMounted()) return;
      setConfirmModal({
        visible: true,
        title: 'Buy Gift Card',
        message: `Purchase ${brand.name} gift card worth ${currencySymbol}${selectedDenomination.toLocaleString()} from your wallet?\n\nYou'll earn ${currencySymbol}${Math.round(selectedDenomination * (brand.cashbackRate / 100)).toLocaleString()} cashback!`,
        type: 'confirm',
        onConfirm: () => executeWalletPurchase(),
      });
    }
  }, [brand, selectedDenomination, paymentMethod, currencySymbol, executeWalletPurchase]);

  const handleStripeSuccess = useCallback(async (paymentIntentId: string) => {
    setShowStripeModal(false);
    setIsPurchasing(true);

    try {
      const confirmResponse = await apiClient.post('/vouchers/confirm-card-purchase', {
        paymentIntentId,
      });

      if (confirmResponse.success) {
        if (!isMounted()) return;
        refreshWallet().catch(() => {});
        setConfirmModal({
          visible: true,
          title: 'Purchase Successful!',
          message: `Your ${brand?.name} gift card has been purchased. Check your vouchers in Account.`,
          type: 'success',
        });
      } else {
        if (!isMounted()) return;
        setConfirmModal({
          visible: true,
          title: 'Confirmation Failed',
          message: (confirmResponse as any).error || 'Payment succeeded but voucher creation failed. Please contact support.',
          type: 'error',
        });
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setConfirmModal({
        visible: true,
        title: 'Confirmation Error',
        message: err?.message || 'Payment succeeded but confirmation failed. Please contact support.',
        type: 'error',
      });
    } finally {
      if (!isMounted()) return;
      setIsPurchasing(false);
      if (!isMounted()) return;
      setStripeClientSecret(null);
    }
  }, [brand]);

  const handleStripeError = useCallback((errorMessage: string) => {
    setShowStripeModal(false);
    setStripeClientSecret(null);
    setConfirmModal({
      visible: true,
      title: 'Payment Failed',
      message: errorMessage || 'Card payment failed. Please try again.',
      type: 'error',
    });
  }, []);

  const handleStripeCancel = useCallback(() => {
    setShowStripeModal(false);
    setStripeClientSecret(null);
  }, []);

  const cashbackAmount = selectedDenomination && brand
    ? Math.round(selectedDenomination * (brand.cashbackRate / 100))
    : 0;

  const brandGradient = brand?.backgroundColor
    ? [brand.backgroundColor, adjustColor(brand.backgroundColor, -20)]
    : [COLORS.navy, colors.brand.nileBlueLight];

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (error || !brand) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray500} />
        <Text style={styles.errorText}>{error || 'Brand not found'}</Text>
        <Pressable style={styles.retryButton} onPress={fetchBrand}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
        <Pressable style={styles.backLink} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{brand.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.peach]} />
        }
      >
        {/* Brand Hero */}
        <LinearGradient
          colors={brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroDecoCircle1} />
          <View style={styles.heroDecoCircle2} />

          <View style={styles.logoContainer}>
            {brand.logo?.startsWith('http') ? (
              <CachedImage source={brand.logo} style={styles.brandLogo} contentFit="contain" />
            ) : (
              <Text style={styles.logoInitial}>{brand.logo || brand.name.charAt(0)}</Text>
            )}
          </View>

          <Text style={styles.heroName}>{brand.name}</Text>

          <View style={styles.cashbackBadge}>
            <Ionicons name="gift" size={14} color={COLORS.white} />
            <Text style={styles.cashbackBadgeText}>{brand.cashbackRate}% Cashback</Text>
          </View>

          {brand.rating ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={COLORS.gold} />
              <Text style={styles.ratingText}>{brand.rating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({brand.ratingCount || 0} reviews)</Text>
            </View>
          ) : null}

          <View style={styles.heroBadgeRow}>
            {brand.isFeatured && (
              <View style={styles.heroBadge}>
                <Ionicons name="star" size={10} color={COLORS.gold} />
                <Text style={styles.heroBadgeText}>Featured</Text>
              </View>
            )}
            {brand.isNewlyAdded && (
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={10} color={COLORS.white} />
                <Text style={styles.heroBadgeText}>New</Text>
              </View>
            )}
            {brand.purchaseCount > 0 && (
              <View style={styles.heroBadge}>
                <Ionicons name="people" size={10} color={COLORS.white} />
                <Text style={styles.heroBadgeText}>{brand.purchaseCount}+ bought</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Description */}
        {brand.description && (
          <View style={styles.section}>
            <Text style={styles.descriptionText}>{brand.description}</Text>
          </View>
        )}

        {/* Denomination Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Amount</Text>
          <View style={styles.denominationGrid}>
            {brand.denominations.map((denom) => {
              const isSelected = selectedDenomination === denom;
              return (
                <Pressable
                  key={denom}
                  style={[styles.denomCard, isSelected && styles.denomCardSelected]}
                  onPress={() => setSelectedDenomination(denom)}
                 
                >
                  <Text style={[styles.denomAmount, isSelected && styles.denomAmountSelected]}>
                    {currencySymbol}{denom.toLocaleString()}
                  </Text>
                  <Text style={[styles.denomCashback, isSelected && styles.denomCashbackSelected]}>
                    Earn {currencySymbol}{Math.round(denom * (brand.cashbackRate / 100))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Payment Method Selector */}
        {selectedDenomination && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethodRow}>
              <Pressable
                style={[styles.paymentMethodCard, paymentMethod === 'card' && styles.paymentMethodCardSelected]}
                onPress={() => setPaymentMethod('card')}
               
              >
                <View style={[styles.paymentMethodIcon, paymentMethod === 'card' && { backgroundColor: colors.tint.purple }]}>
                  <Ionicons name="card" size={20} color={paymentMethod === 'card' ? COLORS.purple : COLORS.gray500} />
                </View>
                <Text style={[styles.paymentMethodLabel, paymentMethod === 'card' && styles.paymentMethodLabelSelected]}>
                  Card
                </Text>
                {paymentMethod === 'card' && (
                  <View style={styles.paymentMethodCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.purple} />
                  </View>
                )}
              </Pressable>

              <Pressable
                style={[styles.paymentMethodCard, paymentMethod === 'wallet' && styles.paymentMethodWalletSelected]}
                onPress={() => setPaymentMethod('wallet')}
               
              >
                <View style={[styles.paymentMethodIcon, paymentMethod === 'wallet' && { backgroundColor: colors.tint.greenLight }]}>
                  <Ionicons name="wallet" size={20} color={paymentMethod === 'wallet' ? COLORS.green : COLORS.gray500} />
                </View>
                <Text style={[styles.paymentMethodLabel, paymentMethod === 'wallet' && styles.paymentMethodLabelSelected]}>
                  Wallet
                </Text>
                {paymentMethod === 'wallet' && (
                  <View style={styles.paymentMethodCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.green} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Order Summary */}
        {selectedDenomination && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gift Card Value</Text>
                <Text style={styles.summaryValue}>{currencySymbol}{selectedDenomination.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>You Pay</Text>
                <Text style={styles.summaryValue}>{currencySymbol}{selectedDenomination.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <View style={styles.cashbackHighlight}>
                  <Ionicons name="gift" size={14} color={COLORS.green} />
                  <Text style={styles.cashbackLabel}>Cashback ({brand.cashbackRate}%)</Text>
                </View>
                <Text style={styles.cashbackValueText}>+ {currencySymbol}{cashbackAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.effectiveCostRow}>
                <Text style={styles.effectiveCostLabel}>Effective Cost</Text>
                <Text style={styles.effectiveCostValue}>
                  {currencySymbol}{(selectedDenomination - cashbackAmount).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Terms & Conditions */}
        {brand.termsAndConditions?.length > 0 && (
          <View style={styles.section}>
            <Pressable
              style={styles.termsHeader}
              onPress={() => setShowTerms(!showTerms)}
             
            >
              <Text style={styles.sectionTitle}>Terms & Conditions</Text>
              <Ionicons
                name={showTerms ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.navy}
              />
            </Pressable>
            {showTerms && (
              <View style={styles.termsContent}>
                {brand.termsAndConditions.map((term, index) => (
                  <View key={index} style={styles.termItem}>
                    <Text style={styles.termBullet}>{index + 1}.</Text>
                    <Text style={styles.termText}>{term}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: Platform.OS === 'web' ? 180 : 120 }} />
      </ScrollView>

      {/* Buy Button - Fixed Bottom */}
      <View style={styles.buyButtonContainer}>
        <Pressable
          style={[styles.buyButton, (!selectedDenomination || isPurchasing) && styles.buyButtonDisabled]}
          onPress={handlePurchase}
          disabled={!selectedDenomination || isPurchasing}
         
        >
          <LinearGradient
            colors={selectedDenomination
              ? (paymentMethod === 'card' ? [colors.brand.purpleSoft, COLORS.purple] : [colors.successScale[400], Colors.success])
              : [COLORS.gray200, COLORS.gray200]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buyButtonGradient}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name={paymentMethod === 'card' ? 'card' : 'wallet'}
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.buyButtonText}>
                  {selectedDenomination
                    ? `Pay ${currencySymbol}${selectedDenomination.toLocaleString()} via ${paymentMethod === 'card' ? 'Card' : 'Wallet'}`
                    : 'Select an Amount'}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>

      {/* Stripe Card Payment Modal */}
      <Modal
        visible={showStripeModal}
        transparent
        animationType="slide"
        onRequestClose={handleStripeCancel}
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
                      colorPrimary: COLORS.purple,
                      colorBackground: Colors.background.primary,
                      colorText: COLORS.navy,
                      colorDanger: Colors.error,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      borderRadius: '12px',
                    },
                  },
                }}
              >
                <StripeCardForm
                  clientSecret={stripeClientSecret}
                  amount={selectedDenomination || 0}
                  onSuccess={handleStripeSuccess}
                  onError={handleStripeError}
                  onCancel={handleStripeCancel}
                />
              </Elements>
            )}
          </View>
        </View>
      </Modal>

      {/* Cross-platform Confirm / Success / Error Modal */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (confirmModal.type === 'success') {
            setConfirmModal(prev => ({ ...prev, visible: false }));
            router.canGoBack() ? router.back() : router.replace('/(tabs)');
          } else {
            setConfirmModal(prev => ({ ...prev, visible: false }));
          }
        }}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            {/* Icon */}
            <View style={[
              styles.alertIconCircle,
              confirmModal.type === 'success' && styles.alertIconSuccess,
              confirmModal.type === 'error' && styles.alertIconError,
              confirmModal.type === 'confirm' && styles.alertIconConfirm,
            ]}>
              <Ionicons
                name={
                  confirmModal.type === 'success' ? 'checkmark-circle' :
                  confirmModal.type === 'error' ? 'close-circle' :
                  'help-circle'
                }
                size={32}
                color={
                  confirmModal.type === 'success' ? COLORS.green :
                  confirmModal.type === 'error' ? Colors.error :
                  COLORS.navy
                }
              />
            </View>

            {/* Title */}
            <Text style={styles.alertTitle}>{confirmModal.title}</Text>

            {/* Message */}
            <Text style={styles.alertMessage}>{confirmModal.message}</Text>

            {/* Buttons */}
            <View style={styles.alertButtonRow}>
              {confirmModal.type === 'confirm' ? (
                <>
                  <Pressable
                    style={styles.alertButtonCancel}
                    onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
                   
                  >
                    <Text style={styles.alertButtonCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.alertButtonConfirm}
                    onPress={() => confirmModal.onConfirm?.()}
                   
                  >
                    <LinearGradient
                      colors={[colors.successScale[400], Colors.success]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.alertButtonGradient}
                    >
                      <Ionicons name="wallet" size={16} color={COLORS.white} />
                      <Text style={styles.alertButtonConfirmText}>Buy Now</Text>
                    </LinearGradient>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={styles.alertButtonOk}
                  onPress={() => {
                    setConfirmModal(prev => ({ ...prev, visible: false }));
                    if (confirmModal.type === 'success') {
                      router.canGoBack() ? router.back() : router.replace('/(tabs)');
                    }
                  }}
                 
                >
                  <Text style={styles.alertButtonOkText}>OK</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function adjustColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: COLORS.gray500,
    marginTop: Spacing.sm,
  },
  errorText: {
    ...Typography.bodyLarge,
    color: COLORS.gray500,
    fontWeight: '500',
    marginTop: Spacing.sm,
  },
  retryButton: {
    backgroundColor: COLORS.peach,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm,
  },
  retryText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.white,
  },
  backLink: {
    marginTop: Spacing.sm,
  },
  backLinkText: {
    ...Typography.body,
    color: COLORS.navy,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: COLORS.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },

  // Hero Section
  heroSection: {
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecoCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroDecoCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  brandLogo: {
    width: 56,
    height: 56,
  },
  logoInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.navy,
  },
  heroName: {
    ...Typography.h2,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: 6,
    marginBottom: Spacing.md,
  },
  cashbackBadgeText: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.white,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  ratingText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.white,
  },
  ratingCount: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  heroBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.md,
  },
  descriptionText: {
    ...Typography.body,
    color: COLORS.gray600,
    lineHeight: 22,
  },

  // Denomination Grid
  denominationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  denomCard: {
    width: '31%',
    backgroundColor: COLORS.gray50,
    borderRadius: 14,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  denomCardSelected: {
    borderColor: COLORS.peach,
    backgroundColor: '#FFF5EE',
  },
  denomAmount: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.xs,
  },
  denomAmountSelected: {
    color: COLORS.navy,
  },
  denomCashback: {
    ...Typography.overline,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  denomCashbackSelected: {
    color: COLORS.peach,
    fontWeight: '600',
  },

  // Payment Method
  paymentMethodRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  paymentMethodCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    gap: 10,
  },
  paymentMethodCardSelected: {
    borderColor: COLORS.purple,
    backgroundColor: '#FAF5FF',
  },
  paymentMethodWalletSelected: {
    borderColor: COLORS.green,
    backgroundColor: colors.successScale[50],
  },
  paymentMethodIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodLabel: {
    flex: 1,
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  paymentMethodLabelSelected: {
    color: COLORS.navy,
  },
  paymentMethodCheck: {
    marginLeft: 'auto',
  },

  // Order Summary
  summaryCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    ...Typography.body,
    color: COLORS.gray600,
  },
  summaryValue: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.navy,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginVertical: Spacing.sm,
  },
  cashbackHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cashbackLabel: {
    ...Typography.body,
    color: COLORS.green,
    fontWeight: '500',
  },
  cashbackValueText: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.green,
  },
  effectiveCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF5EE',
    marginTop: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
  },
  effectiveCostLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.navy,
  },
  effectiveCostValue: {
    ...Typography.bodyLarge,
    fontWeight: '800',
    color: COLORS.navy,
  },

  // Terms
  termsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termsContent: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  termItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  termBullet: {
    ...Typography.bodySmall,
    color: COLORS.gray500,
    fontWeight: '600',
    width: 20,
  },
  termText: {
    flex: 1,
    ...Typography.bodySmall,
    color: COLORS.gray600,
    lineHeight: 20,
  },

  // Buy Button
  buyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? 34 : Platform.OS === 'web' ? 80 : 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  buyButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  buyButtonDisabled: {
    opacity: 0.6,
  },
  buyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: 10,
  },
  buyButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Stripe Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
  },

  // Cross-platform Alert Modal
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  alertBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.xl,
    padding: 28,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 10 },
      web: { boxShadow: '0 8px 30px rgba(0,0,0,0.15)' } as any,
    }),
  },
  alertIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  alertIconSuccess: {
    backgroundColor: colors.tint.greenLight,
  },
  alertIconError: {
    backgroundColor: colors.errorScale[50],
  },
  alertIconConfirm: {
    backgroundColor: colors.tint.blue,
  },
  alertTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  alertMessage: {
    ...Typography.body,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  alertButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  alertButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
  },
  alertButtonCancelText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  alertButtonConfirm: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  alertButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  alertButtonConfirmText: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.white,
  },
  alertButtonOk: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
  },
  alertButtonOkText: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default withErrorBoundary(VoucherBrandDetailPage, 'VouchersBrandId');
