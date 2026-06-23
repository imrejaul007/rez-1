/**
 * Reward Unlocked Popup Component
 *
 * A bottom floating popup that appears after purchases to show earned rewards.
 * Uses ReZ brand colors: Green gradient background, Golden text/buttons.
 */

import React, { useEffect } from 'react';
import { BRAND } from '@/constants/brand';
import { catchSilent } from '@/utils/catchAndReport';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

export interface RewardUnlockedData {
  id: string;
  type: 'coins' | 'cashback' | 'voucher' | 'discount' | 'freebie';
  title: string; // e.g., "Reward unlocked!"
  description: string; // e.g., "Claim Free Cold/Hot Beverage" or "+50 Nuqta Coins"
  amount?: number; // For coins: the amount earned
  isExpiring?: boolean; // Show expiring badge
  expiryText?: string; // e.g., "Expiring" or "24h left"
  icon?: 'coin' | 'cash' | 'gift' | 'ticket' | 'beverage' | 'food';
  onClaim?: () => void;
  onDismiss?: () => void;
  duration?: number; // Auto-dismiss after duration (ms), 0 = no auto-dismiss
}

interface RewardUnlockedPopupProps {
  data: RewardUnlockedData;
  onDismiss: () => void;
}

function RewardUnlockedPopup({ data, onDismiss }: RewardUnlockedPopupProps) {
  const translateY = useSharedValue(150);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  const {
    type,
    title,
    description,
    amount,
    isExpiring,
    expiryText = 'Expiring',
    icon,
    onClaim,
    duration = 8000,
  } = data;

  useEffect(() => {
    // Haptic feedback on show
    if (Platform.OS !== 'web') {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch (e) { catchSilent(e, 'RewardUnlockedPopup/haptics'); }
    }

    // Entrance animation
    translateY.value = withSpring(0);
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 6 });

    // Auto dismiss after duration (if duration > 0)
    let timer: NodeJS.Timeout | null = null;
    if (duration > 0) {
      timer = setTimeout(() => {
        handleDismiss();
      }, duration);
    }

    return () => { if (timer) clearTimeout(timer); };
  }, []);

  const handleDismiss = () => {
    translateY.value = withTiming(150, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 });
    scale.value = withTiming(0.9, { duration: 250 });
    setTimeout(() => {
      data.onDismiss?.();
      onDismiss();
    }, 250);
  };

  const handleClaim = () => {
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); } catch (e) { catchSilent(e, 'RewardUnlockedPopup/haptics'); }
    }
    onClaim?.();
    handleDismiss();
  };

  const getIconComponent = () => {
    const iconName = icon || getDefaultIcon();

    // For coins, use the ReZ coin image if available
    if (type === 'coins' || iconName === 'coin') {
      return (
        <View style={styles.iconCircle}>
          <CachedImage
            source={BRAND.COIN_IMAGE}
            style={styles.coinImage}
            contentFit="contain"
          />
        </View>
      );
    }

    // For other types, use Ionicons
    const ionIconName = getIonIconName(iconName);
    return (
      <View style={[styles.iconCircle, { backgroundColor: getIconBgColor() }]}>
        <Ionicons name={ionIconName} size={28} color={colors.background.primary} />
      </View>
    );
  };

  const getDefaultIcon = (): string => {
    switch (type) {
      case 'coins':
        return 'coin';
      case 'cashback':
        return 'cash';
      case 'voucher':
        return 'ticket';
      case 'discount':
        return 'ticket';
      case 'freebie':
        return 'gift';
      default:
        return 'gift';
    }
  };

  const getIonIconName = (iconType: string): any => {
    switch (iconType) {
      case 'coin':
        return 'diamond';
      case 'cash':
        return 'cash';
      case 'gift':
        return 'gift';
      case 'ticket':
        return 'ticket';
      case 'beverage':
        return 'cafe';
      case 'food':
        return 'fast-food';
      default:
        return 'gift';
    }
  };

  const getIconBgColor = (): string => {
    switch (type) {
      case 'coins':
        return colors.secondary[600]; // ReZ Gold
      case 'cashback':
        return colors.primary[400]; // ReZ Green light
      case 'voucher':
        return colors.secondary[700]; // Darker gold
      case 'discount':
        return colors.secondary[500]; // ReZ Gold
      case 'freebie':
        return colors.secondary[600]; // Gold
      default:
        return colors.secondary[500];
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <LinearGradient
        colors={[colors.primary[500], colors.primary[600], colors.primary[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Pressable
          style={styles.content}
         
          onPress={handleClaim}
        >
          {/* Icon */}
          {getIconComponent()}

          {/* Text Content */}
          <View style={styles.textContainer}>
            {/* Title Row with Expiring Badge */}
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
              {isExpiring && (
                <View style={styles.expiringBadge}>
                  <Text style={styles.expiringText}>{expiryText}</Text>
                  <Text style={styles.plusIcon}>+</Text>
                </View>
              )}
              <View style={styles.dotSeparator} />
            </View>

            {/* Description */}
            <Text style={styles.description} numberOfLines={1}>
              {type === 'coins' && amount ? `+${amount} ` : ''}
              {description}
            </Text>
          </View>

          {/* Claim Button */}
          <Pressable
            style={styles.claimButton}
            onPress={handleClaim}
           
          >
            <Text style={styles.claimButtonText}>Claim</Text>
          </Pressable>

          {/* Close Button */}
          <Pressable
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80, // Above bottom navigation
    left: 12,
    right: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary[700],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 9999,
  },
  gradient: {
    borderRadius: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinImage: {
    width: 40,
    height: 40,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
    marginRight: 8,
  },
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  expiringText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.background.primary,
  },
  plusIcon: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background.primary,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 8,
  },
  description: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondary[500], // ReZ Gold color
    letterSpacing: 0.3,
  },
  claimButton: {
    backgroundColor: colors.secondary[500], // ReZ Gold background
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  claimButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary[800], // Dark green text on gold button
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(RewardUnlockedPopup);
