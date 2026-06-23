/**
 * Redemption Modal Component
 * Handles the complete reward redemption flow
 */

import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { RewardItem, RedemptionResponse } from '@/types/loyaltyRedemption.types';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface RedemptionModalProps {
  visible: boolean;
  reward: RewardItem | null;
  userPoints: number;
  onClose: () => void;
  onRedeem: (reward: RewardItem, quantity: number) => Promise<RedemptionResponse>;
}

function RedemptionModal({
  visible,
  reward,
  userPoints,
  onClose,
  onRedeem,
}: RedemptionModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'confirm' | 'success'>('confirm');
  const [redemptionData, setRedemptionData] = useState<RedemptionResponse | null>(null);
  const isMounted = useIsMounted();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  if (!reward) return null;

  const totalPoints = reward.points * quantity;
  const remainingPoints = userPoints - totalPoints;
  const canRedeem = remainingPoints >= 0;

  const handleRedeem = async () => {
    if (!canRedeem) {
      platformAlertSimple('Insufficient Points', `You need ${Math.abs(remainingPoints)} more points.`);
      return;
    }

    try {
      setLoading(true);
      const result = await onRedeem(reward, quantity);
      if (!isMounted()) return;
      setRedemptionData(result);
      setStep('success');
    } catch (error) {
      platformAlertSimple('Redemption Failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setQuantity(1);
    setRedemptionData(null);
    onClose();
  };

  const renderConfirmStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.rewardPreview}>
        <View style={styles.iconLarge}>
          <Ionicons name="gift" size={48} color={colors.brand.purpleLight} />
        </View>
        <ThemedText style={styles.rewardTitle}>{reward.title}</ThemedText>
        <ThemedText style={styles.rewardDescription}>{reward.description}</ThemedText>
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Reward Value</ThemedText>
          <ThemedText style={styles.detailValue}>
            {reward.type === 'percentageDiscount' ? `${reward.value}%` : `${currencySymbol}${reward.value}`}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Points Required</ThemedText>
          <View style={styles.pointsRow}>
            <Ionicons name="diamond" size={16} color={colors.warningScale[400]} />
            <ThemedText style={styles.pointsValue}>{reward.points}</ThemedText>
          </View>
        </View>

        {reward.stockRemaining !== undefined && (
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Available</ThemedText>
            <ThemedText style={styles.detailValue}>{reward.stockRemaining} left</ThemedText>
          </View>
        )}

        {reward.validUntil && (
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Valid Until</ThemedText>
            <ThemedText style={styles.detailValue}>
              {new Date(reward.validUntil).toLocaleDateString()}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.quantityCard}>
        <ThemedText style={styles.sectionTitle}>Quantity</ThemedText>
        <View style={styles.quantityControls}>
          <Pressable
            style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Ionicons name="remove" size={24} color={quantity <= 1 ? colors.neutral[300] : colors.brand.purpleLight} />
          </Pressable>

          <View style={styles.quantityDisplay}>
            <ThemedText style={styles.quantityText}>{quantity}</ThemedText>
          </View>

          <Pressable
            style={styles.quantityButton}
            onPress={() => setQuantity(quantity + 1)}
          >
            <Ionicons name="add" size={24} color={colors.brand.purpleLight} />
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <ThemedText style={styles.sectionTitle}>Summary</ThemedText>

        <View style={styles.summaryRow}>
          <ThemedText style={styles.summaryLabel}>Current Points</ThemedText>
          <View style={styles.summaryValue}>
            <Ionicons name="diamond" size={16} color={colors.warningScale[400]} />
            <ThemedText style={styles.summaryPoints}>{userPoints}</ThemedText>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <ThemedText style={styles.summaryLabel}>Points to Redeem</ThemedText>
          <View style={styles.summaryValue}>
            <Ionicons name="diamond" size={16} color={colors.error} />
            <ThemedText style={[styles.summaryPoints, { color: colors.error }]}>
              -{totalPoints}
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <ThemedText style={styles.summaryLabelBold}>Remaining Points</ThemedText>
          <View style={styles.summaryValue}>
            <Ionicons name="diamond" size={18} color={canRedeem ? colors.lightMustard : colors.error} />
            <ThemedText
              style={[
                styles.summaryPointsBold,
                { color: canRedeem ? colors.lightMustard : colors.error },
              ]}
            >
              {remainingPoints}
            </ThemedText>
          </View>
        </View>
      </View>

      {reward.termsAndConditions && reward.termsAndConditions.length > 0 && (
        <View style={styles.termsCard}>
          <ThemedText style={styles.termsTitle}>Terms & Conditions</ThemedText>
          {reward.termsAndConditions.map((term, index) => (
            <View key={index} style={styles.termRow}>
              <ThemedText style={styles.termBullet}>•</ThemedText>
              <ThemedText style={styles.termText}>{term}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <Animated.View entering={FadeIn.duration(500)} style={styles.successContent}>
        <View style={styles.successIconContainer}>
          <LinearGradient
            colors={[colors.lightMustard, colors.nileBlue]}
            style={styles.successIconGradient}
          >
            <Ionicons name="checkmark-circle" size={80} color={colors.background.primary} />
          </LinearGradient>
        </View>

        <ThemedText style={styles.successTitle}>Redemption Successful!</ThemedText>
        <ThemedText style={styles.successMessage}>
          You've successfully redeemed {reward.title}
        </ThemedText>

        {redemptionData?.voucher && (
          <View style={styles.voucherCard}>
            <ThemedText style={styles.voucherLabel}>Your Voucher Code</ThemedText>
            <View style={styles.voucherCodeContainer}>
              <ThemedText style={styles.voucherCode}>{redemptionData.voucher.code}</ThemedText>
            </View>
            <ThemedText style={styles.voucherExpiry}>
              Valid until {new Date(redemptionData.voucher.expiryDate).toLocaleDateString()}
            </ThemedText>
          </View>
        )}

        <View style={styles.newBalanceCard}>
          <ThemedText style={styles.newBalanceLabel}>New Points Balance</ThemedText>
          <View style={styles.newBalanceValue}>
            <Ionicons name="diamond" size={24} color={colors.warningScale[400]} />
            <ThemedText style={styles.newBalancePoints}>
              {redemptionData?.newBalance || remainingPoints}
            </ThemedText>
          </View>
        </View>

        <Pressable style={styles.doneButton} onPress={handleClose}>
          <ThemedText style={styles.doneButtonText}>Done</ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(300)}
          style={styles.modal}
        >
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>
              {step === 'confirm' ? 'Redeem Reward' : 'Success'}
            </ThemedText>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.neutral[500]} />
            </Pressable>
          </View>

          {step === 'confirm' ? renderConfirmStep() : renderSuccessStep()}

          {step === 'confirm' && (
            <View style={styles.footer}>
              <Pressable
                style={[styles.redeemButton, (!canRedeem || loading) && styles.redeemButtonDisabled]}
                onPress={handleRedeem}
                disabled={!canRedeem || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.background.primary} />
                ) : (
                  <>
                    <ThemedText style={styles.redeemButtonText}>Confirm Redemption</ThemedText>
                    <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
                  </>
                )}
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  rewardPreview: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 8,
  },
  rewardDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  detailsCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  quantityCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityDisplay: {
    minWidth: 60,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  summaryCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  summaryLabelBold: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  summaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  summaryPointsBold: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: 12,
  },
  termsCard: {
    marginBottom: 16,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  termRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  termBullet: {
    fontSize: 14,
    color: colors.neutral[500],
    marginRight: 8,
  },
  termText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  redeemButton: {
    backgroundColor: colors.brand.purpleLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  redeemButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  redeemButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // Success step styles
  successContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  successContent: {
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 24,
  },
  voucherCard: {
    width: '100%',
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.brand.purpleLight,
    borderStyle: 'dashed',
  },
  voucherLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 12,
  },
  voucherCodeContainer: {
    backgroundColor: colors.background.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  voucherCode: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.brand.purpleLight,
    textAlign: 'center',
    letterSpacing: 2,
  },
  voucherExpiry: {
    fontSize: 12,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  newBalanceCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  newBalanceLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  newBalanceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newBalancePoints: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.warningScale[400],
  },
  doneButton: {
    width: '100%',
    backgroundColor: colors.brand.purpleLight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
});

export default React.memo(RedemptionModal);
