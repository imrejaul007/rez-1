// CashbackPreview Component
// Shows potential cashback during payment flow

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

interface CashbackPreviewProps {
  amount: number;
  potentialCashback?: number;
  cashbackPercentage?: number;
  walletBalance?: number;
  onApplyVoucher?: () => void;
  hasAppliedVoucher?: boolean;
  currencySymbol?: string;
}

export const CashbackPreview: React.FC<CashbackPreviewProps> = ({
  amount,
  potentialCashback,
  cashbackPercentage,
  walletBalance,
  onApplyVoucher,
  hasAppliedVoucher = false,
  currencySymbol = '₹',
}) => {
  const router = useRouter();

  // Calculate cashback if percentage provided
  const calculatedCashback = potentialCashback ?? (cashbackPercentage ? (amount * cashbackPercentage / 100) : 0);
  const hasCashback = calculatedCashback > 0;

  if (!hasCashback && walletBalance === undefined && !onApplyVoucher) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Cashback Earned Section */}
      {hasCashback && (
        <View style={styles.cashbackSection}>
          <View style={styles.cashbackHeader}>
            <View style={styles.cashbackIconContainer}>
              <Ionicons name="gift" size={16} color={colors.warningScale[700]} />
            </View>
            <Text style={styles.cashbackTitle}>Cashback Preview</Text>
          </View>

          <View style={styles.cashbackDetails}>
            <View style={styles.cashbackRow}>
              <Text style={styles.cashbackLabel}>You'll earn</Text>
              <View style={styles.cashbackAmountBadge}>
                <Text style={styles.cashbackAmount}>
                  +{currencySymbol}{Math.floor(calculatedCashback)}
                </Text>
              </View>
            </View>

            {cashbackPercentage && (
              <Text style={styles.cashbackPercentage}>
                ({cashbackPercentage}% cashback on this purchase)
              </Text>
            )}

            <View style={styles.cashbackNote}>
              <Ionicons name="wallet-outline" size={12} color={colors.neutral[500]} />
              <Text style={styles.cashbackNoteText}>
                Credited to your wallet after delivery
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Wallet Balance Section */}
      {walletBalance !== undefined && (
        <View style={styles.walletSection}>
          <View style={styles.walletRow}>
            <View style={styles.walletIconContainer}>
              <Ionicons name="card" size={14} color={colors.nileBlue} />
            </View>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletAmount}>
              {currencySymbol}{walletBalance.toLocaleString()}
            </Text>
          </View>

          {walletBalance > 0 && amount > 0 && (
            <Pressable
              style={styles.useWalletButton}
              onPress={() => {
                // Navigate to voucher selection with wallet context
                if (onApplyVoucher) {
                  onApplyVoucher();
                } else {
                  router.push({
                    pathname: '/voucher-select',
                    params: { amount: amount.toString(), returnRoute: '/pay-in-store/payment' },
                  });
                }
              }}
            >
              <Text style={styles.useWalletText}>
                {hasAppliedVoucher ? 'Change Voucher' : 'Apply Voucher'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.nileBlue} />
            </Pressable>
          )}
        </View>
      )}

      {/* Apply Voucher Button (standalone) */}
      {!hasAppliedVoucher && onApplyVoucher && walletBalance === undefined && (
        <Pressable style={styles.applyVoucherButton} onPress={onApplyVoucher}>
          <Ionicons name="ticket-outline" size={18} color={colors.primary[500]} />
          <Text style={styles.applyVoucherText}>Apply Voucher</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cashbackSection: {
    marginBottom: spacing.md,
  },
  cashbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cashbackIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.warningScale[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cashbackTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text.primary,
  },
  cashbackDetails: {
    paddingLeft: 36,
  },
  cashbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cashbackLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  cashbackAmountBadge: {
    backgroundColor: colors.successScale[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  cashbackAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.warningScale[700],
  },
  cashbackPercentage: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  cashbackNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  cashbackNoteText: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  walletSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.nileBlue + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  walletLabel: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  walletAmount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  useWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.nileBlue + '10',
  },
  useWalletText: {
    ...typography.buttonSmall,
    color: colors.nileBlue,
    fontWeight: '600',
  },
  applyVoucherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  applyVoucherText: {
    ...typography.button,
    color: colors.primary[600],
    fontWeight: '600',
  },
});

export default CashbackPreview;
