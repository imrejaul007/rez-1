/**
 * Coin Balance Component
 * Displays user's coin/points balance with animated updates
 */

import React, { useEffect, useState } from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { useGamification } from '@/contexts/GamificationContext';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

interface CoinBalanceProps {
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  showIcon?: boolean;
  showLabel?: boolean;
  color?: string;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  animateChanges?: boolean;
}

function CoinBalance({
  size = 'medium',
  onPress,
  showIcon = true,
  showLabel = false,
  color = colors.warningScale[400],
  containerStyle,
  textStyle,
  animateChanges = true,
}: CoinBalanceProps) {
  const router = useRouter();
  const { state } = useGamification();
  const [previousBalance, setPreviousBalance] = useState(state.coinBalance.total);
  const scaleAnim = useSharedValue(1);
  const bounceAnim = useSharedValue(0);

  // Animate balance changes
  useEffect(() => {
    if (animateChanges && state.coinBalance.total !== previousBalance) {
      // Bounce animation
      scaleAnim.value = withSequence(
        withSpring(1.2, { damping: 3 }),
        withSpring(1, { damping: 3 })
      );
      bounceAnim.value = withSequence(
        withTiming(-10, { duration: 150 }),
        withTiming(0, { duration: 150 })
      );

      setPreviousBalance(state.coinBalance.total);

      // cleanup handled by reanimated
    }
  }, [state.coinBalance.total, previousBalance, animateChanges]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/coins');
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.containerSmall,
          icon: 16,
          text: styles.textSmall,
        };
      case 'large':
        return {
          container: styles.containerLarge,
          icon: 28,
          text: styles.textLarge,
        };
      default:
        return {
          container: styles.containerMedium,
          icon: 20,
          text: styles.textMedium,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const formattedBalance = state.coinBalance.total.toLocaleString();

  return (
    <Pressable
      style={[styles.container, sizeStyles.container, containerStyle]}
      onPress={handlePress}
     
    >
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ scale: scaleAnim }, { translateY: bounceAnim }],
          },
        ]}
      >
        {showIcon && (
          <CachedImage
            source={BRAND.COIN_IMAGE}
            style={{ width: sizeStyles.icon + 8, height: sizeStyles.icon + 8 }}
            contentFit="contain"
          />
        )}
        <View style={styles.textContainer}>
          {showLabel && <Text style={styles.label}>Coins</Text>}
          <Text style={[sizeStyles.text, textStyle, { color }]}>{formattedBalance}</Text>
        </View>
        {state.coinBalance.pending > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>+{state.coinBalance.pending}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
);
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  containerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  containerMedium: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  containerLarge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    borderRadius: 20,
    padding: 6,
    marginRight: 8,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 10,
    color: colors.neutral[500],
    fontWeight: '500',
    marginBottom: 2,
  },
  textSmall: {
    fontSize: 14,
    fontWeight: '700',
  },
  textMedium: {
    fontSize: 16,
    fontWeight: '700',
  },
  textLarge: {
    fontSize: 20,
    fontWeight: '800',
  },
  pendingBadge: {
    backgroundColor: colors.lightMustard,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  pendingText: {
    fontSize: 10,
    color: colors.background.primary,
    fontWeight: '700',
  },
});

export default React.memo(CoinBalance);
