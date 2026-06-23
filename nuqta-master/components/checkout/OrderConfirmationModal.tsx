import React from 'react';
import { View, Modal, Pressable, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { BRAND } from '@/constants/brand';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface AppliedRedemption {
  code: string;
  benefit: number;
}

interface BillSummary {
  itemTotal?: number;
  lockFeeDiscount?: number;
  promoDiscount?: number;
  coinDiscount?: number;
  totalPayable?: number;
}

interface OrderConfirmationModalProps {
  visible: boolean;
  selectedPaymentMethod: 'cod' | 'wallet' | 'razorpay' | null;
  billSummary: BillSummary | null;
  itemCount: number;
  appliedRedemption: AppliedRedemption | null;
  processingPayment: boolean;
  currencySymbol: string;
  onClose: () => void;
  onConfirm: () => void;
}

function getPaymentMethodLabel(method: string | null): string {
  const labels: Record<string, string> = {
    cod: 'Cash on Delivery',
    wallet: `Wallet (${BRAND.COIN_NAME})`,
    razorpay: 'Online Payment',
  };
  return labels[method || ''] || '';
}

function OrderConfirmationModal({
  visible,
  selectedPaymentMethod,
  billSummary,
  itemCount,
  appliedRedemption,
  processingPayment,
  currencySymbol,
  onClose,
  onConfirm,
}: OrderConfirmationModalProps) {
  const totalPayable = billSummary?.totalPayable || 0;
  const redemptionBenefit = appliedRedemption?.benefit || 0;
  const finalAmount = (totalPayable - redemptionBenefit).toFixed(0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={styles.confirmModalContent}>
          {/* Header */}
          <LinearGradient
            colors={[colors.lightMustard, colors.brand.goldRich]}
            style={styles.confirmModalHeader}
          >
            <View style={styles.confirmModalHeaderContent}>
              <Ionicons name="checkmark-circle" size={32} color="white" />
              <ThemedText style={styles.confirmModalTitle}>Confirm Order</ThemedText>
            </View>
          </LinearGradient>

          {/* Body */}
          <View style={styles.confirmModalBody}>
            <View style={styles.confirmSummaryCard}>
              <View style={styles.confirmSummaryRow}>
                <ThemedText style={styles.confirmSummaryLabel}>Items</ThemedText>
                <ThemedText style={styles.confirmSummaryValue}>
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </ThemedText>
              </View>
              <View style={styles.confirmSummaryRow}>
                <ThemedText style={styles.confirmSummaryLabel}>Subtotal</ThemedText>
                <ThemedText style={styles.confirmSummaryValue}>
                  {currencySymbol}{(billSummary?.itemTotal || 0).toFixed(0)}
                </ThemedText>
              </View>
              {(billSummary?.lockFeeDiscount || 0) > 0 && (
                <View style={styles.confirmSummaryRow}>
                  <ThemedText style={[styles.confirmSummaryLabel, { color: Colors.nileBlue }]}>
                    Lock Fee Already Paid
                  </ThemedText>
                  <ThemedText style={[styles.confirmSummaryValue, { color: Colors.nileBlue }]}>
                    -{currencySymbol}{(billSummary?.lockFeeDiscount || 0).toFixed(0)}
                  </ThemedText>
                </View>
              )}
              {(billSummary?.promoDiscount || 0) > 0 && (
                <View style={styles.confirmSummaryRow}>
                  <ThemedText style={[styles.confirmSummaryLabel, { color: colors.success }]}>
                    Promo Discount
                  </ThemedText>
                  <ThemedText style={[styles.confirmSummaryValue, { color: colors.success }]}>
                    -{currencySymbol}{(billSummary?.promoDiscount || 0).toFixed(0)}
                  </ThemedText>
                </View>
              )}
              {(billSummary?.coinDiscount || 0) > 0 && (
                <View style={styles.confirmSummaryRow}>
                  <ThemedText style={[styles.confirmSummaryLabel, { color: Colors.gold }]}>
                    Coin Discount
                  </ThemedText>
                  <ThemedText style={[styles.confirmSummaryValue, { color: Colors.gold }]}>
                    -{currencySymbol}{(billSummary?.coinDiscount || 0).toFixed(0)}
                  </ThemedText>
                </View>
              )}
              {appliedRedemption && appliedRedemption.benefit > 0 && (
                <View style={styles.confirmSummaryRow}>
                  <ThemedText style={[styles.confirmSummaryLabel, { color: colors.warningScale[400] }]}>
                    Deal Discount ({appliedRedemption.code})
                  </ThemedText>
                  <ThemedText style={[styles.confirmSummaryValue, { color: colors.warningScale[400] }]}>
                    -{currencySymbol}{appliedRedemption.benefit.toFixed(0)}
                  </ThemedText>
                </View>
              )}
              <View style={[styles.confirmSummaryRow, styles.confirmTotalRow]}>
                <ThemedText style={styles.confirmTotalLabel}>Total Amount</ThemedText>
                <ThemedText style={styles.confirmTotalValue}>
                  {currencySymbol}{finalAmount}
                </ThemedText>
              </View>
            </View>

            {/* Payment Method */}
            <View style={styles.confirmPaymentMethod}>
              <ThemedText style={styles.confirmPaymentLabel}>Payment Method</ThemedText>
              <View style={styles.confirmPaymentBadge}>
                {selectedPaymentMethod === 'wallet' ? (
                  <CachedImage
                    source={BRAND.COIN_IMAGE}
                    style={{ width: 18, height: 18 }}
                    contentFit="contain"
                  />
                ) : (
                  <Ionicons
                    name={selectedPaymentMethod === 'cod' ? 'cash' : 'card'}
                    size={18}
                    color={Colors.gold}
                  />
                )}
                <ThemedText style={styles.confirmPaymentValue}>
                  {getPaymentMethodLabel(selectedPaymentMethod)}
                </ThemedText>
              </View>
            </View>

            {/* Trust Badge */}
            <View style={styles.confirmTrustBadge}>
              <Ionicons name="lock-closed" size={14} color={Colors.neutral[500]} />
              <ThemedText style={styles.confirmTrustText}>
                Your payment is secured with 256-bit encryption
              </ThemedText>
            </View>
          </View>

          {/* Footer Buttons */}
          <View style={styles.confirmModalFooter}>
            <Pressable style={styles.confirmCancelButton} onPress={onClose}>
              <ThemedText style={styles.confirmCancelText}>Review Cart</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.confirmPayButton, processingPayment && { opacity: 0.5 }]}
              onPress={onConfirm}
              disabled={processingPayment}
            >
              <LinearGradient
                colors={[colors.lightMustard, colors.brand.goldRich]}
                style={styles.confirmPayGradient}
              >
                <ThemedText style={styles.confirmPayText}>
                  Confirm & Pay {currencySymbol}{finalAmount}
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  confirmModalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    overflow: 'hidden',
  },
  confirmModalHeader: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  confirmModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  confirmModalBody: {
    padding: Spacing.lg,
  },
  confirmSummaryCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  confirmSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  confirmSummaryLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  confirmSummaryValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  confirmTotalRow: {
    borderBottomWidth: 0,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: Colors.border.default,
  },
  confirmTotalLabel: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  confirmTotalValue: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.gold,
  },
  confirmPaymentMethod: {
    marginBottom: Spacing.base,
  },
  confirmPaymentLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  confirmPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successScale[50],
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.successScale[200],
  },
  confirmPaymentValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gold,
  },
  confirmTrustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  confirmTrustText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  confirmModalFooter: {
    flexDirection: 'row',
    padding: Spacing.base,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  confirmPayButton: {
    flex: 2,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  confirmPayGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  confirmPayText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default React.memo(OrderConfirmationModal);
