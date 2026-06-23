import React, { useState, useEffect, memo } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Platform, Animated, Modal, ScrollView, Dimensions } from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { triggerImpact, triggerNotification } from "@/utils/haptics";
import discountsApi, { Discount } from '@/services/discountsApi';
import { useCartActions, useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlert } from '@/utils/platformAlert';
import { RetryButton } from '@/components/common/RetryButton';
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
  Typography,
  IconSize,
  Timing,
} from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width
const CARD_MARGIN = 12;

interface Section3Props {
  productPrice?: number;
  storeId?: string;
}

export default memo(function Section3({ productPrice = 1000, storeId }: Section3Props) {
  const isMounted = useIsMounted();
  const cartActions = useCartActions();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);

  useEffect(() => {
    fetchDiscounts();
  }, [productPrice, storeId]);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await discountsApi.getBillPaymentDiscounts(productPrice, storeId);

      if (response.success && response.data && response.data.length > 0) {
        if (!isMounted()) return;
        setDiscounts(response.data);
      } else {
        if (!isMounted()) return;
        setDiscounts([]);
      }
    } catch (error) {
      if (!isMounted()) return;
      setError('Unable to load discounts');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleApplyDiscount = async (discount: Discount) => {
    if (!discount) {
      platformAlert('Error', 'Discount information is not available.');
      return;
    }

    const now = new Date();
    const validFrom = new Date(discount.validFrom);
    const validUntil = new Date(discount.validUntil);

    if (now < validFrom) {
      platformAlert('Not Available Yet', `Available from ${validFrom.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`);
      return;
    }

    if (now > validUntil) {
      platformAlert('Expired', 'This discount has expired.');
      return;
    }

    if (!discount.isActive) {
      platformAlert('Unavailable', 'This discount is currently not active.');
      return;
    }

    triggerImpact('Medium');

    try {
      setIsApplying(true);

      if (discount.code) {
        if (!cartActions || typeof cartActions.applyCoupon !== 'function') {
          throw new Error('Cart actions not available.');
        }

        await cartActions.applyCoupon(discount.code);
        triggerNotification('Success');

        const discountAmount = discount.type === 'percentage' ? `${discount.value}%` : `${currencySymbol}${discount.value}`;
        platformAlert('Discount Applied!', `You'll save ${discountAmount} on your order!`);
        if (!isMounted()) return;
        setShowDetailsModal(false);
      } else {
        if (productPrice && productPrice < discount.minOrderValue) {
          platformAlert('Minimum Order Required', `Add ${currencySymbol}${discount.minOrderValue - productPrice} more to unlock this discount.`);
          if (!isMounted()) return;
          setIsApplying(false);
          return;
        }

        triggerNotification('Success');
        platformAlert('Discount Available', `This discount will be automatically applied at checkout.`);
        if (!isMounted()) return;
        setShowDetailsModal(false);
      }
    } catch (error: any) {
      triggerNotification('Error');
      platformAlert('Error', error?.message || 'Unable to apply discount.');
    } finally {
      if (!isMounted()) return;
      setIsApplying(false);
    }
  };

  const openDetailsModal = (discount: Discount) => {
    triggerImpact('Light');
    setSelectedDiscount(discount);
    setShowDetailsModal(true);
  };

  // Render compact discount card for horizontal scroll
  const renderDiscountCard = (discount: Discount, index: number) => {
    const meetsMinimum = productPrice >= (discount.minOrderValue || 0);
    const amountNeeded = (discount.minOrderValue || 0) - productPrice;
    const discountValue = discount.type === 'percentage' ? `${discount.value}%` : `${currencySymbol}${discount.value}`;

    return (
      <Pressable
        key={discount._id || index}
        style={[styles.discountCard, !meetsMinimum && styles.discountCardLocked]}
       
        onPress={() => openDetailsModal(discount)}
        accessibilityRole="button"
        accessibilityLabel={`${discount.name}. ${discountValue} off${!meetsMinimum ? `. Add ${currencySymbol}${amountNeeded} more to unlock` : ''}`}
      >
        {/* Gradient Background */}
        <LinearGradient
          colors={meetsMinimum ? [colors.lightMustard, colors.brand.goldRich] : [colors.nileBlue, '#0f2535']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Discount Badge */}
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountBadgeText}>{discountValue}</ThemedText>
            <ThemedText style={styles.discountBadgeSubtext}>OFF</ThemedText>
          </View>

          {/* Lock Icon for Ineligible */}
          {!meetsMinimum && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={14} color={colors.background.primary} />
            </View>
          )}

          {/* Card Content */}
          <View style={styles.cardContent}>
            <ThemedText style={styles.cardTitle} numberOfLines={1}>
              {discount.name}
            </ThemedText>

            <View style={styles.minOrderRow}>
              <Ionicons name="receipt-outline" size={12} color="rgba(255,255,255,0.8)" />
              <ThemedText style={styles.minOrderText}>
                Min. {currencySymbol}{discount.minOrderValue || 0}
              </ThemedText>
            </View>

            {!meetsMinimum ? (
              <View style={styles.unlockRow}>
                <Ionicons name="add-circle-outline" size={12} color="#FCD34D" />
                <ThemedText style={styles.unlockText}>
                  Add {currencySymbol}{amountNeeded} more
                </ThemedText>
              </View>
            ) : (
              <View style={styles.eligibleRow}>
                <Ionicons name="checkmark-circle" size={12} color={colors.successScale[400]} />
                <ThemedText style={styles.eligibleText}>Ready to use</ThemedText>
              </View>
            )}
          </View>

          {/* Arrow Icon */}
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </View>
        </LinearGradient>
      </Pressable>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="flash" size={20} color={Colors.primary[600]} />
          <ThemedText style={styles.headerTitle}>Mega Sale Offers</ThemedText>
        </View>
        <CardGridSkeleton />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="flash" size={20} color={Colors.primary[600]} />
          <ThemedText style={styles.headerTitle}>Mega Sale Offers</ThemedText>
        </View>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <RetryButton onRetry={fetchDiscounts} label="Retry" variant="ghost" size="small" />
        </View>
      </View>
    );
  }

  // No discounts
  if (discounts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="flash" size={16} color={colors.background.primary} />
          </View>
          <ThemedText style={styles.headerTitle}>Mega Sale Offers</ThemedText>
          <View style={styles.countBadge}>
            <ThemedText style={styles.countText}>{discounts.length}</ThemedText>
          </View>
        </View>
      </View>

      {/* Horizontal Scroll of Discount Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_MARGIN}
        snapToAlignment="start"
      >
        {discounts.map((discount, index) => renderDiscountCard(discount, index))}
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        statusBarTranslucent
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Offer Details</ThemedText>
              <Pressable
                onPress={() => setShowDetailsModal(false)}
                style={styles.modalCloseButton}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={Colors.gray[600]} />
              </Pressable>
            </View>

            {selectedDiscount && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Offer Header */}
                <LinearGradient
                  colors={[colors.lightMustard, colors.brand.goldRich]}
                  style={styles.modalOfferHeader}
                >
                  <ThemedText style={styles.modalOfferValue}>
                    {selectedDiscount.type === 'percentage' ? `${selectedDiscount.value}%` : `${currencySymbol}${selectedDiscount.value}`}
                  </ThemedText>
                  <ThemedText style={styles.modalOfferLabel}>OFF</ThemedText>
                  <ThemedText style={styles.modalOfferName}>{selectedDiscount.name}</ThemedText>
                </LinearGradient>

                {/* Details Cards */}
                <View style={styles.modalDetailsSection}>
                  {/* Min Order */}
                  <View style={styles.modalDetailRow}>
                    <View style={styles.modalDetailIcon}>
                      <Ionicons name="cart-outline" size={18} color={Colors.primary[600]} />
                    </View>
                    <View style={styles.modalDetailContent}>
                      <ThemedText style={styles.modalDetailLabel}>Minimum Order</ThemedText>
                      <ThemedText style={styles.modalDetailValue}>{currencySymbol}{selectedDiscount.minOrderValue || 0}</ThemedText>
                    </View>
                  </View>

                  {/* Max Discount */}
                  {selectedDiscount.maxDiscountAmount && (
                    <View style={styles.modalDetailRow}>
                      <View style={styles.modalDetailIcon}>
                        <Ionicons name="trending-down-outline" size={18} color={Colors.primary[600]} />
                      </View>
                      <View style={styles.modalDetailContent}>
                        <ThemedText style={styles.modalDetailLabel}>Maximum Discount</ThemedText>
                        <ThemedText style={styles.modalDetailValue}>{currencySymbol}{selectedDiscount.maxDiscountAmount}</ThemedText>
                      </View>
                    </View>
                  )}

                  {/* Validity */}
                  <View style={styles.modalDetailRow}>
                    <View style={styles.modalDetailIcon}>
                      <Ionicons name="calendar-outline" size={18} color={Colors.primary[600]} />
                    </View>
                    <View style={styles.modalDetailContent}>
                      <ThemedText style={styles.modalDetailLabel}>Valid Until</ThemedText>
                      <ThemedText style={styles.modalDetailValue}>
                        {new Date(selectedDiscount.validUntil).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Usage Limit */}
                  {selectedDiscount.usageLimitPerUser && (
                    <View style={styles.modalDetailRow}>
                      <View style={styles.modalDetailIcon}>
                        <Ionicons name="person-outline" size={18} color={Colors.primary[600]} />
                      </View>
                      <View style={styles.modalDetailContent}>
                        <ThemedText style={styles.modalDetailLabel}>Usage Limit</ThemedText>
                        <ThemedText style={styles.modalDetailValue}>
                          {selectedDiscount.usageLimitPerUser} per user
                        </ThemedText>
                      </View>
                    </View>
                  )}
                </View>

                {/* Terms */}
                {(selectedDiscount.restrictions?.singleVoucherPerBill || selectedDiscount.restrictions?.isOfflineOnly) && (
                  <View style={styles.modalTermsSection}>
                    <ThemedText style={styles.modalTermsTitle}>Terms & Conditions</ThemedText>
                    {selectedDiscount.restrictions?.singleVoucherPerBill && (
                      <View style={styles.modalTermRow}>
                        <View style={styles.termBullet} />
                        <ThemedText style={styles.modalTermText}>Single voucher per bill</ThemedText>
                      </View>
                    )}
                    {selectedDiscount.restrictions?.isOfflineOnly && (
                      <View style={styles.modalTermRow}>
                        <View style={styles.termBullet} />
                        <ThemedText style={styles.modalTermText}>Available for offline purchases only</ThemedText>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            )}

            {/* Apply Button */}
            {selectedDiscount && (
              <View style={styles.modalFooter}>
                {productPrice >= (selectedDiscount.minOrderValue || 0) ? (
                  <Pressable
                    style={styles.applyButton}
                    onPress={() => handleApplyDiscount(selectedDiscount)}
                    disabled={isApplying}
                  >
                    <LinearGradient
                      colors={[colors.lightMustard, colors.brand.goldRich]}
                      style={styles.applyButtonGradient}
                    >
                      <ThemedText style={styles.applyButtonText}>
                        {isApplying ? 'Applying...' : 'Apply Offer'}
                      </ThemedText>
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <View style={styles.lockedButtonContainer}>
                    <View style={styles.lockedButton}>
                      <Ionicons name="lock-closed" size={16} color={Colors.gray[500]} />
                      <ThemedText style={styles.lockedButtonText}>
                        Add {currencySymbol}{(selectedDiscount.minOrderValue || 0) - productPrice} more to unlock
                      </ThemedText>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.lg,
    backgroundColor: colors.background.primary,
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.lightMustard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },

  // Discount Card Styles
  discountCard: {
    width: CARD_WIDTH,
    marginRight: CARD_MARGIN,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  discountCardLocked: {
    opacity: 0.9,
    shadowColor: colors.neutral[500],
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 100,
  },

  // Discount Badge
  discountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  discountBadgeText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.background.primary,
    lineHeight: 26,
  },
  discountBadgeSubtext: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.5,
    marginTop: 2,
  },

  // Lock Badge
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    padding: 6,
    // 3D effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Card Content
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 4,
  },
  minOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  minOrderText: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unlockText: {
    ...Typography.caption,
    color: '#FCD34D',
    fontWeight: '600',
    marginLeft: 4,
  },
  eligibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eligibleText: {
    ...Typography.caption,
    color: colors.successScale[400],
    fontWeight: '600',
    marginLeft: 4,
  },

  // Arrow Container
  arrowContainer: {
    marginLeft: Spacing.sm,
  },

  // Loading & Error States
  loadingContainer: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  modalTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalBody: {
    paddingHorizontal: Spacing.xl,
  },

  // Modal Offer Header
  modalOfferHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginVertical: Spacing.lg,
  },
  modalOfferValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.background.primary,
    lineHeight: 52,
  },
  modalOfferLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  modalOfferName: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },

  // Modal Details Section
  modalDetailsSection: {
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  modalDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  modalDetailContent: {
    flex: 1,
  },
  modalDetailLabel: {
    ...Typography.caption,
    color: Colors.gray[500],
  },
  modalDetailValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.gray[900],
  },

  // Modal Terms Section
  modalTermsSection: {
    marginBottom: Spacing.lg,
  },
  modalTermsTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: Spacing.sm,
  },
  modalTermRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  termBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray[400],
    marginRight: Spacing.sm,
  },
  modalTermText: {
    ...Typography.body,
    color: Colors.gray[600],
  },

  // Modal Footer
  modalFooter: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  applyButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    ...Typography.bodyLarge,
    color: colors.background.primary,
    fontWeight: '700',
  },
  lockedButtonContainer: {
    alignItems: 'center',
  },
  lockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray[100],
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    width: '100%',
  },
  lockedButtonText: {
    ...Typography.body,
    color: Colors.gray[500],
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
});
