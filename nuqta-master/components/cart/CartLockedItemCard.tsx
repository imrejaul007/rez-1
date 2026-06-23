// CartLockedItemCard.tsx - Display locked items with countdown timer
import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { LockedItem } from '@/services/cartApi';
import { triggerImpact } from '@/utils/haptics';
import { useGetCurrencySymbol } from '@/stores/selectors';
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
} from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface CartLockedItemCardProps {
  item: LockedItem;
  onCompletePurchase: (productId: string) => void;
  onCancelLock: (productId: string) => void;
  onPress?: () => void;
}

// Calculate time remaining
function getTimeRemaining(expiresAt: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  isExpired: boolean;
} {
  const total = new Date(expiresAt).getTime() - Date.now();
  const isExpired = total <= 0;

  if (isExpired) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isExpired: true };
  }

  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / 1000 / 60) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
    isExpired: false,
  };
}

// Format countdown display
function formatCountdown(time: ReturnType<typeof getTimeRemaining>): string {
  if (time.isExpired) return 'Expired';

  if (time.days > 0) {
    return `${time.days}d ${time.hours}h ${time.minutes}m`;
  }
  if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
  }
  return `${time.minutes}m ${time.seconds}s`;
}

// Get countdown color based on time remaining
function getCountdownColor(time: ReturnType<typeof getTimeRemaining>): string {
  if (time.isExpired) return colors.error; // Red
  if (time.total < 60 * 60 * 1000) return colors.warningScale[400]; // Yellow - less than 1 hour
  if (time.total < 24 * 60 * 60 * 1000) return colors.brand.orange; // Orange - less than 1 day
  return colors.successScale[400]; // Green - more than 1 day
}

function CartLockedItemCard({
  item,
  onCompletePurchase,
  onCancelLock,
  onPress,
}: CartLockedItemCardProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const backgroundColor = useThemeColor({}, 'background');
  const [timeRemaining, setTimeRemaining] = useState(() => getTimeRemaining(item.expiresAt));

  // Update countdown every second
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const updateTime = () => {
      const time = getTimeRemaining(item.expiresAt);
      setTimeRemaining(time);

      // Stop interval when expired to prevent unnecessary updates
      if (time.isExpired && timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    // Initial update
    updateTime();

    // Only start interval if not already expired
    if (!getTimeRemaining(item.expiresAt).isExpired) {
      timer = setInterval(updateTime, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [item.expiresAt]);

  const handleCompletePurchase = useCallback(() => {
    triggerImpact('Medium');
    onCompletePurchase(item.product._id);
  }, [item.product._id, onCompletePurchase]);

  const handleCancelLock = useCallback(() => {
    triggerImpact('Light');
    onCancelLock(item.product._id);
  }, [item.product._id, onCancelLock]);

  const productImage = item.product.images?.[0]?.url || '';
  const productName = item.product.name || 'Product';
  const isPaidLock = item.isPaidLock || false;
  const lockFee = item.lockFee || 0;
  const countdownColor = getCountdownColor(timeRemaining);

  return (
    <Pressable
      style={[styles.container, { backgroundColor }]}
      onPress={onPress}
     
    >
      {/* Header Badge */}
      <View style={styles.headerBadge}>
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={14} color={colors.brand.purple} />
          <ThemedText style={styles.lockBadgeText}>PRICE LOCKED</ThemedText>
        </View>
        <View style={[styles.timerBadge, { backgroundColor: countdownColor + '15' }]}>
          <Ionicons name="time-outline" size={14} color={countdownColor} />
          <ThemedText style={[styles.timerText, { color: countdownColor }]}>
            {formatCountdown(timeRemaining)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.content}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {productImage ? (
            <CachedImage source={productImage} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={32} color={colors.neutral[300]} />
            </View>
          )}
        </View>

        {/* Product Details */}
        <View style={styles.details}>
          <ThemedText style={styles.productName} numberOfLines={2}>
            {productName}
          </ThemedText>

          {/* Quantity */}
          <ThemedText style={styles.quantity}>
            Qty: {item.quantity}
          </ThemedText>

          {/* Prices */}
          <View style={styles.priceRow}>
            <ThemedText style={styles.lockedPrice}>
              {currencySymbol}{item.lockedPrice.toLocaleString()}
            </ThemedText>
            {item.originalPrice && item.originalPrice > item.lockedPrice && (
              <ThemedText style={styles.originalPrice}>
                {currencySymbol}{item.originalPrice.toLocaleString()}
              </ThemedText>
            )}
          </View>

          {/* Paid Lock Info */}
          {isPaidLock && lockFee > 0 && (
            <View style={styles.paidLockInfo}>
              <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
              <ThemedText style={styles.paidLockText}>
                Paid: {currencySymbol}{lockFee} (Lock Deposit)
              </ThemedText>
            </View>
          )}

          {/* Variant */}
          {item.variant && (
            <ThemedText style={styles.variant}>
              {item.variant.type}: {item.variant.value}
            </ThemedText>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Pressable
          style={styles.cancelButton}
          onPress={handleCancelLock}
         
        >
          <ThemedText style={styles.cancelButtonText}>Cancel Lock</ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.purchaseButton,
            timeRemaining.isExpired && styles.purchaseButtonDisabled,
          ]}
          onPress={handleCompletePurchase}
          disabled={timeRemaining.isExpired}
         
        >
          <Ionicons name="cart" size={16} color={colors.background.primary} />
          <ThemedText style={styles.purchaseButtonText}>
            {timeRemaining.isExpired ? 'Expired' : 'Complete Purchase'}
          </ThemedText>
        </Pressable>
      </View>

      {/* Note about lock fee */}
      {isPaidLock && lockFee > 0 && !timeRemaining.isExpired && (
        <View style={styles.noteContainer}>
          <Ionicons name="information-circle-outline" size={14} color={colors.neutral[500]} />
          <ThemedText style={styles.noteText}>
            {currencySymbol}{lockFee} will be deducted from your final payment
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.sm,
    padding: Spacing.base,
    ...Shadows.medium,
  },
  headerBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.pink,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  lockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.purple,
    letterSpacing: 0.5,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.neutral[50],
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
    lineHeight: 20,
  },
  quantity: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  lockedPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.purple,
  },
  originalPrice: {
    fontSize: 13,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  paidLockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  paidLockText: {
    fontSize: 12,
    color: colors.successScale[400],
    fontWeight: '500',
  },
  variant: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.base,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  purchaseButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.brand.purple,
  },
  purchaseButtonDisabled: {
    backgroundColor: colors.neutral[400],
  },
  purchaseButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background.primary,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  noteText: {
    fontSize: 11,
    color: colors.neutral[500],
    flex: 1,
  },
});

export default React.memo(CartLockedItemCard);
