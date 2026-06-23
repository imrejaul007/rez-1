import React from 'react';
import { Text as RNText, TextStyle } from 'react-native';
import { typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type TextVariant = keyof typeof typography;
type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent'
  | 'disabled';

interface TextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  color?: TextColor;
  weight?: '400' | '500' | '600' | '700' | '800';
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  selectable?: boolean;
  style?: TextStyle;
  testID?: string;
}

function getColorMap(themeColors: ReturnType<typeof useTheme>['colors']): Record<TextColor, string> {
  return {
    primary: themeColors.text.primary,
    secondary: themeColors.text.secondary,
    tertiary: themeColors.text.tertiary,
    inverse: themeColors.text.inverse,
    error: themeColors.error,
    success: themeColors.success,
    warning: themeColors.warning,
    info: themeColors.info,
    accent: themeColors.primary[500],
    disabled: themeColors.text.disabled,
  };
}

function Text({
  children,
  variant = 'body',
  color = 'primary',
  weight,
  align = 'left',
  numberOfLines,
  selectable,
  style,
  testID,
}: TextProps) {
  const { colors } = useTheme();
  const colorMap = getColorMap(colors);

  const textStyle: TextStyle[] = [
    typography[variant] as TextStyle,
    { color: colorMap[color] },
    { textAlign: align },
    weight ? { fontWeight: weight } : undefined,
    style,
  ].filter(Boolean) as TextStyle[];

  return (
    <RNText
      style={textStyle}
      numberOfLines={numberOfLines}
      selectable={selectable}
      testID={testID}
    >
      {children}
    </RNText>
  );
}

export default React.memo(Text);
