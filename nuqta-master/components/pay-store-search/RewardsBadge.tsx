/**
 * RewardsBadge Component
 *
 * Gold badge showing cashback percentage with animated shimmer.
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
import { RewardsBadgeProps, PAYMENT_SEARCH_COLORS, PAYMENT_SEARCH_GRADIENTS } from '@/types/paymentStoreSearch.types';

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

export const RewardsBadge: React.FC<RewardsBadgeProps> = ({
  cashbackPercent,
  size = 'medium'
}) => {
  const sizeConfig = SIZES[size];
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <LinearGradient
        colors={PAYMENT_SEARCH_GRADIENTS.goldBadge}
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
          name="gift"
          size={sizeConfig.iconSize}
          color="#4A3000"
          style={styles.icon}
        />
        <Text style={[styles.text, { fontSize: sizeConfig.fontSize }]}>
          Up to {cashbackPercent}% back
        </Text>
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
    color: '#4A3000',
    fontWeight: '700',
    letterSpacing: 0.25,
  },
});

export default React.memo(RewardsBadge);
