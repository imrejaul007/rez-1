import { withErrorBoundary } from '@/utils/withErrorBoundary';
// CardOffersPage.tsx
// Modern card offers page with consistent design system

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Modal,
  Platform,
  RefreshControl,
  Dimensions
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import discountsApi, { Discount } from '@/services/discountsApi';
import { useCartState, useCartActions, useAuthUser, useIsAuthenticated, useAuthLoading, useGetCurrencySymbol } from '@/stores/selectors';
import { triggerImpact, triggerNotification } from '@/utils/haptics';
import { showToast } from '@/components/common/ToastManager';
import { platformAlert } from '@/utils/platformAlert';
import analyticsService from '@/services/analyticsService';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
  Typography,
  Gradients } from '@/constants/DesignSystem';
import { CardGridSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

function CardOffersPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = (params.storeId as string) || '';
  const storeName = (params.storeName as string) || '';
  const orderValue = params.orderValue ? parseFloat(String(params.orderValue)) : 0;

  const cartState = useCartState();
  const cartActions = useCartActions();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const { isOnline } = useNetworkStatus();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [cardOffers, setCardOffers] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Discount | null>(null);
  const [showOfferDetails, setShowOfferDetails] = useState(false);
  const [applyingOffer, setApplyingOffer] = useState(false);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const fadeAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: interpolate(fadeAnim.value, [0, 1], [20, 0]) }],
  }));

  // Calculate cart total
  const cartTotal = useMemo(() => {
    if (!cartState?.items || !Array.isArray(cartState.items)) {
      return 0;
    }
    return cartState.items.reduce((total, item) => {
      return total + (item.discountedPrice || item.originalPrice || 0) * (item.quantity || 0);
    }, 0);
  }, [cartState?.items]);

  const currentOrderValue = orderValue || cartTotal;

  // Fetch card offers
  const fetchCardOffers = useCallback(async () => {
    if (!storeId) {
      setError('Store ID is required');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await discountsApi.getCardOffers({
        storeId,
        orderValue: currentOrderValue,
        page: 1,
        limit: 50 });

      if (response.success && response.data) {
        const discounts = Array.isArray(response.data)
          ? response.data
          : response.data.discounts || [];
        if (!isMounted()) return;
        setCardOffers(discounts);

        // Animate in
        fadeAnim.value = withTiming(1, { duration: 300 });
      } else {
        if (!isMounted()) return;
        setCardOffers([]);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError('Failed to load card offers. Please try again.');
      if (!isMounted()) return;
      setCardOffers([]);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [storeId, currentOrderValue, fadeAnim]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchCardOffers();
  }, [fetchCardOffers, isAuthenticated, authLoading]);

  useEffect(() => {
    if (storeId) {
      analyticsService.trackPageView('card_offers_page', {
        storeId,
        storeName,
        orderValue: currentOrderValue });
    }
  }, [storeId, storeName, currentOrderValue]);

  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    setRefreshing(true);
    fetchCardOffers();
  }, [fetchCardOffers, isOnline]);

  // Handle apply offer
  const handleApplyOffer = useCallback(async (offer: Discount) => {
    if (!isAuthenticated) {
      platformAlert(
        'Sign In Required',
        'Please sign in to apply card offers.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/sign-in') },
        ]
      );
      return;
    }

    if (currentOrderValue < offer.minOrderValue) {
      const shortfall = offer.minOrderValue - currentOrderValue;
      platformAlert(
        'Minimum Order Required',
        `Add ${currencySymbol}${shortfall.toLocaleString()} more to unlock this offer.`
      );
      return;
    }

    const now = new Date();
    if (now < new Date(offer.validFrom)) {
      platformAlert('Not Available Yet', 'This offer is not active yet.');
      return;
    }
    if (now > new Date(offer.validUntil)) {
      platformAlert('Expired', 'This offer has expired.');
      return;
    }
    if (!offer.isActive) {
      platformAlert('Unavailable', 'This offer is currently not active.');
      return;
    }

    triggerImpact('Medium');
    setApplyingOffer(true);

    try {
      if (cartActions && typeof cartActions.applyCoupon === 'function' && offer.code) {
        await cartActions.applyCoupon(offer.code);
      } else if (cartActions && typeof (cartActions as any).setCardOffer === 'function') {
        await (cartActions as any).setCardOffer(offer);
      }

      triggerNotification('Success');
      const discountText = offer.type === 'percentage' ? `${offer.value}%` : `${currencySymbol}${offer.value}`;
      showToast({
        message: `${offer.name} applied! Save ${discountText} on card payment.`,
        type: 'success',
        duration: 3000 });

      analyticsService.track('card_offer_applied', {
        offerId: offer._id,
        offerName: offer.name,
        discountType: offer.type,
        discountValue: offer.value,
        storeId,
        orderValue: currentOrderValue });

      if (!isMounted()) return;
      setShowOfferDetails(false);
      if (!isMounted()) return;
      setSelectedOffer(null);
      setTimeout(() => router.canGoBack() ? router.back() : router.replace('/(tabs)'), 1000);
    } catch (error: any) {
      triggerNotification('Error');
      platformAlert('Error', error?.message || 'Failed to apply offer.');
    } finally {
      if (!isMounted()) return;
      setApplyingOffer(false);
    }
  }, [isAuthenticated, currentOrderValue, cartActions, router, storeId]);

  // Render offer card
  const renderOfferCard = useCallback((offer: Discount, index: number) => {
    const discountText = offer.type === 'percentage' ? `${offer.value}%` : `${currencySymbol}${offer.value}`;
    const isEligible = currentOrderValue >= offer.minOrderValue;
    const shortfall = Math.max(0, offer.minOrderValue - currentOrderValue);
    const bankNames = offer.bankNames?.length ? offer.bankNames.join(', ') : 'All Banks';
    const maxSavings = offer.type === 'percentage'
      ? (offer.maxDiscountAmount || Math.round(currentOrderValue * offer.value / 100))
      : offer.value;

    return (
      <Animated.View
        key={offer._id || index}
        style={[
          styles.offerCard,
          fadeAnimStyle
        ]}
      >
        <Pressable
         
          onPress={() => {
            setSelectedOffer(offer);
            setShowOfferDetails(true);
            triggerImpact('Light');
          }}
          accessible={true}
          accessibilityLabel={`Card offer: ${offer.name}, ${discountText} off`}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[colors.background.primary, '#F8F5FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.offerCardGradient}
          >
            {/* Decorative Pattern */}
            <View style={styles.cardPattern}>
              <View style={[styles.patternCircle, styles.patternCircle1]} />
              <View style={[styles.patternCircle, styles.patternCircle2]} />
            </View>

            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <LinearGradient
                  colors={Gradients.purplePrimary as unknown as string[]}
                  style={styles.cardIconGradient}
                >
                  <MaterialCommunityIcons name="credit-card-chip-outline" size={24} color={colors.background.primary} />
                </LinearGradient>
              </View>

              <View style={styles.discountBadge}>
                <ThemedText style={styles.discountText}>{discountText}</ThemedText>
                <ThemedText style={styles.discountLabel}>OFF</ThemedText>
              </View>
            </View>

            {/* Offer Info */}
            <View style={styles.cardBody}>
              <ThemedText style={styles.offerName} numberOfLines={2}>
                {offer.name}
              </ThemedText>

              {offer.description && (
                <ThemedText style={styles.offerDesc} numberOfLines={2}>
                  {offer.description}
                </ThemedText>
              )}

              {/* Meta Info */}
              <View style={styles.metaContainer}>
                <View style={styles.metaItem}>
                  <Ionicons name="card" size={14} color={Colors.primary[600]} />
                  <ThemedText style={styles.metaText}>{bankNames}</ThemedText>
                </View>

                <View style={styles.metaItem}>
                  <Ionicons name="pricetag" size={14} color={Colors.primary[600]} />
                  <ThemedText style={styles.metaText}>
                    Min {currencySymbol}{offer.minOrderValue.toLocaleString()}
                  </ThemedText>
                </View>

                {offer.maxDiscountAmount && (
                  <View style={styles.metaItem}>
                    <Ionicons name="gift" size={14} color={Colors.primary[600]} />
                    <ThemedText style={styles.metaText}>
                      Save up to {currencySymbol}{offer.maxDiscountAmount.toLocaleString()}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Card Type Badge */}
              {offer.cardType && offer.cardType !== 'all' && (
                <View style={styles.cardTypePill}>
                  <MaterialCommunityIcons
                    name={offer.cardType === 'credit' ? 'credit-card' : 'card-account-details'}
                    size={12}
                    color={Colors.primary[700]}
                  />
                  <ThemedText style={styles.cardTypeLabel}>
                    {offer.cardType === 'credit' ? 'Credit Card' : 'Debit Card'} Only
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Divider with scissors */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerCircleLeft} />
              <View style={styles.dividerLine} />
              <View style={styles.dividerCircleRight} />
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              {isEligible ? (
                <Pressable
                  style={styles.applyBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleApplyOffer(offer);
                  }}
                  disabled={applyingOffer}
                 
                >
                  <LinearGradient
                    colors={Gradients.purplePrimary as unknown as string[]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.applyBtnGradient}
                  >
                    {applyingOffer ? (
                      <ActivityIndicator size="small" color={colors.background.primary} />
                    ) : (
                      <>
                        <ThemedText style={styles.applyBtnText}>Apply Offer</ThemedText>
                        <Ionicons name="arrow-forward" size={16} color={colors.background.primary} />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              ) : (
                <View style={styles.lockedContainer}>
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={14} color={Colors.warning} />
                    <ThemedText style={styles.lockedText}>
                      Add {currencySymbol}{shortfall.toLocaleString()} more
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.unlockHint}>to unlock this offer</ThemedText>
                </View>
              )}
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }, [currentOrderValue, applyingOffer, handleApplyOffer, fadeAnim]);

  return (
    <ErrorBoundary>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <LinearGradient
          colors={Gradients.purplePrimary as unknown as string[]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Pressable
              style={styles.backBtn}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Card Offers</ThemedText>
              <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
                {storeName || 'Store Offers'}
              </ThemedText>
            </View>

            <View style={styles.headerRight}>
              <MaterialCommunityIcons name="credit-card-multiple" size={28} color={colors.background.primary} />
            </View>
          </View>

          {/* Order Value Card */}
          <View style={styles.orderCard}>
            <View style={styles.orderCardLeft}>
              <ThemedText style={styles.orderLabel}>Current Order Value</ThemedText>
              <ThemedText style={styles.orderAmount}>
                {currencySymbol}{currentOrderValue.toLocaleString()}
              </ThemedText>
            </View>
            <View style={styles.orderCardDivider} />
            <View style={styles.orderCardRight}>
              <ThemedText style={styles.offersCount}>
                {cardOffers.length}
              </ThemedText>
              <ThemedText style={styles.offersLabel}>
                {cardOffers.length === 1 ? 'Offer' : 'Offers'}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* Content */}
        {loading && !refreshing ? (
          <CardGridSkeleton />
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="cloud-offline-outline" size={48} color={Colors.error} />
            </View>
            <ThemedText style={styles.errorTitle}>Oops! Something went wrong</ThemedText>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={styles.retryBtn} onPress={fetchCardOffers}>
              <Ionicons name="refresh" size={18} color={colors.background.primary} />
              <ThemedText style={styles.retryBtnText}>Try Again</ThemedText>
            </Pressable>
          </View>
        ) : cardOffers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="credit-card-off-outline" size={64} color={Colors.gray[300]} />
            </View>
            <ThemedText style={styles.emptyTitle}>No Card Offers</ThemedText>
            <ThemedText style={styles.emptyText}>
              No card payment offers available for this store right now. Check back later!
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary[600]]}
                tintColor={Colors.primary[600]}
                enabled={isOnline}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="flash" size={20} color={Colors.primary[600]} />
                <ThemedText style={styles.sectionTitle}>Available Offers</ThemedText>
              </View>
              <ThemedText style={styles.sectionSubtitle}>
                Pay with card & save more
              </ThemedText>
            </View>

            {/* Offer Cards */}
            {cardOffers.map((offer, index) => renderOfferCard(offer, index))}

            {/* Bottom Spacing */}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {/* Offer Details Modal */}
        <Modal
          visible={showOfferDetails}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowOfferDetails(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
             
              onPress={() => setShowOfferDetails(false)}
            />
            <View style={styles.modalContent}>
              {selectedOffer && (
                <>
                  {/* Modal Header */}
                  <LinearGradient
                    colors={Gradients.purplePrimary as unknown as string[]}
                    style={styles.modalHeader}
                  >
                    <Pressable
                      style={styles.modalCloseBtn}
                      onPress={() => setShowOfferDetails(false)}
                    >
                      <Ionicons name="close" size={24} color={colors.background.primary} />
                    </Pressable>

                    <View style={styles.modalHeaderContent}>
                      <View style={styles.modalDiscountBadge}>
                        <ThemedText style={styles.modalDiscountText}>
                          {selectedOffer.type === 'percentage' ? `${selectedOffer.value}%` : `${currencySymbol}${selectedOffer.value}`}
                        </ThemedText>
                        <ThemedText style={styles.modalDiscountLabel}>OFF</ThemedText>
                      </View>
                      <ThemedText style={styles.modalOfferName}>{selectedOffer.name}</ThemedText>
                    </View>
                  </LinearGradient>

                  {/* Modal Body */}
                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                    {selectedOffer.description && (
                      <ThemedText style={styles.modalDescription}>
                        {selectedOffer.description}
                      </ThemedText>
                    )}

                    {/* Details List */}
                    <View style={styles.detailsList}>
                      <View style={styles.detailItem}>
                        <View style={styles.detailIcon}>
                          <Ionicons name="card" size={18} color={Colors.primary[600]} />
                        </View>
                        <View style={styles.detailContent}>
                          <ThemedText style={styles.detailLabel}>Applicable Cards</ThemedText>
                          <ThemedText style={styles.detailValue}>
                            {selectedOffer.bankNames?.length ? selectedOffer.bankNames.join(', ') : 'All Banks'}
                          </ThemedText>
                        </View>
                      </View>

                      {selectedOffer.cardType && selectedOffer.cardType !== 'all' && (
                        <View style={styles.detailItem}>
                          <View style={styles.detailIcon}>
                            <MaterialCommunityIcons name="credit-card-check" size={18} color={Colors.primary[600]} />
                          </View>
                          <View style={styles.detailContent}>
                            <ThemedText style={styles.detailLabel}>Card Type</ThemedText>
                            <ThemedText style={styles.detailValue}>
                              {selectedOffer.cardType === 'credit' ? 'Credit Cards' : 'Debit Cards'} Only
                            </ThemedText>
                          </View>
                        </View>
                      )}

                      <View style={styles.detailItem}>
                        <View style={styles.detailIcon}>
                          <Ionicons name="cart" size={18} color={Colors.primary[600]} />
                        </View>
                        <View style={styles.detailContent}>
                          <ThemedText style={styles.detailLabel}>Minimum Order</ThemedText>
                          <ThemedText style={styles.detailValue}>
                            {currencySymbol}{selectedOffer.minOrderValue.toLocaleString()}
                          </ThemedText>
                        </View>
                      </View>

                      {selectedOffer.maxDiscountAmount && (
                        <View style={styles.detailItem}>
                          <View style={styles.detailIcon}>
                            <Ionicons name="gift" size={18} color={Colors.primary[600]} />
                          </View>
                          <View style={styles.detailContent}>
                            <ThemedText style={styles.detailLabel}>Max Savings</ThemedText>
                            <ThemedText style={styles.detailValue}>
                              {currencySymbol}{selectedOffer.maxDiscountAmount.toLocaleString()}
                            </ThemedText>
                          </View>
                        </View>
                      )}

                      <View style={styles.detailItem}>
                        <View style={styles.detailIcon}>
                          <Ionicons name="calendar" size={18} color={Colors.primary[600]} />
                        </View>
                        <View style={styles.detailContent}>
                          <ThemedText style={styles.detailLabel}>Valid Till</ThemedText>
                          <ThemedText style={styles.detailValue}>
                            {new Date(selectedOffer.validUntil).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </ThemedText>
                        </View>
                      </View>
                    </View>

                    {/* Terms */}
                    {selectedOffer.restrictions && (
                      <View style={styles.termsSection}>
                        <ThemedText style={styles.termsTitle}>Terms & Conditions</ThemedText>
                        {selectedOffer.restrictions.singleVoucherPerBill && (
                          <View style={styles.termItem}>
                            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                            <ThemedText style={styles.termText}>One offer per transaction</ThemedText>
                          </View>
                        )}
                        {selectedOffer.usageLimitPerUser && (
                          <View style={styles.termItem}>
                            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                            <ThemedText style={styles.termText}>
                              {selectedOffer.usageLimitPerUser} use{selectedOffer.usageLimitPerUser > 1 ? 's' : ''} per user
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    )}
                  </ScrollView>

                  {/* Modal Footer */}
                  <View style={styles.modalFooter}>
                    {currentOrderValue >= selectedOffer.minOrderValue ? (
                      <Pressable
                        style={styles.modalApplyBtn}
                        onPress={() => handleApplyOffer(selectedOffer)}
                        disabled={applyingOffer}
                       
                      >
                        <LinearGradient
                          colors={Gradients.purplePrimary as unknown as string[]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.modalApplyBtnGradient}
                        >
                          {applyingOffer ? (
                            <ActivityIndicator size="small" color={colors.background.primary} />
                          ) : (
                            <>
                              <ThemedText style={styles.modalApplyBtnText}>Apply This Offer</ThemedText>
                              <Ionicons name="checkmark-circle" size={20} color={colors.background.primary} />
                            </>
                          )}
                        </LinearGradient>
                      </Pressable>
                    ) : (
                      <View style={styles.modalLockedFooter}>
                        <View style={styles.modalLockedBadge}>
                          <Ionicons name="lock-closed" size={16} color={Colors.warning} />
                          <ThemedText style={styles.modalLockedText}>
                            Add {currencySymbol}{(selectedOffer.minOrderValue - currentOrderValue).toLocaleString()} more to unlock
                          </ThemedText>
                        </View>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'] },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center' },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.md },
  headerTitle: {
    ...Typography.h2,
    color: colors.background.primary,
    fontWeight: '700' },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2 },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center' },

  // Order Card
  orderCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    alignItems: 'center' },
  orderCardLeft: {
    flex: 1 },
  orderLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.7)' },
  orderAmount: {
    ...Typography.h2,
    color: colors.background.primary,
    fontWeight: '800',
    marginTop: 2 },
  orderCardDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: Spacing.base },
  orderCardRight: {
    alignItems: 'center',
    paddingHorizontal: Spacing.base },
  offersCount: {
    ...Typography.h1,
    color: colors.background.primary,
    fontWeight: '800' },
  offersLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.7)' },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl },
  loadingCard: {
    backgroundColor: colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    alignItems: 'center',
    ...Shadows.medium },
  loadingText: {
    ...Typography.body,
    color: Colors.gray[600],
    marginTop: Spacing.base },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg },
  errorTitle: {
    ...Typography.h3,
    color: Colors.gray[900],
    fontWeight: '700',
    marginBottom: Spacing.sm },
  errorText: {
    ...Typography.body,
    color: Colors.gray[600],
    textAlign: 'center',
    marginBottom: Spacing.lg },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full },
  retryBtnText: {
    ...Typography.label,
    color: colors.background.primary },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.gray[900],
    fontWeight: '700',
    marginBottom: Spacing.sm },
  emptyText: {
    ...Typography.body,
    color: Colors.gray[500],
    textAlign: 'center',
    maxWidth: 280 },

  // Scroll
  scrollView: {
    flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120 },

  // Section Header
  sectionHeader: {
    marginBottom: Spacing.lg },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.gray[900],
    fontWeight: '700' },
  sectionSubtitle: {
    ...Typography.body,
    color: Colors.gray[500],
    marginTop: 2,
    marginLeft: 28 },

  // Offer Card
  offerCard: {
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.medium },
  offerCardGradient: {
    position: 'relative',
    overflow: 'hidden' },
  cardPattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 150,
    height: 150 },
  patternCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: Colors.primary[100],
    opacity: 0.3 },
  patternCircle1: {
    width: 100,
    height: 100,
    top: -30,
    right: -30 },
  patternCircle2: {
    width: 60,
    height: 60,
    top: 40,
    right: 50 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    paddingBottom: Spacing.sm },
  cardIconContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden' },
  cardIconGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center' },
  discountBadge: {
    alignItems: 'flex-end' },
  discountText: {
    ...Typography.h1,
    color: Colors.primary[700],
    fontWeight: '800' },
  discountLabel: {
    ...Typography.caption,
    color: Colors.primary[500],
    fontWeight: '700',
    marginTop: -4 },
  cardBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base },
  offerName: {
    ...Typography.h4,
    color: Colors.gray[900],
    fontWeight: '700',
    marginBottom: Spacing.xs },
  offerDesc: {
    ...Typography.body,
    color: Colors.gray[600],
    marginBottom: Spacing.md },
  metaContainer: {
    gap: Spacing.xs },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.gray[600] },
  cardTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginTop: Spacing.md },
  cardTypeLabel: {
    ...Typography.caption,
    color: Colors.primary[700],
    fontWeight: '600' },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm },
  dividerCircleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
    marginLeft: -10 },
  dividerLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.gray[200] },
  dividerCircleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
    marginRight: -10 },
  cardFooter: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm },
  applyBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden' },
  applyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md },
  applyBtnText: {
    ...Typography.label,
    color: colors.background.primary,
    fontWeight: '700' },
  lockedContainer: {
    alignItems: 'center' },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warning + '15',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full },
  lockedText: {
    ...Typography.label,
    color: Colors.warning,
    fontWeight: '600' },
  unlockHint: {
    ...Typography.caption,
    color: Colors.gray[500],
    marginTop: Spacing.xs },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '85%',
    overflow: 'hidden' },
  modalHeader: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center' },
  modalHeaderContent: {
    alignItems: 'center',
    marginTop: Spacing.sm },
  modalDiscountBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs },
  modalDiscountText: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.background.primary },
  modalDiscountLabel: {
    ...Typography.h4,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700' },
  modalOfferName: {
    ...Typography.h3,
    color: colors.background.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.sm },
  modalBody: {
    padding: Spacing.lg },
  modalDescription: {
    ...Typography.body,
    color: Colors.gray[600],
    textAlign: 'center',
    marginBottom: Spacing.lg },
  detailsList: {
    gap: Spacing.md },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center' },
  detailContent: {
    flex: 1 },
  detailLabel: {
    ...Typography.caption,
    color: Colors.gray[500] },
  detailValue: {
    ...Typography.body,
    color: Colors.gray[900],
    fontWeight: '600' },
  termsSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100] },
  termsTitle: {
    ...Typography.label,
    color: Colors.gray[900],
    marginBottom: Spacing.md },
  termItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm },
  termText: {
    ...Typography.body,
    color: Colors.gray[600] },
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg },
  modalApplyBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden' },
  modalApplyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base },
  modalApplyBtnText: {
    ...Typography.button,
    color: colors.background.primary },
  modalLockedFooter: {
    alignItems: 'center' },
  modalLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warning + '15',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full },
  modalLockedText: {
    ...Typography.label,
    color: Colors.warning,
    fontWeight: '600' } });

export default withErrorBoundary(CardOffersPage, 'CardOffersPage');
