import React from 'react';
import {
  View,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { showToast } from '@/components/common/ToastManager';
import { TIER_HIERARCHY } from '@/constants/loyalty';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'CASHBACK';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  tierRequirement?: string | null;
  title?: string;
  validUntil?: string;
  isActive?: boolean;
  termsAndConditions?: string[];
}

interface PromoCodeModalProps {
  visible: boolean;
  promoCode: string;
  availablePromoCodes: PromoCode[];
  appliedPromoCode?: { code: string } | null;
  items: any[];
  userLoyaltyTier: string | null;
  applyingPromo: boolean;
  currencySymbol: string;
  onClose: () => void;
  onPromoCodeChange: (text: string) => void;
  onApplyPromoCode: () => void;
  onQuickPromoSelect: (code: string) => void;
}

function PromoCodeModal({
  visible,
  promoCode,
  availablePromoCodes,
  appliedPromoCode,
  items,
  userLoyaltyTier,
  applyingPromo,
  currencySymbol,
  onClose,
  onPromoCodeChange,
  onApplyPromoCode,
  onQuickPromoSelect,
}: PromoCodeModalProps) {
  const router = useRouter();
  const itemTotal = items.reduce((total: number, item: any) => total + (item.price * item.quantity), 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Apply Promo Code</ThemedText>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.neutral[700]} />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <TextInput
              style={styles.promoInput}
              placeholder="Enter promo code"
              value={promoCode}
              onChangeText={onPromoCodeChange}
              autoCapitalize="characters"
              autoFocus={true}
            />

            <View style={styles.availablePromos}>
              <View style={styles.promoHeaderRow}>
                <ThemedText style={styles.availablePromosTitle}>Available Coupons:</ThemedText>
                <Pressable onPress={() => { onClose(); router.push('/account/coupons'); }}>
                  <ThemedText style={styles.viewAllLink}>View All &#x2192;</ThemedText>
                </Pressable>
              </View>

              {availablePromoCodes.length === 0 ? (
                <View style={styles.noCouponsContainer}>
                  <Ionicons name="pricetag-outline" size={48} color={Colors.neutral[400]} />
                  <ThemedText style={styles.noCouponsText}>No coupons available</ThemedText>
                  <Pressable
                    style={styles.browseCouponsButton}
                    onPress={() => { onClose(); router.push('/account/coupons'); }}
                  >
                    <ThemedText style={styles.browseCouponsText}>Browse Coupons</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <ScrollView
                  style={styles.promoScrollView}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {availablePromoCodes.map((promo) => {
                    const isCurrentlyApplied = appliedPromoCode?.code === promo.code;
                    const minOrderEligible = itemTotal >= promo.minOrderValue;

                    const requiresTier = promo.tierRequirement ||
                      (promo.title?.toLowerCase().includes('gold') ? 'gold' :
                       promo.title?.toLowerCase().includes('silver') ? 'silver' :
                       promo.title?.toLowerCase().includes('platinum') ? 'platinum' : null);
                    const tierName = requiresTier || 'premium';

                    const userTierLevel = userLoyaltyTier ? TIER_HIERARCHY[userLoyaltyTier] || 0 : 0;
                    const requiredTierLevel = requiresTier ? TIER_HIERARCHY[requiresTier] || 0 : 0;
                    const meetsTierRequirement = !requiresTier || userTierLevel >= requiredTierLevel;

                    const isEligible = minOrderEligible && meetsTierRequirement;

                    const discountDisplay = promo.discountType === 'PERCENTAGE'
                      ? `${promo.discountValue}% OFF`
                      : `${currencySymbol}${promo.discountValue} OFF`;

                    return (
                      <Pressable
                        key={promo.id}
                        style={[
                          styles.promoOption,
                          isCurrentlyApplied && styles.currentPromoOption,
                          !isEligible && styles.ineligiblePromoOption,
                          applyingPromo && styles.promoOptionDisabled,
                        ]}
                        onPress={() => {
                          if (applyingPromo) return;
                          if (isEligible) {
                            onQuickPromoSelect(promo.code);
                          } else if (requiresTier && !meetsTierRequirement) {
                            const upgradeMessage = userLoyaltyTier
                              ? `\uD83D\uDD12 ${tierName.toUpperCase()} MEMBERS ONLY - Upgrade from ${userLoyaltyTier.toUpperCase()} to ${tierName.toUpperCase()} to unlock this ${promo.discountValue}${promo.discountType === 'PERCENTAGE' ? '%' : currencySymbol} discount!`
                              : `\uD83D\uDD12 ${tierName.toUpperCase()} MEMBERS ONLY - Become a member to unlock this ${promo.discountValue}${promo.discountType === 'PERCENTAGE' ? '%' : currencySymbol} discount!`;
                            showToast({ message: upgradeMessage, type: 'warning', duration: 4000 });
                          } else {
                            showToast({
                              message: `\u26A0\uFE0F Minimum order value of ${currencySymbol}${promo.minOrderValue} required for this coupon`,
                              type: 'warning',
                              duration: 3000,
                            });
                          }
                        }}
                        disabled={applyingPromo}
                      >
                        <View style={styles.promoOptionContent}>
                          <View style={styles.promoDiscountBadge}>
                            <ThemedText style={styles.promoDiscountText}>{discountDisplay}</ThemedText>
                          </View>
                          <View style={styles.promoOptionText}>
                            <ThemedText style={[
                              styles.promoOptionCode,
                              isCurrentlyApplied && styles.currentPromoCode,
                              !isEligible && styles.ineligibleText,
                            ]}>
                              {promo.code}
                            </ThemedText>
                            <ThemedText style={[
                              styles.promoOptionDesc,
                              !isEligible && styles.ineligibleText,
                            ]}>
                              {promo.description}
                            </ThemedText>
                            {requiresTier && (
                              <View style={styles.tierBadge}>
                                <Ionicons name="lock-closed" size={10} color={colors.warningScale[400]} />
                                <ThemedText style={styles.tierBadgeText}>
                                  {tierName.toUpperCase()} MEMBERS ONLY
                                </ThemedText>
                              </View>
                            )}
                            {promo.minOrderValue > 0 && (
                              <ThemedText style={[styles.minOrderText, minOrderEligible && styles.eligibleMinOrder]}>
                                Min order: {currencySymbol}{promo.minOrderValue}
                              </ThemedText>
                            )}
                          </View>
                          {isCurrentlyApplied && (
                            <View style={styles.appliedBadge}>
                              <Ionicons name="checkmark" size={14} color="white" />
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.applyPromoButton, applyingPromo && styles.applyPromoButtonDisabled]}
              onPress={onApplyPromoCode}
              disabled={applyingPromo}
            >
              {applyingPromo ? (
                <View style={styles.applyPromoLoading}>
                  <ActivityIndicator size="small" color="white" />
                  <ThemedText style={styles.applyPromoText}>Applying...</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.applyPromoText}>Apply Code</ThemedText>
              )}
            </Pressable>
          </View>
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
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingTop: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  promoInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  availablePromos: {
    marginTop: 10,
  },
  promoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  availablePromosTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  viewAllLink: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.gold,
  },
  promoScrollView: {
    maxHeight: 400,
    marginTop: 12,
  },
  noCouponsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noCouponsText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
    marginBottom: Spacing.base,
  },
  browseCouponsButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
  },
  browseCouponsText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  promoOption: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  currentPromoOption: {
    backgroundColor: Colors.successScale[50],
    borderColor: colors.success,
    borderWidth: 2,
  },
  ineligiblePromoOption: {
    backgroundColor: colors.tint.warmGray,
    opacity: 0.6,
  },
  promoOptionDisabled: {
    opacity: 0.5,
  },
  promoOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  promoDiscountBadge: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  promoDiscountText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  promoOptionText: {
    flex: 1,
  },
  promoOptionCode: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.gold,
    marginBottom: 2,
  },
  currentPromoCode: {
    color: colors.success,
  },
  ineligibleText: {
    color: Colors.text.tertiary,
  },
  promoOptionDesc: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  minOrderText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: '500',
    marginTop: 2,
  },
  eligibleMinOrder: {
    color: colors.success,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginTop: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  tierBadgeText: {
    ...Typography.caption,
    color: Colors.warning,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  appliedBadge: {
    backgroundColor: colors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  applyPromoButton: {
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  applyPromoButtonDisabled: {
    backgroundColor: '#86EFAC',
  },
  applyPromoLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  applyPromoText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default React.memo(PromoCodeModal);
