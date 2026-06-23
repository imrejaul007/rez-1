/**
 * ScannerPlaceholder Component
 *
 * A visual QR scanner placeholder card that displays an animated scan frame.
 * When tapped, it opens the full-screen QRScanner modal.
 * This is a simpler approach that reuses the existing QRScanner for actual scanning.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCANNER_SIZE = Math.min(SCREEN_WIDTH - 100, 170);

// ReZ Brand Colors
const COLORS = {
  primary: colors.brand.green,
  primaryGlow: 'rgba(0, 192, 106, 0.3)',
  background: '#18181B',
  surface: '#27272A',
  text: colors.background.primary,
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  border: 'rgba(0, 192, 106, 0.5)',
};

interface ScannerPlaceholderProps {
  onPress: () => void;
  height?: number;
}

function ScannerPlaceholder({
  onPress,
  height = 270
}: ScannerPlaceholderProps) {
  const scanLineAnim = useSharedValue(0);

  useEffect(() => {
    scanLineAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1
    );
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scanLineAnim.value, [0, 1], [0, SCANNER_SIZE - 4]) }],
  }));

  return (
    <Pressable
      style={[styles.container, { minHeight: height }]}
      onPress={onPress}
     
    >
      {/* Header */}
      <Text style={styles.title}>Scan to Pay</Text>
      <Text style={styles.subtitle}>Point camera at store QR code</Text>

      {/* Scanner Frame */}
      <View style={styles.scannerContainer}>
        <View style={styles.scannerFrame}>
          {/* Corner brackets */}
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />

          {/* QR Icon in center */}
          <View style={styles.qrIconContainer}>
            <Ionicons name="qr-code-outline" size={32} color={COLORS.primary} />
          </View>

          {/* Animated scan line */}
          <Animated.View
            style={[
              styles.scanLine,
              scanLineStyle,
            ]}
          />

          {/* Inner frame text */}
          <Text style={styles.frameText}>Position QR code within frame</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  scannerContainer: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: COLORS.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 8,
  },
  qrIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 192, 106, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 1.5,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  frameText: {
    position: 'absolute',
    bottom: 10,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

export default React.memo(ScannerPlaceholder);
