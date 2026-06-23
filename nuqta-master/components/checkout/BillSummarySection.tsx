import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { BRAND } from '@/constants/brand';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface AppliedRedemption {
  code: string;
  benefit: number;
}

interface AppliedOfferRedemption {
  code: string;
  cashbackPercentage: number;
  estimatedCashback?: number;
}

interface BillSummary {
  itemTotal?: number;
  getAndItemTotal?: number;
  deliveryFee?: number;
  platformFee?: number;
  taxes?: number;
  lockFeeDiscount?: number;
  promoDiscount?: number;
  cardOfferDiscount?: number;
  coinDiscount?: number;
  roundOff?: number;
  totalPayable?: number;
  savings?: number;
}

interface BillSummarySectionProps {
  billSummary: BillSummary | null;
  items: any[];
  appliedRedemption: AppliedRedemption | null;
  appliedOfferRedemption: AppliedOfferRedemption | null;
  showPlatformFeeInfo: boolean;
  currencySymbol: string;
  onTogglePlatformFeeInfo: () => void;
}

function BillSummarySection({
  billSummary,
  items,
  appliedRedemption,
  appliedOfferRedemption,
  showPlatformFeeInfo,
  currencySymbol,
  onTogglePlatformFeeInfo,
}: BillSummarySectionProps) {
  const deliveryFee = billSummary?.deliveryFee || 0;
  const itemTotal = billSummary?.itemTotal || 0;
  const FREE_DELIVERY_THRESHOLD = 500;
  const uniqueStores = new Set(items.map((item: any) => item.storeId).filter(Boolean));
  const wouldBeDeliveryFee = uniqueStores.size > 0 ? uniqueStores.size * 50 : 50;
  const amountForFreeDelivery = FREE_DELIVERY_THRESHOLD - itemTotal;
  const totalPayable = billSummary?.totalPayable || 0;
  const redemptionBenefit = appliedRedemption?.benefit || 0;
  const totalSavings = (billSummary?.savings || 0) + redemptionBenefit;

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Bill Summary</ThemedText>

      <View style={styles.billSummaryCard}>
        {/* Item Total */}
        <View style={styles.summaryRow}>
          <ThemedText style={styles.summaryLabel}>Item Total</ThemedText>
          <ThemedText style={styles.summaryValue}>
            {currencySymbol}{itemTotal.toFixed(0)}
          </ThemedText>
        </View>

        {/* Get & Item Total */}
        {(billSummary?.getAndItemTotal || 0) > 0 && (
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Get & item Total</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {currencySymbol}{(billSummary?.getAndItemTotal || 0).toFixed(0)}
            </ThemedText>
          </View>
        )}

        {/* Delivery Fee */}
        <View style={styles.summaryRow}>
          <ThemedText style={styles.summaryLabel}>Delivery Fee</ThemedText>
          {deliveryFee === 0 && itemTotal >= FREE_DELIVERY_THRESHOLD ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ThemedText style={[styles.summaryValue, { textDecorationLine: 'line-through', color: Colors.neutral[400], fontSize: 12 }]}>
                {currencySymbol}{wouldBeDeliveryFee}
              </ThemedText>
              <ThemedText style={[styles.summaryValue, { color: colors.success, fontWeight: '600' }]}>FREE</ThemedText>
            </View>
          ) : deliveryFee > 0 ? (
            <ThemedText style={styles.summaryValue}>
              {currencySymbol}{deliveryFee.toFixed(0)}
            </ThemedText>
          ) : (
            <ThemedText style={[styles.summaryValue, { color: colors.success }]}>FREE</ThemedText>
          )}
        </View>

        {/* Free delivery hint */}
        {deliveryFee > 0 && amountForFreeDelivery > 0 && (
          <View style={{ paddingVertical: 4, paddingHorizontal: 4 }}>
            <ThemedText style={{ fontSize: 11, color: colors.success, fontStyle: 'italic' }}>
              Add {currencySymbol}{amountForFreeDelivery.toFixed(0)} more for FREE delivery!
            </ThemedText>
          </View>
        )}

        {/* Platform Fee */}
        {(billSummary?.platformFee || 0) > 0 && (
          <View>
            <View style={styles.summaryRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ThemedText style={styles.summaryLabel}>Platform Fee</ThemedText>
                <Pressable onPress={onTogglePlatformFeeInfo}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.neutral[500]} />
                </Pressable>
              </View>
              <ThemedText style={styles.summaryValue}>
                {currencySymbol}{(billSummary?.platformFee || 0).toFixed(0)}
              </ThemedText>
            </View>
            {showPlatformFeeInfo && (
              <View style={{ backgroundColor: Colors.background.secondary, padding: 8, borderRadius: 6, marginTop: 4, marginBottom: 4 }}>
                <ThemedText style={{ fontSize: 12, color: Colors.neutral[500], lineHeight: 16 }}>
                  Platform fee covers operational costs for order processing, customer support, and maintaining secure payment systems.
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Taxes */}
        {(billSummary?.taxes || 0) > 0 && (
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Taxes</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {currencySymbol}{(billSummary?.taxes || 0).toFixed(0)}
            </ThemedText>
          </View>
        )}

        {/* Lock Fee Discount */}
        {(billSummary?.lockFeeDiscount || 0) > 0 && (
          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: Colors.nileBlue }]}>
              Lock Fee Already Paid
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: Colors.nileBlue }]}>
              -{currencySymbol}{(billSummary?.lockFeeDiscount || 0).toFixed(0)}
            </ThemedText>
          </View>
        )}

        {/* Promo Discount */}
        {(billSummary?.promoDiscount || 0) > 0 && (
          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: colors.success }]}>
              Promo Discount
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: colors.success }]}>
              -{currencySymbol}{(billSummary?.promoDiscount || 0).toFixed(0)}
            </ThemedText>
          </View>
        )}

        {/* Card Offer Discount */}
        {(billSummary?.cardOfferDiscount || 0) > 0 && (
          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: Colors.gold }]}>
              Card Offer Discount
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: Colors.gold }]}>
              -{currencySymbol}{(billSummary?.cardOfferDiscount || 0).toFixed(0)}
            </ThemedText>
          </View>
        )}

        {/* Deal Redemption */}
        {appliedRedemption && appliedRedemption.benefit > 0 && (
          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: colors.warningScale[400] }]}>
              Deal Discount ({appliedRedemption.code})
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: colors.warningScale[400] }]}>
              -{currencySymbol}{appliedRedemption.benefit.toFixed(0)}
            </ThemedText>
          </View>
        )}

        {/* Cashback Voucher */}
        {appliedOfferRedemption && appliedOfferRedemption.estimatedCashback && appliedOfferRedemption.estimatedCashback > 0 && (
          <View style={[styles.summaryRow, { backgroundColor: colors.tint.greenLight, padding: 8, borderRadius: 6, marginVertical: 4 }]}>
            <View>
              <ThemedText style={[styles.summaryLabel, { color: colors.successScale[700], fontWeight: '600' }]}>
                Cashback ({appliedOfferRedemption.code})
              </ThemedText>
              <ThemedText style={{ fontSize: 10, color: Colors.neutral[500] }}>
                Will be credited to wallet after order
              </ThemedText>
            </View>
            <ThemedText style={[styles.summaryValue, { color: colors.successScale[700], fontWeight: '600' }]}>
              +{currencySymbol}{appliedOfferRedemption.estimatedCashback}
            </ThemedText>
          </View>
        )}

        {/* Coin Discount */}
        {(billSummary?.coinDiscount || 0) > 0 && (
          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: Colors.gold }]}>
              {`${BRAND.COIN_SINGLE} Discount`}
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: Colors.gold }]}>
              -{currencySymbol}{(billSummary?.coinDiscount || 0).toFixed(0)}
            </ThemedText>
          </View>
        )}

        {/* Round Off */}
        <View style={styles.summaryRow}>
          <ThemedText style={styles.summaryLabel}>Round off</ThemedText>
          <ThemedText style={styles.summaryValue}>
            {currencySymbol}{Math.abs(billSummary?.roundOff || 0).toFixed(2)}
          </ThemedText>
        </View>
      </View>

      {/* Total Payable */}
      <View style={styles.totalPayableCard}>
        <ThemedText style={styles.totalPayableLabel}>Total payable</ThemedText>
        <ThemedText style={styles.totalPayableValue}>
          {currencySymbol}{Math.max(0, totalPayable - redemptionBenefit).toFixed(0)}
        </ThemedText>
      </View>

      {/* Savings */}
      {totalSavings > 0 && (
        <View style={styles.savingsCard}>
          <ThemedText style={styles.savingsText}>
            {'\uD83C\uDF89'} You saved {currencySymbol}{totalSavings.toFixed(0)} on this order!
          </ThemedText>
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
  billSummaryCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.background.secondary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  totalPayableCard: {
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  totalPayableLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  totalPayableValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  savingsCard: {
    backgroundColor: '#FEF3E2',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  savingsText: {
    ...Typography.body,
    fontWeight: '600',
    color: colors.warningScale[700],
    textAlign: 'center',
  },
});

export default React.memo(BillSummarySection);
