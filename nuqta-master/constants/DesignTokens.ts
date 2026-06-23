/**
 * Design System Tokens - LEGACY SHIM
 *
 * Re-exports from theme.ts for backward compatibility.
 * New code should import from '@/constants/theme' directly.
 */

import {
  colors,
  shadows,
  layout as LAYOUT,
  zIndex as Z_INDEX,
  timing,
  iconSize as ICON_SIZES,
  spacing as themeSpacing,
} from './theme';

import type { SpacingKey, TypographyKey, ColorKey, BorderRadiusKey, ShadowKey } from './theme';

// Old DesignTokens had semantic colors as objects with scales: COLORS.error[500]
// theme.ts now has flat strings (colors.error = '#EF4444') and separate scales (colors.errorScale)
// Reconstruct the old shape for backward compat.
export const COLORS = {
  ...colors,
  // Override flat strings with scale objects (old DesignTokens shape)
  error: colors.errorScale,
  warning: colors.warningScale,
  success: colors.successScale,
  info: colors.infoScale,
} as const;

// DesignTokens had different font sizes than DesignSystem typography.
// Preserve original values so 51+ importing files don't get visual regressions.
export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32, letterSpacing: -0.25 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, letterSpacing: 0 },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26, letterSpacing: 0 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, letterSpacing: 0.5 },
  overline: { fontSize: 10, fontWeight: '600' as const, lineHeight: 12, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24, letterSpacing: 0.25 },
  buttonSmall: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0.25 },
  link: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24, letterSpacing: 0 },
} as const;

// DesignTokens had md=16, lg=24, xl=32, xxl=48, xxxl=64
export const SPACING = {
  xs: themeSpacing.xs,      // 4
  sm: themeSpacing.sm,      // 8
  md: themeSpacing.base,    // 16
  lg: themeSpacing.xl,      // 24
  xl: themeSpacing['2xl'],  // 32
  xxl: themeSpacing['4xl'], // 48
  xxxl: themeSpacing['5xl'], // 64
} as const;

// DesignTokens had different borderRadius scale
export const BORDER_RADIUS = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

// DesignTokens used sm/md/lg/xl shadow names
export const SHADOWS = {
  none: shadows.none,
  sm: shadows.sm,
  md: shadows.md,
  lg: shadows.lg,
  xl: shadows.xl,
} as const;

export { LAYOUT, Z_INDEX, ICON_SIZES };

export const ANIMATION = {
  duration: timing.duration,
  easing: timing.easing,
} as const;

// Type re-exports
export type { SpacingKey, TypographyKey, ColorKey, BorderRadiusKey, ShadowKey };
