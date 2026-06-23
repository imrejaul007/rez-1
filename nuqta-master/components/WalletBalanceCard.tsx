// @ts-nocheck
import React, { useState, memo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Dimensions} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSpring,
  withRepeat,
  interpolate,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { WalletBalanceCardProps } from '@/types/wallet';
import { colors } from '@/constants/theme';

// Coin type color mapping for expiry indicators
const COIN_TYPE_COLORS: Record<string, { color: string; label: string }> = {
  rez: { color: colors.brand.greenDark, label: 'Never expires' },
  nuqta: { color: colors.brand.greenDark, label: 'Never expires' },
  promo: { color: colors.warningScale[700], label: '' }, // dynamic based on campaign
  branded: { color: colors.brand.blue, label: '' }, // dynamic per brand
};

/**
 * Check if a date is within N days from now
 */
const isExpiringSoon = (expiryDate: Date | undefined, withinDays: number = 7): boolean => {
  if (!expiryDate) return false;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= withinDays;
};

/**
 * Get human-readable expiry label
 */
const getExpiryLabel = (expiryDate: Date | undefined, coinType: string): string => {
  if (coinType === 'rez' || coinType === 'nuqta') return 'Never expires';
  if (!expiryDate) {
    if (coinType === 'promo') return 'Per campaign';
    if (coinType === 'branded') return 'Check store details';
    return '';
  }
  const expiry = new Date(expiryDate);
  return `Expires ${expiry.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
};

const WalletBalanceCardComponent: React.FC<WalletBalanceCardProps> = ({
  coin,
  onPress,
  isLoading = false,
  showChevron = true,
  testID,
}) => {
  const scaleAnim = useSharedValue(1);
  const spinAnim = useSharedValue(0);
  const [imageError, setImageError] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  // Loading animation
  React.useEffect(() => {
    if (isLoading) {
      spinAnim.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1
      );
    } else {
      spinAnim.value = 0;
    }
  }, [isLoading, spinAnim]);

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1);
  };

  const handlePress = useCallback(() => {
    if (onPress && !isLoading) {
      onPress(coin);
    }
  }, [onPress, coin, isLoading]);

  const renderIcon = () => {
    if (imageError) {
      // Icon based on coin type
      const iconName = coin.type === 'rez' ? 'diamond' : coin.type === 'promo' ? 'gift' : 'star';
      const iconColor = coin.color || colors.lightMustard;
      return (
        <View style={[styles.iconWrap, { backgroundColor: coin.backgroundColor }]}>
          <Ionicons
            name={iconName}
            size={20}
            color={iconColor}
          />
        </View>
      );
    }

    return (
      <View style={[styles.iconWrap, { backgroundColor: coin.backgroundColor }]}>
        <CachedImage
          source={coin.iconPath}
          style={styles.icon}
          contentFit="contain"
          onError={() => setImageError(true)}
        />
      </View>
    );
  };

  const styles = createStyles(screenWidth);

  // Determine expiry state
  const expiringSoon = isExpiringSoon(coin.expiryDate, 7);
  const expiryLabel = getExpiryLabel(coin.expiryDate, coin.type);
  const coinTypeColor = COIN_TYPE_COLORS[coin.type]?.color || coin.color || colors.lightMustard;

  // Check if this coin has a pending status (from restrictions or description hints)
  const isPending = coin.restrictions?.includes('pending') ||
    coin.description?.toLowerCase().includes('pending');

  const cardContent = (
    <Animated.View
      style={[styles.cardWrap, { transform: [{ scale: scaleAnim }] }]}
      testID={testID}
    >
      <View style={styles.row}>
        {renderIcon()}

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.label}>{coin.name}</Text>
            <View style={styles.badgeRow}>
              {/* Expiring Soon Warning Badge */}
              {expiringSoon && (
                <View style={styles.expiringSoonBadge}>
                  <Ionicons name="warning" size={10} color={colors.error} />
                  <Text style={styles.expiringSoonText}>Expiring Soon</Text>
                </View>
              )}
              {/* Pending Badge */}
              {isPending && (
                <View style={styles.pendingBadge}>
                  <Ionicons name="hourglass-outline" size={10} color={colors.warningScale[700]} />
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              )}
              {/* Active Badge */}
              {coin.isActive && !isPending && (
                <View style={styles.activeBadge}>
                  <Ionicons name="checkmark-circle" size={10} color="#1dac52ff" />
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={[styles.amount, { color: coin.color || colors.brand.amberDeep }]}>{coin.formattedAmount}</Text>

          {coin.description && (
            <Text style={styles.desc} numberOfLines={2}>
              {coin.description}
            </Text>
          )}

          {/* Color-coded expiry indicator */}
          <View style={styles.expiryContainer}>
            <View style={[styles.coinTypeDot, { backgroundColor: coinTypeColor }]} />
            {expiringSoon ? (
              <>
                <Ionicons name="time-outline" size={12} color={colors.error} />
                <Text style={[styles.expiryText, styles.expiryTextWarning]}>
                  {expiryLabel}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="time-outline" size={12} color={colors.neutral[400]} />
                <Text style={styles.expiryText}>
                  {expiryLabel}
                </Text>
              </>
            )}
          </View>
        </View>

        {showChevron && (
          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
          </View>
        )}
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Animated.View
            style={[
              styles.loadingIndicator,
              {
                transform: [
                  {
                    rotate: interpolate(spinAnim.value, [0, 1], ['0deg', '360deg']),
                  },
                ],
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
       
        disabled={isLoading}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
};

export const WalletBalanceCard = memo(WalletBalanceCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.coin.id === nextProps.coin.id &&
    prevProps.coin.amount === nextProps.coin.amount &&
    prevProps.coin.formattedAmount === nextProps.coin.formattedAmount &&
    prevProps.coin.isActive === nextProps.coin.isActive &&
    prevProps.coin.expiryDate === nextProps.coin.expiryDate &&
    prevProps.coin.type === nextProps.coin.type &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.showChevron === nextProps.showChevron &&
    prevProps.onPress === nextProps.onPress
  );
});

const createStyles = (screenWidth: number) => {
  const isTablet = screenWidth > 768;
  const isSmallScreen = screenWidth < 375;

  return StyleSheet.create({
    cardWrap: {
      backgroundColor: colors.background.primary,
      borderRadius: 14,
      padding: isTablet ? 16 : isSmallScreen ? 10 : 12,
      marginBottom: isTablet ? 12 : 8,
      shadowColor: colors.brand.purple,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: 'rgba(124, 58, 237, 0.08)',
      position: 'relative',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconWrap: {
      width: isTablet ? 42 : isSmallScreen ? 34 : 38,
      height: isTablet ? 42 : isSmallScreen ? 34 : 38,
      borderRadius: isTablet ? 14 : 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: isTablet ? 14 : 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    icon: {
      width: isTablet ? 24 : isSmallScreen ? 20 : 22,
      height: isTablet ? 24 : isSmallScreen ? 20 : 22,
    },
    contentContainer: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    label: {
      color: colors.neutral[900],
      fontWeight: '700',
      fontSize: isTablet ? 15 : isSmallScreen ? 13 : 14,
      letterSpacing: 0.2,
      flex: 1,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 6,
    },
    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E8FDEB',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 8,
    },
    activeBadgeText: {
      color: colors.brand.greenDark,
      fontSize: 9,
      fontWeight: '600',
      marginLeft: 2,
    },
    expiringSoonBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.errorScale[50],
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.errorScale[200],
    },
    expiringSoonText: {
      color: colors.error,
      fontSize: 9,
      fontWeight: '700',
      marginLeft: 3,
    },
    pendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tint.amberLight,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.warningScale[200],
    },
    pendingBadgeText: {
      color: colors.warningScale[700],
      fontSize: 9,
      fontWeight: '600',
      marginLeft: 3,
    },
    amount: {
      color: colors.brand.purple,
      fontWeight: '800',
      fontSize: isTablet ? 17 : isSmallScreen ? 14 : 15,
      marginBottom: 2,
      letterSpacing: 0.3,
    },
    desc: {
      color: colors.neutral[500],
      fontSize: isTablet ? 13 : isSmallScreen ? 11 : 12,
      lineHeight: isTablet ? 17 : 16,
      fontWeight: '500',
    },
    expiryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 4,
    },
    coinTypeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    expiryText: {
      color: colors.neutral[500],
      fontSize: 11,
      fontWeight: '500',
      marginLeft: 2,
    },
    expiryTextWarning: {
      color: colors.error,
      fontWeight: '600',
    },
    chevronContainer: {
      marginLeft: 6,
      padding: 2,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.neutral[200],
      borderTopColor: colors.brand.purple,
    },
  });
};
