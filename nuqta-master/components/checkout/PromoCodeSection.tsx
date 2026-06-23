import React from 'react';
import { View, Pressable, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { showToast } from '@/components/common/ToastManager';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface AppliedPromoCode {
  code: string;
  [key: string]: any;
}

interface AppliedRedemption {
  code: string;
  benefit: number;
  storeName?: string;
  dealTitle?: string;
}

interface AppliedOfferRedemption {
  code: string;
  cashbackPercentage: number;
  offerTitle?: string;
  estimatedCashback?: number;
}

interface PromoCodeSectionProps {
  appliedPromoCode?: AppliedPromoCode | null;
  promoDiscount: number;
  availablePromoCodes: any[];
  appliedRedemption: AppliedRedemption | null;
  appliedOfferRedemption: AppliedOfferRedemption | null;
  voucherCodeInput: string;
  validatingRedemption: boolean;
  currencySymbol: string;
  onOpenPromoModal: () => void;
  onRemovePromoCode: () => void;
  onOpenRedemptionModal: () => void;
  onRemoveRedemption: () => void;
  onClearOfferRedemption: () => void;
  onVoucherCodeChange: (text: string) => void;
  onApplyVoucherCode: (code: string) => void;
}

function PromoCodeSection({
  appliedPromoCode,
  promoDiscount,
  availablePromoCodes,
  appliedRedemption,
  appliedOfferRedemption,
  voucherCodeInput,
  validatingRedemption,
  currencySymbol,
  onOpenPromoModal,
  onRemovePromoCode,
  onOpenRedemptionModal,
  onRemoveRedemption,
  onClearOfferRedemption,
  onVoucherCodeChange,
  onApplyVoucherCode,
}: PromoCodeSectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Apply Promocode</ThemedText>

      {/* Applied Promo or Apply Button */}
      {appliedPromoCode ? (
        <View style={styles.appliedPromoCard}>
          <View style={styles.appliedPromoContent}>
            <Ionicons name="pricetag" size={20} color={colors.success} />
            <View style={styles.appliedPromoText}>
              <ThemedText style={styles.appliedPromoTitle}>
                {appliedPromoCode.code} Applied
              </ThemedText>
              <ThemedText style={styles.appliedPromoSubtitle}>
                You saved {currencySymbol}{(promoDiscount || 0).toFixed(0)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.appliedPromoActions}>
            <Pressable onPress={onOpenPromoModal} style={styles.changePromoButton}>
              <ThemedText style={styles.changePromoText}>Change</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                const removedCode = appliedPromoCode?.code;
                onRemovePromoCode();
                setTimeout(() => {
                  showToast({ message: `${removedCode} promo code removed`, type: 'info', duration: 2000 });
                }, 100);
              }}
              style={styles.removePromoButton}
            >
              <Ionicons name="close" size={20} color={colors.error} />
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.promoCodeCard}
          onPress={onOpenPromoModal}
          accessibilityLabel={`Apply coupon. ${availablePromoCodes.length > 0 ? `${availablePromoCodes.length} coupons available` : 'Browse available coupons'}`}
          accessibilityRole="button"
          accessibilityHint="Double tap to view and apply discount coupons"
        >
          <View style={styles.promoCodeContent}>
            <View>
              <ThemedText style={styles.promoCodeTitle}>Apply Coupon</ThemedText>
              <ThemedText style={styles.promoCodeSubtitle}>
                {availablePromoCodes.length > 0
                  ? `${availablePromoCodes.length} coupons available`
                  : 'Browse coupons'}
              </ThemedText>
            </View>
            <Ionicons name="pricetag" size={20} color={Colors.gold} />
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
        </Pressable>
      )}

      {/* Deal Redemption Code Card */}
      {appliedRedemption ? (
        <View style={[styles.promoCodeCard, { backgroundColor: colors.tint.amberLight, borderWidth: 1, borderColor: colors.warningScale[400] }]}>
          <View style={styles.promoCodeContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: colors.warningScale[400], borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '600', color: Colors.text.inverse }}>{appliedRedemption.code}</ThemedText>
              </View>
              <ThemedText style={styles.promoCodeTitle}>{appliedRedemption.dealTitle || 'Deal Applied'}</ThemedText>
            </View>
            <ThemedText style={[styles.promoCodeSubtitle, { color: colors.brand.amberDeep }]}>
              You save {currencySymbol}{appliedRedemption.benefit}
            </ThemedText>
          </View>
          <Pressable onPress={onRemoveRedemption} style={styles.removePromoButton}>
            <Ionicons name="close" size={20} color={colors.error} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.promoCodeCard, { borderWidth: 1, borderColor: colors.neutral[200], borderStyle: 'dashed' }]}
          onPress={onOpenRedemptionModal}
        >
          <View style={styles.promoCodeContent}>
            <View>
              <ThemedText style={styles.promoCodeTitle}>Have a Deal Code?</ThemedText>
              <ThemedText style={styles.promoCodeSubtitle}>Redeem your exclusive deal</ThemedText>
            </View>
            <Ionicons name="gift" size={20} color={colors.warningScale[400]} />
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
        </Pressable>
      )}

      {/* Cashback Voucher Card */}
      {appliedOfferRedemption ? (
        <View style={[styles.promoCodeCard, { backgroundColor: colors.tint.greenLight, borderWidth: 1, borderColor: colors.successScale[400], marginTop: 8 }]}>
          <View style={styles.promoCodeContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: colors.successScale[400], borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '600', color: Colors.text.inverse }}>{appliedOfferRedemption.code}</ThemedText>
              </View>
              <ThemedText style={styles.promoCodeTitle}>{appliedOfferRedemption.offerTitle || 'Cashback Voucher'}</ThemedText>
            </View>
            <ThemedText style={[styles.promoCodeSubtitle, { color: colors.successScale[700] }]}>
              {appliedOfferRedemption.cashbackPercentage}% cashback = {currencySymbol}{appliedOfferRedemption.estimatedCashback}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => {
              onClearOfferRedemption();
              showToast({ message: 'Cashback voucher removed', type: 'info', duration: 2000 });
            }}
            style={styles.removePromoButton}
          >
            <Ionicons name="close" size={20} color={colors.error} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.promoCodeCard, { borderWidth: 1, borderColor: colors.successScale[400], borderStyle: 'dashed', marginTop: 8 }]}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={{
                fontSize: 14,
                color: Colors.text.primary,
                paddingVertical: 8,
                paddingHorizontal: 0,
              }}
              placeholder="Enter cashback voucher code (RED-xxx)"
              placeholderTextColor={Colors.neutral[400]}
              autoCapitalize="characters"
              value={voucherCodeInput}
              onChangeText={onVoucherCodeChange}
              onSubmitEditing={() => {
                if (voucherCodeInput.trim()) {
                  onApplyVoucherCode(voucherCodeInput.trim());
                  onVoucherCodeChange('');
                }
              }}
              returnKeyType="done"
              editable={!validatingRedemption}
            />
          </View>
          <Pressable
            style={{
              backgroundColor: validatingRedemption ? colors.neutral[400] : colors.successScale[400],
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 6,
              opacity: !voucherCodeInput.trim() ? 0.6 : 1,
            }}
            disabled={validatingRedemption || !voucherCodeInput.trim()}
            onPress={() => {
              if (voucherCodeInput.trim()) {
                onApplyVoucherCode(voucherCodeInput.trim());
                onVoucherCodeChange('');
              }
            }}
          >
            <ThemedText style={{ color: Colors.text.inverse, fontWeight: '600', fontSize: 12 }}>
              {validatingRedemption ? 'Validating...' : 'Apply'}
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  promoCodeCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  promoCodeContent: {
    flex: 1,
  },
  promoCodeTitle: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  promoCodeSubtitle: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  appliedPromoCard: {
    backgroundColor: Colors.successScale[50],
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  appliedPromoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appliedPromoText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  appliedPromoTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 2,
  },
  appliedPromoSubtitle: {
    ...Typography.bodySmall,
    color: colors.brand.greenDark,
  },
  appliedPromoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  changePromoButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  changePromoText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  removePromoButton: {
    padding: Spacing.xs,
  },
});

export default React.memo(PromoCodeSection);
