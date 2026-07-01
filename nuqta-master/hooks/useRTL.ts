/**
 * RTL-aware layout utilities for React Native
 * Use these utilities to create layouts that work in both LTR and RTL languages
 */

import { useMemo } from 'react';
import { I18nManager, Platform, Text, View, StyleSheet } from 'react-native';

// ============================================================================
// Constants
// ============================================================================

const RTL_LANGUAGES = ['ar', 'he', 'ur', 'fa', 'ps', 'sd'];

export const RTL_SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

// ============================================================================
// Detection
// ============================================================================

export function isRTL(locale: string): boolean {
  const lang = locale.split('-')[0].toLowerCase();
  return RTL_LANGUAGES.includes(lang);
}

export function isSystemRTL(): boolean {
  return I18nManager.isRTL;
}

// ============================================================================
// Hook
// ============================================================================

export interface RTLConfig {
  isRTL: boolean;
  direction: 'row' | 'row-reverse';
  textAlign: 'left' | 'right' | 'center';
  start: 'left' | 'right';
  end: 'left' | 'right';
  marginStart: 'marginLeft' | 'marginRight';
  marginEnd: 'marginRight' | 'marginLeft';
  paddingStart: 'paddingLeft' | 'paddingRight';
  paddingEnd: 'paddingRight' | 'paddingLeft';
  arrowDirection: string;
  backArrow: string;
}

export function useRTL(): RTLConfig {
  return useMemo(() => {
    const rtl = I18nManager.isRTL;
    return {
      isRTL: rtl,
      direction: rtl ? 'row-reverse' : 'row',
      textAlign: rtl ? 'right' : 'left',
      start: rtl ? 'right' : 'left',
      end: rtl ? 'left' : 'right',
      marginStart: rtl ? 'marginRight' : 'marginLeft',
      marginEnd: rtl ? 'marginLeft' : 'marginRight',
      paddingStart: rtl ? 'paddingRight' : 'paddingLeft',
      paddingEnd: rtl ? 'paddingLeft' : 'paddingRight',
      arrowDirection: rtl ? '←' : '→',
      backArrow: rtl ? '→' : '←',
    };
  }, []);
}

// ============================================================================
// Component Helpers
// ============================================================================

export interface RTLViewProps {
  children: React.ReactNode;
  style?: object;
}

export function RTLView({ children, style }: RTLViewProps) {
  const { direction } = useRTL();
  return <View style={[{ flexDirection: direction }, style]}>{children}</View>;
}

export interface RTLTextProps {
  children: string;
  style?: object;
}

export function RTLText({ children, style }: RTLTextProps) {
  const { textAlign } = useRTL();
  return <Text style={[{ textAlign }, style]}>{children}</Text>;
}

// ============================================================================
// Arrow Component
// ============================================================================

interface RTLArrowProps {
  direction?: 'forward' | 'back' | 'left' | 'right';
  size?: number;
  style?: object;
}

export function RTLArrow({ direction = 'forward', size = 16, style }: RTLArrowProps) {
  const { isRTL } = useRTL();

  const getChar = () => {
    if (direction === 'back' || direction === 'left') {
      return isRTL ? '→' : '←';
    }
    return isRTL ? '←' : '→';
  };

  return <Text style={[{ fontSize: size }, style]}>{getChar()}</Text>;
}
