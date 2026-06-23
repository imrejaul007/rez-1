/**
 * Design System - LEGACY SHIM
 *
 * Re-exports from theme.ts for backward compatibility.
 * New code should import from '@/constants/theme' directly.
 */

import {
  colors as themeColors,
  gradients as Gradients,
  spacing as Spacing,
  borderRadius as BorderRadius,
  shadows as Shadows,
  typography as Typography,
  timing as Timing,
  iconSize as IconSize,
  opacity as Opacity,
  zIndex as ZIndex,
  glass as Glass,
  buttonHeight as ButtonHeight,
  hitSlop as HitSlop,
  getSpacing,
  getDisabledOpacity,
  getShadow,
  getPurpleShadow,
  getTextColor,
  getGradient,
  theme,
} from './theme';

// Old DesignSystem had flat string semantic colors (e.g. Colors.success = '#2ECC71')
// which are used with string concat for alpha: Colors.success + '30' -> '#2ECC7130'
// theme.ts has these as objects with scales. Reconstruct the old shape here.
export const Colors = {
  ...themeColors,
  // Override semantic colors with flat strings (matching old DesignSystem)
  success: '#2ECC71',
  error: '#E74C3C',
  warning: '#FF9F1C',
  info: '#1a3a52',
  gold: '#ffcd57',
} as const;

export {
  Gradients,
  Spacing,
  BorderRadius,
  Shadows,
  Typography,
  Timing,
  IconSize,
  Opacity,
  ZIndex,
  Glass,
  ButtonHeight,
  HitSlop,
  getSpacing,
  getDisabledOpacity,
  getShadow,
  getPurpleShadow,
  getTextColor,
  getGradient,
};

export default theme;
