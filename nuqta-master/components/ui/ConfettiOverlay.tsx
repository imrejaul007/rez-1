/**
 * ConfettiOverlay - Lightweight confetti celebration effect
 * Uses react-native-reanimated for performant animations.
 *
 * Renders ~20 falling colored shapes that auto-dismiss after 3 seconds.
 */
import React, { useEffect, useMemo } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

const CONFETTI_COLORS = [colors.brand.purple, colors.warningScale[400], colors.successScale[400], colors.brand.pink, colors.infoScale[400], colors.error];
const PIECE_COUNT = 20;
const DURATION = 3000;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  x: number;
  width: number;
  height: number;
  color: string;
  delay: number;
  wobbleAmplitude: number;
  rotation: number;
}

interface ConfettiOverlayProps {
  visible: boolean;
  onComplete?: () => void;
}

// Individual confetti piece component with its own shared values
const ConfettiPieceView = React.memo(({ piece, visible }: { piece: ConfettiPiece; visible: boolean }) => {
  const fall = useSharedValue(0);
  const wobble = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      fall.value = 0;
      wobble.value = 0;
      return;
    }

    fall.value = withDelay(
      piece.delay,
      withTiming(1, { duration: DURATION - piece.delay, easing: Easing.linear })
    );

    wobble.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 300 + Math.random() * 200 }),
        withTiming(-1, { duration: 300 + Math.random() * 200 }),
      ),
      -1,
    );
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -20 + fall.value * (SCREEN_HEIGHT + 40) },
      { translateX: wobble.value * piece.wobbleAmplitude },
      { rotate: `${piece.rotation + fall.value * 360}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: piece.x,
          width: piece.width,
          height: piece.height,
          backgroundColor: piece.color,
          borderRadius: piece.width < 9 ? 2 : 3,
        },
        animStyle,
      ]}
    />
  );
});

function ConfettiOverlay({ visible, onComplete }: ConfettiOverlayProps) {
  const opacityAnim = useSharedValue(0);

  const pieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: PIECE_COUNT }, () => ({
      x: Math.random() * SCREEN_WIDTH,
      width: 6 + Math.random() * 6,
      height: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 400,
      wobbleAmplitude: 20 + Math.random() * 40,
      rotation: Math.random() * 360,
    }));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    opacityAnim.value = 1;

    // Fade out at the end
    opacityAnim.value = withDelay(
      DURATION - 500,
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)();
        }
      })
    );
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, overlayStyle]}
    >
      {pieces.map((piece, i) => (
        <ConfettiPieceView key={i} piece={piece} visible={visible} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  piece: {
    position: 'absolute',
    top: 0,
  },
});

export default React.memo(ConfettiOverlay);
