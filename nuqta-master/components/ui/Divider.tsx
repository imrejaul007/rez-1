import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 };

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: keyof typeof SPACING;
  color?: string;
  thickness?: number;
  style?: ViewStyle;
}

function Divider({
  orientation = 'horizontal',
  spacing = 'md',
  color,
  thickness = 1,
  style,
}: DividerProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.border.light;
  const marginValue = SPACING[spacing];

  return (
    <View
      style={[
        styles.base,
        orientation === 'horizontal'
          ? {
              height: thickness,
              width: '100%',
              marginVertical: marginValue,
            }
          : {
              width: thickness,
              height: '100%',
              marginHorizontal: marginValue,
            },
        { backgroundColor: resolvedColor },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {},
});

export default React.memo(Divider);
