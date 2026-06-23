// Tier Badge Component
// Visual badge to display user's subscription tier (Free/Premium/VIP)

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { TIER_COLORS, TIER_GRADIENTS, TIER_ICONS } from '@/types/subscription.types';
import type { SubscriptionTier } from '@/types/subscription.types';
import { colors } from '@/constants/theme';

interface TierBadgeProps {
  tier: SubscriptionTier;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  showIcon?: boolean;
  showText?: boolean;
}

function TierBadge({
  tier,
  size = 'medium',
  style,
  showIcon = true,
  showText = true,
}: TierBadgeProps) {
  const tierColor = TIER_COLORS[tier];
  const tierGradient = TIER_GRADIENTS[tier];
  const tierIcon = TIER_ICONS[tier];

  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);

  // Size configurations
  const sizeConfig = {
    small: {
      containerHeight: 24,
      paddingHorizontal: 8,
      iconSize: 14,
      fontSize: 11,
    },
    medium: {
      containerHeight: 32,
      paddingHorizontal: 12,
      iconSize: 18,
      fontSize: 13,
    },
    large: {
      containerHeight: 40,
      paddingHorizontal: 16,
      iconSize: 22,
      fontSize: 15,
    },
  };

  const config = sizeConfig[size];

  // If showing both icon and text
  if (showIcon && showText) {
    return (
      <LinearGradient
        colors={tierGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.badge,
          {
            height: config.containerHeight,
            paddingHorizontal: config.paddingHorizontal,
          },
          style,
        ]}
        accessible={true}
        accessibilityLabel={`${tierName} tier badge`}
        accessibilityRole="text"
      >
        <Ionicons name={tierIcon as any} size={config.iconSize} color={colors.background.primary} />
        <ThemedText
          style={[
            styles.badgeText,
            {
              fontSize: config.fontSize,
              marginLeft: 6,
            },
          ]}
        >
          {tierName}
        </ThemedText>
      </LinearGradient>
    );
  }

  // Icon only
  if (showIcon && !showText) {
    return (
      <View
        style={[
          styles.iconOnlyBadge,
          {
            width: config.containerHeight,
            height: config.containerHeight,
            backgroundColor: tierColor,
          },
          style,
        ]}
        accessible={true}
        accessibilityLabel={`${tierName} tier`}
        accessibilityRole="text"
      >
        <Ionicons name={tierIcon as any} size={config.iconSize} color={colors.background.primary} />
      </View>
    );
  }

  // Text only
  if (!showIcon && showText) {
    return (
      <View
        style={[
          styles.textOnlyBadge,
          {
            height: config.containerHeight,
            paddingHorizontal: config.paddingHorizontal,
            backgroundColor: tierColor,
          },
          style,
        ]}
        accessible={true}
        accessibilityLabel={`${tierName} tier badge`}
        accessibilityRole="text"
      >
        <ThemedText style={[styles.badgeText, { fontSize: config.fontSize }]}>
          {tierName}
        </ThemedText>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: colors.background.primary,
    fontWeight: 'bold',
  },
  iconOnlyBadge: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textOnlyBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default React.memo(TierBadge);
