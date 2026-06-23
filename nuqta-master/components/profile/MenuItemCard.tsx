// MenuItemCard Component
// Individual menu item card for the profile menu modal

import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { MenuItemCardProps } from '@/types/profile.types';
import { PROFILE_COLORS, PROFILE_SPACING, PROFILE_RADIUS } from '@/types/profile.types';

function MenuItemCard({
  item,
  onPress,
  style,
}: MenuItemCardProps) {
  const scaleValue = useSharedValue(1);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handlePressIn = () => {
    scaleValue.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scaleValue.value = withSpring(1);
  };

  const handlePress = () => {
    if (item.isEnabled) {
      onPress(item);
    }
  };

  const renderBadge = () => {
    if (!item.badge) return null;

    const isNumeric = typeof item.badge === 'number' || !isNaN(Number(item.badge));
    const badgeStyle = isNumeric ? styles.numericBadge : styles.textBadge;
    const badgeTextStyle = isNumeric ? styles.numericBadgeText : styles.textBadgeText;

    return (
      <View style={badgeStyle}>
        <ThemedText style={badgeTextStyle}>
          {item.badge}
        </ThemedText>
      </View>
    );
  };

  return (
    <>
      <Animated.View
        style={[
          scaleStyle,
          style,
        ]}
      >
        <Pressable
          style={[
            styles.container,
            !item.isEnabled && styles.disabledContainer,
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
         
          disabled={!item.isEnabled}
          accessibilityLabel={item.title}
          accessibilityRole="menuitem"
          accessibilityHint={item.isEnabled ? `Double tap to open ${item.title}` : `${item.title} is currently unavailable`}
          accessibilityState={{ disabled: !item.isEnabled }}
        >
          <View style={styles.leftContent}>
            <View style={[
              styles.iconContainer,
              !item.isEnabled && styles.disabledIconContainer,
            ]}>
              <Ionicons
                name={item.icon as any}
                size={22}
                color={item.isEnabled ? PROFILE_COLORS.primary : PROFILE_COLORS.textLight}
              />
            </View>

            <View style={styles.textContainer}>
              <ThemedText style={[
                styles.title,
                !item.isEnabled && styles.disabledText,
              ]}>
                {item.title}
              </ThemedText>
            </View>
          </View>

          <View style={styles.rightContent}>
            {renderBadge()}
            
            {item.showArrow && (
              <Ionicons
                name="chevron-forward"
                size={18}
                color={item.isEnabled ? PROFILE_COLORS.textSecondary : PROFILE_COLORS.textLight}
                style={styles.arrowIcon}
              />
            )}
          </View>
        </Pressable>
      </Animated.View>

      {item.dividerAfter && <View style={styles.divider} />}
    </>
    );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: PROFILE_SPACING.md,
    paddingHorizontal: PROFILE_SPACING.sm,
    backgroundColor: PROFILE_COLORS.white,
    borderRadius: PROFILE_RADIUS.medium,
    marginBottom: PROFILE_SPACING.xs,
    // Subtle shadow for depth
    shadowColor: PROFILE_COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  disabledContainer: {
    backgroundColor: PROFILE_COLORS.surface,
    opacity: 0.6,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${PROFILE_COLORS.primary}15`, // 15% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: PROFILE_SPACING.md,
  },
  disabledIconContainer: {
    backgroundColor: PROFILE_COLORS.border,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: PROFILE_COLORS.text,
    letterSpacing: 0.2,
  },
  disabledText: {
    color: PROFILE_COLORS.textLight,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Badge Styles
  numericBadge: {
    backgroundColor: PROFILE_COLORS.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: PROFILE_SPACING.sm,
  },
  textBadge: {
    backgroundColor: PROFILE_COLORS.success,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: PROFILE_SPACING.sm,
  },
  numericBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: PROFILE_COLORS.white,
  },
  textBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: PROFILE_COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Arrow and Divider
  arrowIcon: {
    marginLeft: PROFILE_SPACING.xs,
  },
  divider: {
    height: 1,
    backgroundColor: PROFILE_COLORS.border,
    marginVertical: PROFILE_SPACING.md,
    marginLeft: 56, // Align with text content
  },
});

export default React.memo(MenuItemCard);
