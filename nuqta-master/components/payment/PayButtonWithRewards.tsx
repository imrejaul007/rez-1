/**
 * Pay Button With Rewards
 *
 * Premium pay button showing amount and rewards preview
 * Nuqta design palette
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RewardsPreview } from '@/types/storePayment.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';

interface PayButtonWithRewardsProps {
  amountToPay: number;
  rewardsPreview?: RewardsPreview;
  isProcessing?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export const PayButtonWithRewards: React.FC<PayButtonWithRewardsProps> = ({
  amountToPay,
  rewardsPreview,
  isProcessing = false,
  disabled = false,
  onPress,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isFreePayment = amountToPay === 0;
  const hasRewards = rewardsPreview && (rewardsPreview.cashback > 0 || rewardsPreview.coinsToEarn > 0);

  return (
    <View style={styles.container}>
      {/* Rewards Preview Banner */}
      {hasRewards && (
        <LinearGradient
          colors={[colors.nuqta.lavender, colors.nuqta.linen]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.rewardsPreview}
        >
          <View style={styles.rewardsIconWrapper}>
            <Ionicons name="gift" size={14} color={colors.nuqta.mustard} />
          </View>
          <Text style={styles.rewardsText}>
            You'll earn{' '}
            {rewardsPreview.cashback > 0 && (
              <Text style={styles.rewardsHighlight}>{currencySymbol}{rewardsPreview.cashback} cashback</Text>
            )}
            {rewardsPreview.cashback > 0 && rewardsPreview.coinsToEarn > 0 && ' + '}
            {rewardsPreview.coinsToEarn > 0 && (
              <Text style={styles.rewardsHighlight}>{rewardsPreview.coinsToEarn} coins</Text>
            )}
            {' '}after payment
          </Text>
        </LinearGradient>
      )}

      {/* Pay Button Row */}
      <View style={styles.buttonRow}>
        {/* Amount Info */}
        <View style={styles.amountInfo}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>{currencySymbol}{amountToPay.toFixed(0)}</Text>
        </View>

        {/* Pay Button */}
        <Pressable
          style={styles.buttonWrapper}
          onPress={onPress}
          disabled={isProcessing || disabled}
         
        >
          <LinearGradient
            colors={
              isProcessing || disabled
                ? [colors.neutral[400], colors.neutral[500]]
                : isFreePayment
                ? [colors.nuqta.nileBlue, colors.brand.nileBlueLight]
                : [colors.nuqta.mustard, colors.nuqta.peach]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={colors.background.primary} />
            ) : (
              <>
                <Text style={[
                  styles.buttonText,
                  !isFreePayment && { color: colors.nuqta.nileBlue }
                ]}>
                  {isFreePayment ? 'Confirm Payment' : `Pay ${currencySymbol}${amountToPay.toFixed(0)}`}
                </Text>
                {!isFreePayment && hasRewards && (
                  <View style={styles.earnBadge}>
                    <Text style={styles.earnText}>& Earn Rewards</Text>
                  </View>
                )}
                <View style={[
                  styles.arrowWrapper,
                  !isFreePayment && { backgroundColor: 'rgba(26, 58, 82, 0.15)' }
                ]}>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={isFreePayment ? colors.background.primary : colors.nuqta.nileBlue}
                  />
                </View>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>

      {/* Security Note */}
      <View style={styles.securityNote}>
        <Ionicons name="shield-checkmark" size={12} color={colors.nuqta.mustard} />
        <Text style={styles.securityText}>
          Secured by 256-bit encryption
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.nuqta.linen,
    ...Platform.select({
      ios: {
        shadowColor: colors.nuqta.nileBlue,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  rewardsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  rewardsIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 205, 87, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardsText: {
    ...typography.caption,
    color: colors.nuqta.nileBlue,
  },
  rewardsHighlight: {
    fontWeight: '700',
    color: colors.nuqta.nileBlue,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  amountInfo: {
    alignItems: 'flex-start',
  },
  amountLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  amountValue: {
    ...typography.h3,
    color: colors.nuqta.nileBlue,
    fontWeight: '800',
  },
  buttonWrapper: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nuqta.mustard,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  buttonText: {
    ...typography.button,
    color: colors.background.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  earnBadge: {
    backgroundColor: 'rgba(26, 58, 82, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  earnText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.nuqta.nileBlue,
    fontWeight: '600',
  },
  arrowWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: 4,
  },
  securityText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.tertiary,
  },
});

export default React.memo(PayButtonWithRewards);
