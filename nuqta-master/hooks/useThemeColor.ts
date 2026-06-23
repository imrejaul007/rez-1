/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { colors, darkColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * Flat color map derived from theme tokens.
 * Keys match the legacy Colors.light / Colors.dark interface
 * so existing callers (ThemedText, ThemedView, etc.) keep working.
 */
const lightFlat = {
  text: colors.text.primary,
  background: colors.background.primary,
  tint: colors.primary[500],
  icon: colors.gray[400],
  tabIconDefault: colors.gray[400],
  tabIconSelected: colors.primary[500],
  surface: colors.background.primary,
  surfaceSecondary: colors.background.secondary,
  border: colors.border.default,
  primary: colors.primary[500],
  secondary: colors.secondary[600],
  accent: colors.nileBlue,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  textSecondary: colors.text.secondary,
  textMuted: colors.text.tertiary,
  gold: colors.gold,
  nileBlue: colors.nileBlue,
  mustard: colors.lightMustard,
  linen: colors.linen,
  peach: colors.lightPeach,
  lavender: colors.lavenderMist,
} as const;

const darkFlat = {
  text: darkColors.text.primary,
  background: darkColors.background.primary,
  tint: darkColors.primary[500],
  icon: darkColors.gray[500],
  tabIconDefault: darkColors.gray[500],
  tabIconSelected: darkColors.primary[500],
  surface: darkColors.background.secondary,
  surfaceSecondary: darkColors.background.tertiary,
  border: darkColors.border.default,
  primary: darkColors.primary[500],
  secondary: darkColors.secondary[600],
  accent: darkColors.nileBlue,
  success: darkColors.success,
  warning: darkColors.warning,
  error: darkColors.error,
  textSecondary: darkColors.text.secondary,
  textMuted: darkColors.text.tertiary,
  gold: darkColors.gold,
  nileBlue: darkColors.nileBlue,
  mustard: darkColors.lightMustard,
  linen: darkColors.linen,
  peach: darkColors.lightPeach,
  lavender: darkColors.lavenderMist,
} as const;

const themeColors = { light: lightFlat, dark: darkFlat } as const;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof lightFlat & keyof typeof darkFlat
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return themeColors[theme][colorName];
  }
}
