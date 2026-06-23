/**
 * CoinLoader — Branded spinning coin loading indicator
 * Drop-in replacement for ActivityIndicator with brand identity.
 */
import React, { useEffect} from 'react';
import { View, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface CoinLoaderProps {
  size?: number;
  message?: string;
}

function CoinLoader({ size = 48, message }: CoinLoaderProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      -1
    );
  }, [rotation]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={rotateStyle}>
        <CachedImage
          source={BRAND.COIN_IMAGE}
          style={[styles.localAssetContainer, { width: size, height: size }]}
          contentFit="contain"
        />
      </Animated.View>
      {message ? (
        <Animated.Text style={styles.message}>{message}</Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12 },
  localAssetContainer: {
    backgroundColor: 'transparent' },
  message: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
    textAlign: 'center' } });

export default React.memo(CoinLoader);
