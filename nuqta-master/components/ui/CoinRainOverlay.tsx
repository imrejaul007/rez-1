/**
 * CoinRainOverlay — Falling coin celebration effect
 * Based on ConfettiOverlay pattern but renders branded coin images.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { Dimensions, StyleSheet, Animated } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { BRAND } from '@/constants/brand';

const COIN_COUNT = 15;
const DURATION = 3000;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CoinRainOverlayProps {
  visible: boolean;
  onComplete?: () => void;
}

function CoinRainOverlay({ visible, onComplete }: CoinRainOverlayProps) {
  const fallAnims = useRef(Array.from({ length: COIN_COUNT }, () => new Animated.Value(0))).current;
  const wobbleAnims = useRef(Array.from({ length: COIN_COUNT }, () => new Animated.Value(0))).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const coins = useMemo(() => {
    return Array.from({ length: COIN_COUNT }, () => ({
      x: Math.random() * (SCREEN_WIDTH - 24),
      size: 18 + Math.random() * 14, // 18-32
      delay: Math.random() * 500,
      wobbleAmplitude: 15 + Math.random() * 30,
      spinStart: Math.random() * 360,
    }));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    opacityAnim.setValue(1);
    fallAnims.forEach(a => a.setValue(0));
    wobbleAnims.forEach(a => a.setValue(0));

    const pieceAnimations = coins.map((coin, i) => {
      const fall = Animated.timing(fallAnims[i], {
        toValue: 1,
        duration: DURATION - coin.delay,
        delay: coin.delay,
        useNativeDriver: true,
      });

      const wobble = Animated.loop(
        Animated.sequence([
          Animated.timing(wobbleAnims[i], {
            toValue: 1,
            duration: 250 + Math.random() * 200,
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnims[i], {
            toValue: -1,
            duration: 250 + Math.random() * 200,
            useNativeDriver: true,
          }),
        ])
      );

      return Animated.parallel([fall, wobble]);
    });

    const fadeOut = Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 500,
      delay: DURATION - 500,
      useNativeDriver: true,
    });

    const masterAnim = Animated.parallel([...pieceAnimations, fadeOut]);
    masterAnim.start(() => { onComplete?.(); });

    return () => { masterAnim.stop(); };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { opacity: opacityAnim }]}>
      {coins.map((coin, i) => {
        const translateY = fallAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-30, SCREEN_HEIGHT + 30],
        });
        const translateX = wobbleAnims[i].interpolate({
          inputRange: [-1, 1],
          outputRange: [-coin.wobbleAmplitude, coin.wobbleAmplitude],
        });
        const rotate = fallAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [`${coin.spinStart}deg`, `${coin.spinStart + 360}deg`],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.coinWrapper,
              {
                left: coin.x,
                transform: [{ translateY }, { translateX }, { rotate }],
              },
            ]}
          >
            <CachedImage
              source={BRAND.COIN_IMAGE}
              style={[styles.localAssetContainer, { width: coin.size, height: coin.size }]}
              contentFit="contain"
            />
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  coinWrapper: {
    position: 'absolute',
    top: 0,
  },
  localAssetContainer: {
    backgroundColor: 'transparent',
  },
});

export default React.memo(CoinRainOverlay);
