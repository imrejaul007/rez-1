// @ts-nocheck
// UGC Upload FAB (Floating Action Button)
// Floating action button for triggering UGC content upload

import React, { useEffect} from 'react';
import { catchSilent } from '@/utils/catchAndReport';
import {
  Pressable,
  StyleSheet,
  Platform,
  ViewStyle
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';

interface UGCUploadFABProps {
  onPress: () => void;
  visible?: boolean;
  bottom?: number;
  right?: number;
  style?: ViewStyle;
}

function UGCUploadFAB({
  onPress,
  visible = true,
  bottom = 80,
  right = 20,
  style }: UGCUploadFABProps) {
  const scaleAnim = useSharedValue(0);
  const rotateAnim = useSharedValue(0);

  // Fade in animation on mount
  useEffect(() => {
    if (visible) {
      scaleAnim.value = withSpring(1, { tension: 50, friction: 5 });
      rotateAnim.value = withTiming(1, { duration: 300 });
    } else {
      scaleAnim.value = withTiming(0, { duration: 200 });
      rotateAnim.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const handlePress = () => {
    // Haptic feedback
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); } catch (e) { catchSilent(e, 'UGCUploadFAB/haptics'); }
    }

    // Scale animation on press
    scaleAnim.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { tension: 100, friction: 5 }),
    );

    onPress();
  };

  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: scaleAnim.value,
  }));

  return (
    <Animated.View
      style={[styles.container, { bottom, right }, fabAnimStyle, style]}
    >
      <Pressable
        style={styles.fab}
        onPress={handlePress}
       
        accessibilityLabel="Upload UGC Content"
        accessibilityHint="Opens upload modal to create and share content"
        accessibilityRole="button"
      >
        <Ionicons name="camera" size={28} color={colors.background.primary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 999 },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brand.purple,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8 } });

export default React.memo(UGCUploadFAB);
