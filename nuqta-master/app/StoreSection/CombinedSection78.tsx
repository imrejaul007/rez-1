// @ts-nocheck
// CombinedSection78.tsx - Premium Glassmorphism Design
// Instant Discount / Deals Section - Green & Gold Theme

import { colors } from '@/constants/theme';
import React, { useState, useEffect, memo} from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Modal, ScrollView, Platform} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming} from 'react-native-reanimated';
import { CardGridSkeleton } from '@/components/skeletons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { ThemedText } from '@/components/ThemedText';
import { useGetCurrencySymbol } from '@/stores/selectors';
import storeVouchersApi from '@/services/storeVouchersApi';
import discountsApi from '@/services/discountsApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

// Premium Glass Design Tokens - Mustard & Gold Theme
const GLASS = {
  lightBg: 'rgba(255, 255, 255, 0.8)',
  lightBorder: 'rgba(255, 255, 255, 0.5)',
  lightHighlight: 'rgba(255, 255, 255, 0.9)',
  frostedBg: 'rgba(255, 255, 255, 0.92)',
  tintedGreenBg: 'rgba(255, 205, 87, 0.08)',
  tintedGreenBorder: 'rgba(255, 205, 87, 0.2)',
  tintedGoldBg: 'rgba(255, 200, 87, 0.12)',
  tintedGoldBorder: 'rgba(255, 200, 87, 0.35)' };

const COLORS = {
  primary: Colors.gold,
  primaryDark: colors.brand.goldRich,   // Brand-specific
  gold: colors.brand.goldWarm,          // Brand-specific
  goldDark: '#E5A500',      // Brand-specific
  navy: Colors.nileBlue,
  textPrimary: Colors.text.primary,
  textSecondary: Colors.text.tertiary,
  white: Colors.background.primary,
  surface: colors.linen,       // Brand linen
};

interface CombinedSection78Props {
  title?: string;
  savePercentage?: string;
  minimumBill?: string;
  onAddPress?: () => void;
  disabled?: boolean;
  testID?: string;
  dynamicData?: {
    id?: string;
    _id?: string;
    store?: {
      id?: string;
      _id?: string;
      name?: string;
    };
  } | null;
  cardType?: string;
}

export default memo(function CombinedSection78({
  title = 'Get Instant Discount',
  savePercentage = 'Save 20%',
  minimumBill,
  onAddPress,
  disabled = false,
  testID,
  dynamicData,
  cardType }: CombinedSection78Props) {
  const isMounted = useIsMounted();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const defaultMinimumBill = `Minimum bill: ${currencySymbol}5000`;
  const resolvedMinimumBill = minimumBill || defaultMinimumBill;

  const [isAddingVoucher, setIsAddingVoucher] = useState(false);
  const [voucher, setVoucher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Animations
  const cardScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const modalScale = useSharedValue(0.9);
  const modalOpacity = useSharedValue(0);

  const cardScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const buttonScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));
  const modalAnimStyle = useAnimatedStyle(() => ({ opacity: modalOpacity.value, transform: [{ scale: modalScale.value }] }));

  const storeId = dynamicData?.store?.id || dynamicData?.store?._id;
  const storeName = dynamicData?.store?.name;

  useEffect(() => {
    if (storeId) {
      fetchVoucher();
    } else {
      setLoading(false);
    }
  }, [storeId]);

  const animatePress = (anim: { value: number }, toValue: number) => {
    anim.value = withSpring(toValue, { damping: 8, stiffness: 100 });
  };

  const fetchVoucher = async () => {
    if (!storeId) return;

    try {
      setLoading(true);

      const vouchersResponse = await storeVouchersApi.getStoreVouchers(storeId, {
        page: 1,
        limit: 1 });

      if (vouchersResponse.success && vouchersResponse.data?.vouchers?.length > 0) {
        if (!isMounted()) return;
        setVoucher(vouchersResponse.data.vouchers[0]);
      } else {
        const discountsResponse = await discountsApi.getBillPaymentDiscounts(5000);

        if (discountsResponse.success && discountsResponse.data?.length > 0) {
          if (!isMounted()) return;
          setVoucher(discountsResponse.data[0]);
        }
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleAddVoucher = async () => {
    if (onAddPress) {
      onAddPress();
      return;
    }

    try {
      setIsAddingVoucher(true);

      if (!storeId) {
        platformAlertSimple('Error', 'Store information not available');
        return;
      }

      if (!voucher) {
        platformAlertSimple('Error', 'No voucher available');
        return;
      }

      const voucherId = voucher._id || voucher.id;
      const response = await storeVouchersApi.claimVoucher(voucherId);

      if (response.success) {
        platformAlertSimple('Voucher Claimed!', `Discount voucher for ${storeName || 'this store'} has been added to your account`);
        await fetchVoucher();
      } else {
        platformAlertSimple('Error', response.error || 'Unable to claim voucher');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unable to add voucher. Please try again.';
      platformAlertSimple('Error', errorMessage);
    } finally {
      if (!isMounted()) return;
      setIsAddingVoucher(false);
    }
  };

  const handleShowDetails = () => {
    if (!voucher) {
      platformAlertSimple('No Details', 'No voucher information available');
      return;
    }

    modalScale.value = withSpring(1, { damping: 8 });
    modalOpacity.value = withTiming(1, { duration: 200 });

    setShowDetailsModal(true);
  };

  const handleHideDetails = () => {
    modalScale.value = withTiming(0.9, { duration: 150 });
    modalOpacity.value = withTiming(0, { duration: 150 });
    setTimeout(() => setShowDetailsModal(false), 150);
  };

  const voucherType = voucher?.discountType || voucher?.type;
  const voucherValue = voucher?.discountValue || voucher?.value;

  const displayTitle = voucher?.name || title;
  const displaySavePercentage = voucher && voucherValue
    ? `Save ${voucherType === 'percentage' ? voucherValue + '%' : currencySymbol + voucherValue}`
    : savePercentage;
  const displayMinBill = voucher
    ? `Minimum bill: ${currencySymbol}${voucher.minBillAmount || voucher.minOrderValue || 5000}`
    : resolvedMinimumBill;

  // Loading state
  if (loading) {
    return (
      <View style={styles.container} testID={testID}>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <Animated.View style={cardScaleStyle}>
        <Pressable
         
          onPressIn={() => animatePress(cardScale, 0.98)}
          onPressOut={() => animatePress(cardScale, 1)}
          style={styles.cardWrapper}
        >
          {/* Glass Card */}
          {Platform.OS === 'ios' ? (
            <BlurView intensity={50} tint="light" style={styles.card}>
              {renderCardContent()}
            </BlurView>
          ) : (
            <View style={[styles.card, styles.cardAndroid]}>
              {renderCardContent()}
            </View>
          )}
        </Pressable>
      </Animated.View>

      {/* Premium Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        statusBarTranslucent
        animationType="none"
        onRequestClose={handleHideDetails}
      >
        <Pressable
          style={styles.modalOverlay}
         
          onPress={handleHideDetails}
        >
          <Animated.View
            style={[styles.modalContent, modalAnimStyle]}
          >
            <View onStartShouldSetResponder={() => true} onTouchEnd={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.modalHeaderIcon}
                >
                  <Ionicons name="ticket" size={24} color={COLORS.white} />
                </LinearGradient>
                <ThemedText style={styles.modalTitle}>Deal Details</ThemedText>
                <Pressable
                  onPress={handleHideDetails}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                </Pressable>
              </View>

              {/* Modal Body */}
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>Name</ThemedText>
                  <ThemedText style={styles.modalValue}>{voucher?.name || 'N/A'}</ThemedText>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>Discount</ThemedText>
                  <View style={styles.discountValueRow}>
                    <LinearGradient
                      colors={[COLORS.gold, COLORS.goldDark]}
                      style={styles.discountBadgeLarge}
                    >
                      <ThemedText style={styles.discountBadgeText}>
                        {voucherType === 'percentage' ? `${voucherValue}%` : `${currencySymbol}${voucherValue}`}
                      </ThemedText>
                    </LinearGradient>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>Minimum Bill</ThemedText>
                  <ThemedText style={styles.modalValue}>
                    {currencySymbol}{voucher?.minBillAmount || voucher?.minOrderValue || 'N/A'}
                  </ThemedText>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>Restrictions</ThemedText>
                  <View style={styles.restrictionsList}>
                    <View style={styles.restrictionItem}>
                      <View style={styles.restrictionIcon}>
                        <Ionicons
                          name={voucher?.restrictions?.isOfflineOnly ? 'storefront' : 'globe-outline'}
                          size={16}
                          color={COLORS.primary}
                        />
                      </View>
                      <ThemedText style={styles.restrictionText}>
                        {voucher?.restrictions?.isOfflineOnly ? 'Offline only' : 'Online & Offline'}
                      </ThemedText>
                    </View>
                    <View style={styles.restrictionItem}>
                      <View style={styles.restrictionIcon}>
                        <Ionicons name="pricetag-outline" size={16} color={COLORS.primary} />
                      </View>
                      <ThemedText style={styles.restrictionText}>
                        {voucher?.restrictions?.notValidAboveStoreDiscount
                          ? 'Not valid above store discount'
                          : 'Valid with store discount'}
                      </ThemedText>
                    </View>
                    <View style={styles.restrictionItem}>
                      <View style={styles.restrictionIcon}>
                        <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
                      </View>
                      <ThemedText style={styles.restrictionText}>
                        {voucher?.restrictions?.singleVoucherPerBill
                          ? 'Single voucher per bill'
                          : 'Multiple vouchers allowed'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <Pressable
                style={styles.modalButton}
                onPress={handleHideDetails}
               
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.modalButtonGradient}
                >
                  <ThemedText style={styles.modalButtonText}>Close</ThemedText>
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );

  function renderCardContent() {
    return (
      <>
        {/* Glass Highlight */}
        <View style={styles.glassHighlight} />

        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.headerIcon}
            >
              <Ionicons name="flash" size={20} color={COLORS.white} />
            </LinearGradient>
            <ThemedText style={styles.title}>{displayTitle}</ThemedText>
          </View>

          {/* Save Badge */}
          <LinearGradient
            colors={[COLORS.gold, COLORS.goldDark]}
            style={styles.saveBadge}
          >
            <ThemedText style={styles.saveBadgeText}>{displaySavePercentage}</ThemedText>
          </LinearGradient>
        </View>

        {/* Minimum Bill */}
        <ThemedText style={styles.minBill}>{displayMinBill}</ThemedText>

        {/* Dashed Divider */}
        <View style={styles.divider} />

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MaterialCommunityIcons name="bag-carry-on-off" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailTextContainer}>
              <ThemedText style={styles.detailText}>Offline Only</ThemedText>
              <Pressable onPress={handleShowDetails}>
                <ThemedText style={styles.moreDetailsLink}>| More details</ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MaterialIcons name="percent" size={16} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.detailText}>Not valid above store discount</ThemedText>
              <ThemedText style={styles.subText}>Single voucher per bill</ThemedText>
            </View>
          </View>
        </View>

        {/* Add Button */}
        <Animated.View style={buttonScaleStyle}>
          <Pressable
           
            onPressIn={() => animatePress(buttonScale, 0.96)}
            onPressOut={() => animatePress(buttonScale, 1)}
            onPress={handleAddVoucher}
            disabled={disabled || isAddingVoucher || !voucher || voucher.isAssigned}
            style={[
              styles.addButtonWrapper,
              (disabled || isAddingVoucher || !voucher || voucher.isAssigned) && styles.addButtonDisabled
            ]}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.addButton}
            >
              {isAddingVoucher ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <ThemedText style={styles.addButtonText}>
                  {voucher?.isAssigned ? 'Already Claimed' : !voucher ? 'Not Available' : 'Add Deal'}
                </ThemedText>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </>
    );
  }
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12 },

  cardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 20 },
      android: {
        elevation: 8 } }) },

  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: GLASS.lightBorder,
    overflow: 'hidden' },

  cardAndroid: {
    backgroundColor: GLASS.lightBg },

  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: GLASS.lightHighlight },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10 },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12 },

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center' },

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1 },

  saveBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6 },
      android: {
        elevation: 4 } }) },

  saveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
    letterSpacing: 0.2 },

  minBill: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    marginLeft: 52 },

  divider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginBottom: 16 },

  // Details Section
  detailsSection: {
    gap: 14,
    marginBottom: 20 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12 },

  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: GLASS.tintedGreenBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GLASS.tintedGreenBorder },

  detailTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap' },

  detailText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500' },

  moreDetailsLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 4 },

  subText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2 },

  // Add Button
  addButtonWrapper: {
    borderRadius: 24,
    overflow: 'hidden' },

  addButton: {
    height: 50,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center' },

  addButtonDisabled: {
    opacity: 0.5 },

  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700' },

  // Loading State
  loadingCard: {
    backgroundColor: GLASS.frostedBg,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GLASS.lightBorder },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20 },

  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.navy,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24 },
      android: {
        elevation: 16 } }) },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    gap: 12 },

  modalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center' },

  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary },

  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GLASS.lightBg,
    justifyContent: 'center',
    alignItems: 'center' },

  modalBody: {
    padding: 20 },

  modalSection: {
    marginBottom: 24 },

  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10 },

  modalValue: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary },

  discountValueRow: {
    flexDirection: 'row' },

  discountBadgeLarge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16 },

  discountBadgeText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.navy },

  restrictionsList: {
    gap: 14 },

  restrictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 },

  restrictionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: GLASS.tintedGreenBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GLASS.tintedGreenBorder },

  restrictionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
    fontWeight: '500' },

  modalButton: {
    padding: 20,
    paddingTop: 0 },

  modalButtonGradient: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center' },

  modalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700' } });
