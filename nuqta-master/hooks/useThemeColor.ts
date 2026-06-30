/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { colors as lightThemeColors, darkColors as darkThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';

type FlatThemeColors = {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  textSecondary: string;
  textMuted: string;
  gold: string;
  nileBlue: string;
  mustard: string;
  linen: string;
  peach: string;
  lavender: string;
};

/**
 * Lazy-built flat maps — avoids SSR/module-init crashes when theme.ts is still
 * loading (circular import during static route discovery).
 */
let lightFlat: FlatThemeColors | null = null;
let darkFlat: FlatThemeColors | null = null;

function getLightFlat(): FlatThemeColors {
  if (!lightFlat) {
    const c = lightThemeColors;
    lightFlat = {
      text: c.text.primary,
      background: c.background.primary,
      tint: c.primary[500],
      icon: c.gray[400],
      tabIconDefault: c.gray[400],
      tabIconSelected: c.primary[500],
      surface: c.background.primary,
      surfaceSecondary: c.background.secondary,
      border: c.border.default,
      primary: c.primary[500],
      secondary: c.secondary[600],
      accent: c.nileBlue,
      success: c.success,
      warning: c.warning,
      error: c.error,
      textSecondary: c.text.secondary,
      textMuted: c.text.tertiary,
      gold: c.gold,
      nileBlue: c.nileBlue,
      mustard: c.lightMustard,
      linen: c.linen,
      peach: c.lightPeach,
      lavender: c.lavenderMist,
    };
  }
  return lightFlat;
}

function getDarkFlat(): FlatThemeColors {
  if (!darkFlat) {
    const c = darkThemeColors;
    darkFlat = {
      text: c.text.primary,
      background: c.background.primary,
      tint: c.primary[500],
      icon: c.gray[500],
      tabIconDefault: c.gray[500],
      tabIconSelected: c.primary[500],
      surface: c.background.secondary,
      surfaceSecondary: c.background.tertiary,
      border: c.border.default,
      primary: c.primary[500],
      secondary: c.secondary[600],
      accent: c.nileBlue,
      success: c.success,
      warning: c.warning,
      error: c.error,
      textSecondary: c.text.secondary,
      textMuted: c.text.tertiary,
      gold: c.gold,
      nileBlue: c.nileBlue,
      mustard: c.lightMustard,
      linen: c.linen,
      peach: c.lightPeach,
      lavender: c.lavenderMist,
    };
  }
  return darkFlat;
}

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof FlatThemeColors
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }
  return theme === 'dark' ? getDarkFlat()[colorName] : getLightFlat()[colorName];
}
