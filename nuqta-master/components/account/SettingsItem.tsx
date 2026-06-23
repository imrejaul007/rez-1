// SettingsItem - Premium settings list item
// Rounded-square icon container, scale micro-interaction, themed chips, insight text

import React, { useCallback} from 'react';
import {
  View,
  Pressable,
  StyleSheet} from 'react-native';
import Animated, { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { SettingsItemProps } from '@/types/account.types';
import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

// Semantic chip color map
const CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  PREMIUM: { bg: Colors.secondary[600], text: colors.background.primary },
  ONLINE: { bg: '#E8F8EF', text: '#1B9E5A' },
  NEW: { bg: '#FFF3E0', text: '#E67E22' },
};

function getChipStyle(badge: string | number) {
  if (typeof badge === 'number' || !isNaN(Number(badge))) {
    return { bg: `${Colors.primary[500]}20`, text: Colors.secondary[600] };
  }
  const key = String(badge).toUpperCase();
  return CHIP_COLORS[key] || { bg: Colors.secondary[600], text: colors.background.primary };
}

function SettingsItem({ category, onPress, style, isLast }: SettingsItemProps & { isLast?: boolean }) {
  const scaleAnim = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scaleAnim.value = withTiming(0.97, { duration: 80 });
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    scaleAnim.value = withSpring(1, { damping: 15, stiffness: 200 });
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    if (category.isEnabled) {
      onPress(category);
    }
  }, [category, onPress]);

  const renderChip = () => {
    if (!category.badge) return null;
    const chipStyle = getChipStyle(category.badge);
    const isNumeric =
      typeof category.badge === 'number' || !isNaN(Number(category.badge));

    return (
      <View style={[styles.chip, { backgroundColor: chipStyle.bg }]}>
        <ThemedText
          style={[
            styles.chipText,
            { color: chipStyle.text },
            !isNumeric && styles.chipTextUppercase,
          ]}
        >
          {category.badge}
        </ThemedText>
      </View>
    );
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[
          styles.container,
          !isLast && styles.containerBorder,
          !category.isEnabled && styles.disabledContainer,
          style,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!category.isEnabled}
       
        accessibilityLabel={
          category.badge
            ? `${category.title}, ${category.badge} available`
            : category.title
        }
        accessibilityRole="button"
        accessibilityHint={
          category.description || `Double tap to open ${category.title}`
        }
        accessibilityState={{ disabled: !category.isEnabled }}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            !category.isEnabled && styles.disabledIcon,
          ]}
        >
          <Ionicons
            name={category.icon as any}
            size={20}
            color={
              category.isEnabled
                ? Colors.secondary[600]
                : Colors.gray[400]
            }
          />
        </View>

        {/* Text content */}
        <View style={styles.textContainer}>
          <ThemedText
            style={[styles.title, !category.isEnabled && styles.disabledText]}
            numberOfLines={1}
          >
            {category.title}
          </ThemedText>
          {category.description && (
            <ThemedText
              style={[
                styles.description,
                !category.isEnabled && styles.disabledText,
              ]}
              numberOfLines={1}
            >
              {category.description}
            </ThemedText>
          )}
          {category.insight && (
            <ThemedText style={styles.insight} numberOfLines={1}>
              {category.insight}
            </ThemedText>
          )}
        </View>

        {/* Right side: chip + chevron */}
        <View style={styles.rightContent}>
          {renderChip()}
          {category.showArrow && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.gray[400]}
              style={styles.chevron}
            />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
    backgroundColor: colors.background.primary,
  },
  containerBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  disabledContainer: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F4F1EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  disabledIcon: {
    backgroundColor: Colors.gray[50],
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    letterSpacing: -0.1,
  },
  description: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.gray[600],
    marginTop: 2,
    lineHeight: 16,
  },
  insight: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary[700],
    marginTop: 3,
  },
  disabledText: {
    color: Colors.gray[400],
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chipTextUppercase: {
    textTransform: 'uppercase',
    fontSize: 10,
  },
  chevron: {
    marginLeft: 2,
  },
});

export default React.memo(SettingsItem, (prev, next) =>
  prev.category.id === next.category.id &&
  prev.category.badge === next.category.badge &&
  prev.category.insight === next.category.insight &&
  prev.isLast === next.isLast
);
