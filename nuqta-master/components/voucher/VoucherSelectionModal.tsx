// Voucher Selection Modal Component
// Allows users to select vouchers/coupons at checkout

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import couponService, { UserCoupon } from '@/services/couponApi';
import vouchersService from '@/services/realVouchersApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface VoucherOption {
  id: string;
  code: string;
  type: 'coupon' | 'voucher';
  title: string;
  description: string;
  value: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  minOrderValue: number;
  maxDiscount?: number;
  expiryDate: string;
  isActive: boolean;
  isBestOffer?: boolean;
}

interface VoucherSelectionModalProps {
  visible: boolean;
  cartTotal: number;
  currentVoucher?: VoucherOption | null;
  onClose: () => void;
  onApply: (voucher: VoucherOption) => void;
  onRemove: () => void;
}

function VoucherSelectionModal({
  visible,
  cartTotal,
  currentVoucher,
  onClose,
  onApply,
  onRemove,
}: VoucherSelectionModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'coupons' | 'vouchers'>('all');
  const [vouchers, setVouchers] = useState<VoucherOption[]>([]);
  const [bestOffer, setBestOffer] = useState<VoucherOption | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (visible) {
      loadVouchers();
    }
  }, [visible]);

  const loadVouchers = async () => {
    setLoading(true);
    try {

      const allVouchers: VoucherOption[] = [];

      // Load user's available coupons
      try {
        const couponsResponse = await couponService.getMyCoupons({ status: 'available' });

        if (couponsResponse.success && couponsResponse.data) {
          const coupons: VoucherOption[] = couponsResponse.data.coupons
            .filter((c: any) => c.coupon) // Only include coupons with valid coupon data
            .map((userCoupon: any) => ({
              id: userCoupon._id,
              code: userCoupon.coupon.couponCode,
              type: 'coupon' as const,
              title: userCoupon.coupon.title,
              description: userCoupon.coupon.description,
              value: userCoupon.coupon.discountValue,
              discountType: userCoupon.coupon.discountType,
              minOrderValue: userCoupon.coupon.minOrderValue,
              maxDiscount: userCoupon.coupon.maxDiscountCap,
              expiryDate: userCoupon.expiryDate,
              isActive: userCoupon.status === 'available' && new Date(userCoupon.expiryDate) > new Date(),
            }));

          allVouchers.push(...coupons);

        }
      } catch (error) {
        // silently handle
      }

      // Load user's active vouchers (gift cards)
      try {
        const vouchersResponse = await vouchersService.getUserVouchers({ status: 'active' });

        if (vouchersResponse.success && vouchersResponse.data) {
          const vouchersList: VoucherOption[] = vouchersResponse.data
            .map((userVoucher: any) => ({
              id: userVoucher._id,
              code: userVoucher.voucherCode,
              type: 'voucher' as const,
              title: `${userVoucher.brand?.name || 'Gift Card'} Voucher`,
              description: `${currencySymbol}${userVoucher.denomination} gift voucher`,
              value: userVoucher.denomination,
              discountType: 'FIXED' as const,
              minOrderValue: 0,
              expiryDate: userVoucher.expiryDate,
              isActive: userVoucher.status === 'active' && new Date(userVoucher.expiryDate) > new Date(),
            }));

          allVouchers.push(...vouchersList);

        }
      } catch (error) {
        // silently handle
      }

      // Calculate best offer
      const best = findBestOffer(allVouchers);
      if (best) {
        best.isBestOffer = true;
        if (!isMounted()) return;
        setBestOffer(best);
      }

      if (!isMounted()) return;
      setVouchers(allVouchers);
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const findBestOffer = (options: VoucherOption[]): VoucherOption | null => {
    const eligible = options.filter(v =>
      v.isActive && cartTotal >= v.minOrderValue
    );
    if (eligible.length === 0) return null;

    // Calculate actual discount for each voucher
    const withDiscounts = eligible.map(v => ({
      voucher: v,
      discount: calculateDiscount(v),
    }));

    // Sort by discount amount (highest first)
    withDiscounts.sort((a, b) => b.discount - a.discount);

    return withDiscounts[0]?.voucher || null;
  };

  const calculateDiscount = (voucher: VoucherOption): number => {
    if (voucher.discountType === 'PERCENTAGE') {
      const discount = (cartTotal * voucher.value) / 100;
      return voucher.maxDiscount ? Math.min(discount, voucher.maxDiscount) : discount;
    }
    return Math.min(voucher.value, cartTotal); // Can't discount more than cart total
  };

  const handleApplyManualCode = async () => {
    if (!manualCode.trim()) {
      platformAlertSimple('Error', 'Please enter a coupon code');
      return;
    }

    setLoading(true);
    try {
      // Try to validate the code
      const voucher = vouchers.find(v => v.code.toUpperCase() === manualCode.toUpperCase());

      if (voucher) {
        if (cartTotal >= voucher.minOrderValue) {
          onApply(voucher);
          setManualCode('');
          onClose();
        } else {
          platformAlertSimple('Minimum Order Not Met', `Add ${currencySymbol}${voucher.minOrderValue - cartTotal} more to use this ${voucher.type}`);
        }
      } else {
        platformAlertSimple('Invalid Code', 'The code you entered is not valid or has already been used');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVoucherSelect = (voucher: VoucherOption) => {
    if (!voucher.isActive) {
      platformAlertSimple('Expired', `This ${voucher.type} has expired`);
      return;
    }

    if (cartTotal < voucher.minOrderValue) {
      platformAlertSimple('Minimum Order Not Met', `Add ${currencySymbol}${voucher.minOrderValue - cartTotal} more to use this ${voucher.type}`);
      return;
    }

    onApply(voucher);
    onClose();
  };

  const filteredVouchers = vouchers.filter(v => {
    if (activeTab === 'coupons') return v.type === 'coupon';
    if (activeTab === 'vouchers') return v.type === 'voucher';
    return true;
  });

  const renderVoucherCard = (voucher: VoucherOption) => {
    const isCurrentlyApplied = currentVoucher?.id === voucher.id;
    const isEligible = cartTotal >= voucher.minOrderValue && voucher.isActive;
    const discount = calculateDiscount(voucher);

    return (
      <Pressable
        key={voucher.id}
        style={[
          styles.voucherCard,
          isCurrentlyApplied && styles.appliedCard,
          !isEligible && styles.ineligibleCard,
        ]}
        onPress={() => handleVoucherSelect(voucher)}
        disabled={!isEligible}
       
      >
        <LinearGradient
          colors={
            isCurrentlyApplied
              ? [colors.lightMustard, colors.nileBlue]
              : !isEligible
              ? [colors.neutral[400], colors.neutral[500]]
              : voucher.type === 'coupon'
              ? [colors.brand.purpleLight, colors.brand.purple]
              : [colors.warningScale[400], colors.warningScale[700]]
          }
          style={styles.voucherGradient}
        >
          {/* Best Offer Badge */}
          {voucher.isBestOffer && isEligible && !isCurrentlyApplied && (
            <View style={styles.bestOfferBadge}>
              <Ionicons name="star" size={12} color={colors.background.primary} />
              <ThemedText style={styles.bestOfferText}>Best Offer</ThemedText>
            </View>
          )}

          {/* Type Badge */}
          <View style={styles.typeBadge}>
            <ThemedText style={styles.typeText}>
              {voucher.type === 'coupon' ? 'COUPON' : 'VOUCHER'}
            </ThemedText>
          </View>

          {/* Code */}
          <View style={styles.codeSection}>
            <ThemedText style={styles.code}>{voucher.code}</ThemedText>
            {isCurrentlyApplied && (
              <Ionicons name="checkmark-circle" size={20} color={colors.background.primary} />
            )}
          </View>

          {/* Discount */}
          <ThemedText style={styles.discountValue}>
            {voucher.discountType === 'PERCENTAGE'
              ? `${voucher.value}% OFF`
              : `${currencySymbol}${voucher.value} OFF`}
          </ThemedText>

          {voucher.maxDiscount && voucher.discountType === 'PERCENTAGE' && (
            <ThemedText style={styles.maxDiscount}>
              Up to {currencySymbol}{voucher.maxDiscount}
            </ThemedText>
          )}

          {/* Title & Description */}
          <ThemedText style={styles.voucherTitle} numberOfLines={1}>
            {voucher.title}
          </ThemedText>
          <ThemedText style={styles.voucherDescription} numberOfLines={2}>
            {voucher.description}
          </ThemedText>

          {/* Min Order */}
          {voucher.minOrderValue > 0 && (
            <ThemedText
              style={[
                styles.minOrder,
                isEligible && styles.minOrderMet,
              ]}
            >
              Min order: {currencySymbol}{voucher.minOrderValue}
              {isEligible && ' ✓'}
            </ThemedText>
          )}

          {/* Savings */}
          {isEligible && (
            <View style={styles.savingsSection}>
              <ThemedText style={styles.savingsText}>
                You save: {currencySymbol}{discount.toFixed(0)}
              </ThemedText>
            </View>
          )}

          {/* Expiry */}
          <ThemedText style={styles.expiry}>
            Expires: {new Date(voucher.expiryDate).toLocaleDateString()}
          </ThemedText>
        </LinearGradient>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>
              Apply Coupon or Voucher
            </ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.neutral[700]} />
            </Pressable>
          </View>

          {/* Manual Code Input */}
          <View style={styles.manualCodeSection}>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter coupon or voucher code"
              placeholderTextColor={colors.neutral[400]}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
            />
            <Pressable
              style={styles.applyButton}
              onPress={handleApplyManualCode}
              disabled={loading}
            >
              <ThemedText style={styles.applyButtonText}>Apply</ThemedText>
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => setActiveTab('all')}
            >
              <ThemedText
                style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}
              >
                All ({vouchers.length})
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'coupons' && styles.activeTab]}
              onPress={() => setActiveTab('coupons')}
            >
              <ThemedText
                style={[styles.tabText, activeTab === 'coupons' && styles.activeTabText]}
              >
                Coupons ({vouchers.filter(v => v.type === 'coupon').length})
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'vouchers' && styles.activeTab]}
              onPress={() => setActiveTab('vouchers')}
            >
              <ThemedText
                style={[styles.tabText, activeTab === 'vouchers' && styles.activeTabText]}
              >
                Vouchers ({vouchers.filter(v => v.type === 'voucher').length})
              </ThemedText>
            </Pressable>
          </View>

          {/* Best Offer Banner */}
          {bestOffer && !currentVoucher && (
            <Pressable
              style={styles.bestOfferBanner}
              onPress={() => handleVoucherSelect(bestOffer)}
            >
              <Ionicons name="star" size={20} color={colors.warningScale[400]} />
              <View style={styles.bestOfferContent}>
                <ThemedText style={styles.bestOfferBannerTitle}>
                  Best Offer: {bestOffer.code}
                </ThemedText>
                <ThemedText style={styles.bestOfferBannerDesc}>
                  Save {currencySymbol}{calculateDiscount(bestOffer).toFixed(0)} on this order
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.brand.purpleLight} />
            </Pressable>
          )}

          {/* Voucher List */}
          <ScrollView style={styles.voucherList} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brand.purpleLight} />
                <ThemedText style={styles.loadingText}>Loading offers...</ThemedText>
              </View>
            ) : filteredVouchers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="ticket-outline" size={64} color={colors.neutral[400]} />
                <ThemedText style={styles.emptyTitle}>
                  No {activeTab === 'all' ? 'offers' : activeTab} available
                </ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  Check back later for great deals!
                </ThemedText>
              </View>
            ) : (
              filteredVouchers.map(renderVoucherCard)
            )}
          </ScrollView>

          {/* Current Applied */}
          {currentVoucher && (
            <View style={styles.currentApplied}>
              <View style={styles.currentInfo}>
                <Ionicons name="checkmark-circle" size={20} color={colors.lightMustard} />
                <View style={styles.currentText}>
                  <ThemedText style={styles.currentCode}>
                    {currentVoucher.code} Applied
                  </ThemedText>
                  <ThemedText style={styles.currentSavings}>
                    Saving {currencySymbol}{calculateDiscount(currentVoucher).toFixed(0)}
                  </ThemedText>
                </View>
              </View>
              <Pressable onPress={onRemove} style={styles.removeButton}>
                <ThemedText style={styles.removeButtonText}>Remove</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  closeButton: {
    padding: 4,
  },
  manualCodeSection: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  codeInput: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.neutral[900],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  applyButton: {
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  applyButtonText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.brand.purpleLight,
  },
  tabText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  activeTabText: {
    color: colors.brand.purpleLight,
    fontWeight: '600',
  },
  bestOfferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3E2',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warningScale[400],
  },
  bestOfferContent: {
    flex: 1,
  },
  bestOfferBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.amberDark,
    marginBottom: 2,
  },
  bestOfferBannerDesc: {
    fontSize: 12,
    color: colors.brand.amberDark,
  },
  voucherList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  voucherCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  appliedCard: {
    borderWidth: 2,
    borderColor: colors.nileBlue,
  },
  ineligibleCard: {
    opacity: 0.6,
  },
  voucherGradient: {
    padding: 16,
  },
  bestOfferBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestOfferText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  codeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  code: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 1,
  },
  discountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.background.primary,
    marginBottom: 4,
  },
  maxDiscount: {
    fontSize: 12,
    color: colors.background.primary,
    opacity: 0.9,
    marginBottom: 8,
  },
  voucherTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
    marginBottom: 4,
  },
  voucherDescription: {
    fontSize: 12,
    color: colors.background.primary,
    opacity: 0.9,
    marginBottom: 8,
  },
  minOrder: {
    fontSize: 12,
    color: colors.background.primary,
    opacity: 0.8,
    marginBottom: 8,
  },
  minOrderMet: {
    color: colors.background.primary,
    opacity: 1,
    fontWeight: '600',
  },
  savingsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
  },
  expiry: {
    fontSize: 11,
    color: colors.background.primary,
    opacity: 0.7,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[700],
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  currentApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.linen,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.nileBlue,
  },
  currentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  currentText: {
    flex: 1,
  },
  currentCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 2,
  },
  currentSavings: {
    fontSize: 12,
    color: colors.nileBlue,
  },
  removeButton: {
    backgroundColor: colors.errorScale[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
});

export default React.memo(VoucherSelectionModal);
