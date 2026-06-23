import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

interface PaymentFailedBannerProps {
  daysRemaining?: number;
  onRetryPayment: () => void;
}

/**
 * Warning banner shown when a subscription is in grace_period status
 * (payment failed but access hasn't been revoked yet).
 */
function PaymentFailedBanner({ daysRemaining, onRetryPayment }: PaymentFailedBannerProps) {
  return (
    <View style={styles.banner}>
      <View style={styles.iconRow}>
        <Ionicons name="warning" size={22} color={colors.error} />
        <ThemedText style={styles.title}>Payment Failed</ThemedText>
      </View>
      <ThemedText style={styles.message}>
        Your last payment didn't go through.
        {daysRemaining !== undefined && daysRemaining > 0
          ? ` You have ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} to update your payment method before losing access.`
          : ' Please update your payment method to keep your benefits.'}
      </ThemedText>
      <Pressable style={styles.retryButton} onPress={onRetryPayment}>
        <Ionicons name="card-outline" size={18} color={colors.background.primary} />
        <ThemedText style={styles.retryText}>Retry Payment</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.errorScale[50],
    borderWidth: 1,
    borderColor: colors.errorScale[200],
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    color: '#991B1B',
    marginBottom: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.error,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default React.memo(PaymentFailedBanner);
