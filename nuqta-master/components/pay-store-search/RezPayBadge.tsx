/**
 * RezPayBadge Component
 *
 * Premium badge showing Rez Pay acceptance with animated gradient.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { RezPayBadgeProps, PAYMENT_SEARCH_COLORS } from '@/types/paymentStoreSearch.types';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const SIZES = {
  small: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 9,
    iconSize: 10,
    borderRadius: 6,
  },
  medium: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 11,
    iconSize: 12,
    borderRadius: 8,
  },
  large: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 13,
    iconSize: 14,
    borderRadius: 10,
  },
};

export const RezPayBadge: React.FC<RezPayBadgeProps> = ({ size = 'medium' }) => {
  const sizeConfig = SIZES[size];
  const shimmerPosition = useSharedValue(0);

  React.useEffect(() => {
    shimmerPosition.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [shimmerPosition]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.85 + shimmerPosition.value * 0.15,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <LinearGradient
        colors={[PAYMENT_SEARCH_COLORS.primary, PAYMENT_SEARCH_COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            paddingVertical: sizeConfig.paddingVertical,
            paddingHorizontal: sizeConfig.paddingHorizontal,
            borderRadius: sizeConfig.borderRadius,
          },
        ]}
      >
        <Ionicons
          name="wallet"
          size={sizeConfig.iconSize}
          color={colors.background.primary}
          style={styles.icon}
        />
        <Text style={[styles.text, { fontSize: sizeConfig.fontSize }]}>{BRAND.PAY_NAME}</Text>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    color: colors.background.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default React.memo(RezPayBadge);
