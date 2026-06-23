/**
 * CrossPlatformBlurView — drop-in BlurView replacement that works on web.
 *
 * On native (iOS/Android): renders expo-blur BlurView.
 * On web: renders a semi-transparent View with backdrop-filter (graceful fallback).
 *
 * Usage: Replace `import { BlurView } from 'expo-blur'` with
 *        `import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView'`
 */

import React from 'react';
import { Platform, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView as ExpoBlurView } from 'expo-blur';

interface CrossPlatformBlurViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function CrossPlatformBlurView({
  intensity = 80,
  tint = 'light',
  style,
  children,
}: CrossPlatformBlurViewProps) {
  if (Platform.OS === 'web') {
    const bgColor = tint === 'dark'
      ? `rgba(0,0,0,${Math.min(intensity / 100 * 0.85, 0.85)})`
      : tint === 'light'
        ? `rgba(255,255,255,${Math.min(intensity / 100 * 0.92, 0.92)})`
        : `rgba(255,255,255,${Math.min(intensity / 100 * 0.8, 0.8)})`;

    return (
      <View
        style={[
          style,
          {
            backgroundColor: bgColor,
            // @ts-ignore — web-only CSS property
            backdropFilter: `blur(${Math.round(intensity * 0.2)}px)`,
            WebkitBackdropFilter: `blur(${Math.round(intensity * 0.2)}px)`,
          } as any,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <ExpoBlurView intensity={intensity} tint={tint} style={style}>
      {children}
    </ExpoBlurView>
  );
}

export default CrossPlatformBlurView;
