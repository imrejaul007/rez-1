import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeMode } from '@/hooks/useTheme';
import { spacing, borderRadius } from '@/constants/theme';
import Text from './Text';

const OPTIONS: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { mode: 'light', icon: 'sunny', label: 'Light' },
  { mode: 'system', icon: 'phone-portrait-outline', label: 'System' },
  { mode: 'dark', icon: 'moon', label: 'Dark' },
];

function ThemeToggle() {
  const { themeMode, setThemeMode, colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="label" style={{ color: colors.text.primary, marginBottom: spacing.sm }}>
        Appearance
      </Text>
      <View style={[styles.row, { backgroundColor: colors.background.secondary }]}>
        {OPTIONS.map(({ mode, icon, label }) => {
          const isActive = themeMode === mode;
          return (
            <Pressable
              key={mode}
              style={[
                styles.option,
                {
                  backgroundColor: isActive ? colors.primary[500] : 'transparent',
                  borderColor: isActive ? colors.primary[500] : 'transparent',
                },
              ]}
              onPress={() => setThemeMode(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${label} theme`}
            >
              <Ionicons
                name={icon}
                size={18}
                color={isActive ? colors.text.inverse : colors.text.secondary}
              />
              <Text
                variant="bodySmall"
                style={{
                  color: isActive ? colors.text.inverse : colors.text.secondary,
                  fontWeight: isActive ? '600' : '400',
                  marginLeft: 6,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
});

export default React.memo(ThemeToggle);
