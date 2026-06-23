import React, { useEffect, useState} from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform} from 'react-native';
import Animated, { runOnJS, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { showAlert } from '@/components/common/CrossPlatformAlert';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { borderRadius, colors, spacing } from '@/constants/theme';

interface LockedItemProps {
  item: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    quantity: number;
    image?: string;
    store?: string;
    variant?: {
      type?: string;
      value?: string;
    };
    lockedAt: Date;
    expiresAt: Date;
    notes?: string;
    productId?: string;
    // Paid lock fields
    lockFee?: number;
    lockFeePercentage?: number;
    lockDuration?: number;
    paymentMethod?: 'wallet' | 'upi';
    lockPaymentStatus?: 'pending' | 'paid' | 'refunded' | 'forfeited' | 'applied';
    isPaidLock?: boolean;
  };
  onMoveToCart: (id: string, productId: string) => void;
  onUnlock: (id: string, productId: string) => void;
  showAnimation?: boolean;
}

function LockedItem({
  item,
  onMoveToCart,
  onUnlock,
  showAnimation = true,
}: LockedItemProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const { width } = Dimensions.get('window');
  const isSmallScreen = width < 360;
  const scaleAnim = useSharedValue(1);
  const fadeAnim = useSharedValue(1);
  const pulseAnim = useSharedValue(1);

  // Live countdown state
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    isUrgent: false,
    isCritical: false,
  });

  // Calculate time remaining with live updates
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const expiresAt = new Date(item.expiresAt);
      const remaining = expiresAt.getTime() - now.getTime();

      if (remaining <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true, isUrgent: false, isCritical: false });
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      const isUrgent = remaining < 24 * 60 * 60 * 1000; // Less than 24 hours
      const isCritical = remaining < 60 * 60 * 1000; // Less than 1 hour

      setTimeLeft({ hours, minutes, seconds, isExpired: false, isUrgent, isCritical });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [item.expiresAt]);

  // Pulse animation for urgent timer
  useEffect(() => {
    let animation: any | null = null;

    if (timeLeft.isCritical && !timeLeft.isExpired) {
      animation = pulseAnim.value = withRepeat(withSequence(withTiming(1.05, { duration: 500 })), -1);
      
    }

    return () => {
      if (animation) {
        // animation auto-cancels
      }
      pulseAnim.value = 1;
    };
  }, [timeLeft.isCritical, timeLeft.isExpired]);

  const { hours: hoursRemaining, minutes: minutesRemaining, seconds: secondsRemaining, isExpired } = timeLeft;

  const handleUnlock = () => {
    if (showAnimation) {
      scaleAnim.value = withTiming(0.8, { duration: 200 });
      fadeAnim.value = withTiming(0, { duration: 200 });
      onUnlock(item.id, item.productId || item.id);
    } else {
      onUnlock(item.id, item.productId || item.id);
    }
  };

  const handleMoveToCart = () => {
    scaleAnim.value = withSequence(withTiming(0.98, { duration: 100 }), withTiming(1, { duration: 100 }));
      onMoveToCart(item.id, item.productId || item.id);
  };

  // Get timer color based on urgency
  const getTimerColor = () => {
    if (isExpired) return { bg: colors.errorScale[100], text: colors.error, icon: colors.error };
    if (timeLeft.isCritical) return { bg: colors.errorScale[100], text: colors.error, icon: colors.error };
    if (timeLeft.isUrgent) return { bg: colors.tint.amberLight, text: colors.warningScale[700], icon: colors.warningScale[400] };
    return { bg: colors.linen, text: colors.nileBlue, icon: colors.lightMustard };
  };

  const timerColors = getTimerColor();

  // Format time display
  const formatTime = () => {
    if (isExpired) return 'Lock Expired';
    if (hoursRemaining > 0) {
      return `${hoursRemaining}h ${minutesRemaining}m ${secondsRemaining}s`;
    }
    return `${minutesRemaining}m ${secondsRemaining}s`;
  };

  // Handle cancel lock with confirmation
  const handleCancelLock = () => {
    const message = item.isPaidLock
      ? `Your lock deposit of ${currencySymbol}${item.lockFee} will be refunded to your ${item.paymentMethod === 'wallet' ? 'Wallet' : 'account'}. Continue?`
      : 'Are you sure you want to cancel this lock?';

    showAlert(
      'Cancel Lock',
      message,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => handleUnlock() },
      ],
      'warning'
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
          marginHorizontal: isSmallScreen ? 12 : 16,
        },
        isExpired && styles.expiredContainer,
      ]}
    >
      {/* Price Locked Header Banner */}
      <LinearGradient
        colors={isExpired ? [colors.error, colors.error] : [colors.nuqta.mustard, colors.nuqta.peach]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerBanner}
      >
        <View style={styles.headerBannerContent}>
          <View style={styles.lockIconWrapper}>
            <Ionicons name="lock-closed" size={14} color={isExpired ? colors.background.primary : colors.nuqta.nileBlue} />
          </View>
          <ThemedText style={[styles.headerBannerText, !isExpired && { color: colors.nuqta.nileBlue }]}>
            {isExpired ? 'LOCK EXPIRED' : 'PRICE LOCKED'}
          </ThemedText>
          {item.isPaidLock && !isExpired && (
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={12} color={colors.nuqta.nileBlue} />
              <ThemedText style={styles.paidBadgeText}>PAID</ThemedText>
            </View>
          )}
        </View>
      </LinearGradient>

      <View style={styles.itemContainer}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {item.image ? (
            <CachedImage
              source={item.image}
              style={styles.productImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={32} color={colors.neutral[400]} />
            </View>
          )}
          {/* Quantity Badge on Image */}
          <View style={styles.quantityOverlay}>
            <ThemedText style={styles.quantityOverlayText}>×{item.quantity}</ThemedText>
          </View>
        </View>

        {/* Product Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.nameRow}>
            <ThemedText style={styles.productName} numberOfLines={2}>
              {item.name}
            </ThemedText>
          </View>

          {item.store && (
            <ThemedText style={styles.storeName} numberOfLines={1}>
              {item.store}
            </ThemedText>
          )}

          {/* Variant */}
          {item.variant && item.variant.type && (
            <View style={styles.variantContainer}>
              <ThemedText style={styles.variantText}>
                {item.variant.type}: {item.variant.value}
              </ThemedText>
            </View>
          )}

          {/* Price Row - Show remaining price for paid locks */}
          <View style={styles.priceRow}>
            {item.isPaidLock && item.lockFee ? (
              <>
                <ThemedText style={styles.price}>
                  {currencySymbol}{((item.price * item.quantity) - item.lockFee).toLocaleString()}
                </ThemedText>
                <ThemedText style={styles.originalPrice}>
                  {currencySymbol}{(item.price * item.quantity).toLocaleString()}
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText style={styles.price}>{currencySymbol}{(item.price * item.quantity).toLocaleString()}</ThemedText>
                {item.originalPrice && item.originalPrice > item.price && (
                  <ThemedText style={styles.originalPrice}>
                    {currencySymbol}{(item.originalPrice * item.quantity).toLocaleString()}
                  </ThemedText>
                )}
              </>
            )}
          </View>

          {/* Paid Lock Deposit Info */}
          {item.isPaidLock && item.lockFee && (
            <View style={styles.depositContainer}>
              <Ionicons name="checkmark-circle" size={14} color={colors.nileBlue} />
              <ThemedText style={styles.depositText}>
                {currencySymbol}{item.lockFee} already paid ({item.lockFeePercentage}% deposit)
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* Timer Section */}
      <Animated.View
        style={[
          styles.timerSection,
          { backgroundColor: timerColors.bg },
          timeLeft.isCritical && { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <View style={styles.timerContent}>
          <Ionicons name="time" size={18} color={timerColors.icon} />
          <View style={styles.timerTextContainer}>
            <ThemedText style={[styles.timerLabel, { color: timerColors.text }]}>
              {isExpired ? 'Expired' : 'Time Remaining'}
            </ThemedText>
            <ThemedText style={[styles.timerValue, { color: timerColors.text }]}>
              {formatTime()}
            </ThemedText>
          </View>
        </View>
        {!isExpired && item.isPaidLock && (
          <View style={styles.securedBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.nileBlue} />
            <ThemedText style={styles.securedText}>Price Secured</ThemedText>
          </View>
        )}
      </Animated.View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {!isExpired ? (
          <>
            <Pressable
              onPress={handleCancelLock}
              style={styles.cancelButton}
             
            >
              <Ionicons name="close" size={18} color={colors.neutral[500]} />
              <ThemedText style={styles.cancelButtonText}>Cancel Lock</ThemedText>
            </Pressable>

            <Pressable
              onPress={handleMoveToCart}
              style={styles.purchaseButtonWrapper}
             
            >
              <LinearGradient
                colors={[colors.nuqta.mustard, colors.nuqta.peach]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.purchaseButton}
              >
                <Ionicons name="cart" size={18} color={colors.nuqta.nileBlue} />
                <ThemedText style={styles.purchaseButtonText}>
                  {item.isPaidLock ? 'Complete Purchase' : 'Move to Cart'}
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={handleCancelLock}
            style={styles.removeExpiredButton}
           
          >
            <Ionicons name="trash" size={18} color={colors.error} />
            <ThemedText style={styles.removeExpiredText}>Remove Expired Lock</ThemedText>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export default React.memo(LockedItem);

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  expiredContainer: {
    opacity: 0.7,
  },
  headerBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  headerBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBannerText: {
    color: colors.background.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  paidBadgeText: {
    color: colors.nuqta.nileBlue,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 14,
    paddingTop: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 14,
  },
  productImage: {
    width: 85,
    height: 85,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  quantityOverlayText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  nameRow: {
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[800],
    lineHeight: 20,
  },
  storeName: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 6,
  },
  variantContainer: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  variantText: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  originalPrice: {
    fontSize: 14,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  depositContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.linen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  depositText: {
    fontSize: 12,
    color: colors.nileBlue,
    fontWeight: '600',
  },
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 10,
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timerTextContainer: {
    gap: 2,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  timerValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  securedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.nuqta.linen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.nuqta.peach,
  },
  securedText: {
    fontSize: 11,
    color: colors.nileBlue,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
    flex: 0.4,
  },
  cancelButtonText: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '600',
  },
  purchaseButtonWrapper: {
    flex: 0.6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  purchaseButtonText: {
    color: colors.nuqta.nileBlue,
    fontSize: 14,
    fontWeight: '700',
  },
  removeExpiredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.errorScale[100],
    flex: 1,
  },
  removeExpiredText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
});
